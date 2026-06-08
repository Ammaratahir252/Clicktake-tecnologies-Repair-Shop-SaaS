// ============================================================
// DibnowRepairSaaS — Module 9: Doorstep Delivery Service (UK)
//
// All business logic lives here. Controller is a thin pass-through.
//
// Key responsibilities:
//   - bookDeliveryJob       → postcode lookup → zone match → pricing → save
//   - assignDriver          → ownership check → status transition → notify
//   - updateDeliveryStatus  → FSM guard → timestamp milestones → audit trail
//   - recordGpsPing         → Redis TTL store (live) + Mongo snapshot on complete
//   - getLiveDriverLocation → Redis read
//   - completeDeliveryJob   → proof of delivery → GPS trail flush → notify
//   - anonymiseJobForErasure → UK GDPR / ICO right-to-erasure
//   - getDeliveryJob        → customer own-data guard
//   - listDeliveryJobs      → paginated ops dashboard
//   - getDriverActiveJobs   → driver self-service
//   - upsertServiceZone     → create or update zone config
//   - listServiceZones      → all active zones for tenant
//   - checkPostcodeInZone   → public zone-check endpoint (customer booking form)
// ============================================================

import mongoose from 'mongoose';
import { DeliveryJobModel, IDeliveryJob, DeliveryStatus, DeliveryJobType, PricingModel } from '../model/delivery.model';
import { ServiceZoneModel, IServiceZone } from '../model/serviceZone.model';
import {
  lookupPostcode,
  extractPostcodeDistrict,
  haversineKm,
} from '../utils/postcode.utils';
import { calculateDeliveryFee } from '../utils/pricing.utils';
import { getRedis, gpsKey, GPS_TTL_SECONDS } from '../../../config/redis';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../../errors';
import { logger } from '../../../utils/logger';
import { UserRole } from '../../../types';

// ─── Allowed status transitions (Finite State Machine) ────────
const ALLOWED_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  [DeliveryStatus.PENDING]:    [DeliveryStatus.ASSIGNED,   DeliveryStatus.CANCELLED],
  [DeliveryStatus.ASSIGNED]:   [DeliveryStatus.EN_ROUTE,   DeliveryStatus.CANCELLED],
  [DeliveryStatus.EN_ROUTE]:   [DeliveryStatus.ARRIVED,    DeliveryStatus.FAILED,    DeliveryStatus.CANCELLED],
  [DeliveryStatus.ARRIVED]:    [DeliveryStatus.PICKED_UP,  DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
  [DeliveryStatus.PICKED_UP]:  [DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED],
  [DeliveryStatus.IN_TRANSIT]: [DeliveryStatus.DELIVERED,  DeliveryStatus.FAILED],
  [DeliveryStatus.DELIVERED]:  [],
  [DeliveryStatus.CANCELLED]:  [],
  [DeliveryStatus.FAILED]:     [DeliveryStatus.PENDING],   // Allow re-booking after failure
};

// ─── Statuses that a CUSTOMER can trigger ─────────────────────
const CUSTOMER_CANCELLABLE: DeliveryStatus[] = [
  DeliveryStatus.PENDING,
  DeliveryStatus.ASSIGNED,
];

// ─── ICO default data retention (days) ────────────────────────
const ICO_RETENTION_DAYS = 365;

// ─── Helper: resolve shop GPS coords for distance calc ────────
// In production: tenant record stores shopPostcode — resolve once and cache.
// Here we use a configurable env default (London postcode as fallback).
const getShopCoords = async (tenantId: string): Promise<{ lat: number; lng: number }> => {
  const shopPostcode = process.env.SHOP_POSTCODE || 'SW1A 2AA';
  try {
    const info = await lookupPostcode(shopPostcode);
    return { lat: info.latitude, lng: info.longitude };
  } catch {
    logger.warn('Could not resolve shop postcode, using fallback coords', { tenantId });
    return { lat: 51.5014, lng: -0.1419 }; // Westminster fallback
  }
};

// ============================================================
// BOOKING
// ============================================================

export interface BookDeliveryJobInput {
  tenantId:        string;
  customerId:      string;
  ticketId?:       string;
  jobType:         string;
  address: {
    line1: string; line2?: string; city: string;
    county?: string; postcode: string; country: 'GB';
  };
  preferredDate:   string;
  timeSlot:        string;
  paymentMethod:   string;
  invoiceValueGbp?: number;
  gdprConsent: { consentGiven: true; consentText: string };
  customerNotes?:  string;
  bookedBy:        string;
  bookedByRole:    string;
  ipAddress:       string;
}

export const bookDeliveryJob = async (input: BookDeliveryJobInput): Promise<IDeliveryJob> => {
  const {
    tenantId, customerId, ticketId, jobType, address, preferredDate,
    timeSlot, paymentMethod, invoiceValueGbp, gdprConsent,
    customerNotes, bookedBy, bookedByRole, ipAddress,
  } = input;

  // 1. Resolve GPS from postcode (postcodes.io — no API key needed)
  const postcodeInfo = await lookupPostcode(address.postcode);

  // 2. Find matching active service zone by postcode district
  const district = extractPostcodeDistrict(address.postcode);
  const zone = await ServiceZoneModel.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    isActive: true,
    postcodeDistricts: district,
  });

  if (!zone) {
    throw new ValidationError(
      `Sorry, we don't currently offer doorstep collection at postcode ${address.postcode}. ` +
      `Please contact us to check if your area is covered.`
    );
  }

  // 3. Check zone operating hours
  const bookingDate = new Date(preferredDate);
  const dayOfWeek   = bookingDate.getDay();
  if (!zone.operatingDays.includes(dayOfWeek)) {
    throw new ValidationError(
      `Delivery is not available on this day. We operate on: ` +
      zone.operatingDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')
    );
  }

  // 4. Distance from shop → customer
  const shopCoords = await getShopCoords(tenantId);
  const distanceKm = haversineKm(
    shopCoords.lat, shopCoords.lng,
    postcodeInfo.latitude, postcodeInfo.longitude
  );

  if (distanceKm > zone.maxDistanceKm) {
    throw new ValidationError(
      `Your location is ${distanceKm.toFixed(1)} km from our shop, which exceeds our ` +
      `maximum delivery radius of ${zone.maxDistanceKm} km for your area.`
    );
  }

  // 5. Check concurrent job capacity for this date/zone
  const existingCount = await DeliveryJobModel.countDocuments({
    tenantId:      new mongoose.Types.ObjectId(tenantId),
    serviceZoneId: zone._id.toString(),
    preferredDate: {
      $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
      $lt:  new Date(bookingDate.setHours(23, 59, 59, 999)),
    },
    status: { $nin: [DeliveryStatus.CANCELLED, DeliveryStatus.FAILED] },
  });

  if (existingCount >= zone.maxConcurrentJobs) {
    throw new ConflictError(
      `We're fully booked for that date in your area. Please choose a different date.`
    );
  }

  // 6. Calculate delivery fee (UK VAT 20% applied)
  const pricing = calculateDeliveryFee({
    zone,
    distanceKm,
    invoiceValueGbp,
    preferredDate: new Date(preferredDate),
  });

  // 7. Build and persist the job
  const retainUntil = new Date();
  retainUntil.setDate(retainUntil.getDate() + ICO_RETENTION_DAYS);

  const job = await DeliveryJobModel.create({
    tenantId:   new mongoose.Types.ObjectId(tenantId),
    customerId: new mongoose.Types.ObjectId(customerId),
    ticketId:   ticketId ? new mongoose.Types.ObjectId(ticketId) : undefined,

    jobType,
    status: DeliveryStatus.PENDING,

    address: {
      ...address,
      postcode: postcodeInfo.postcode,  // Royal Mail formatted
      gpsLat:   postcodeInfo.latitude,
      gpsLng:   postcodeInfo.longitude,
    },

    preferredDate: new Date(preferredDate),
    timeSlot,
    bookedAt:     new Date(),
    bookedBy,
    bookedByRole,

    deliveryFeeExVat:  pricing.deliveryFeeExVat,
    vatAmount:         pricing.vatAmount,
    deliveryFeeIncVat: pricing.deliveryFeeIncVat,
    currency:          'GBP',
    pricingModel:      pricing.pricingModel,
    vatRate:           0.20,

    paymentMethod,
    isPaid: paymentMethod === 'online', // Pre-paid portal payments marked as paid

    serviceZoneId: zone._id.toString(),
    distanceKm:    Math.round(distanceKm * 10) / 10,

    gdprConsent: {
      consentGiven:      gdprConsent.consentGiven,
      consentText:       gdprConsent.consentText,
      consentTimestamp:  new Date(),
      ipAddress,
      dataRetentionDays: ICO_RETENTION_DAYS,
    },

    retainUntil,
    customerNotes,

    statusHistory: [{
      status:    DeliveryStatus.PENDING,
      changedBy: bookedBy,
      changedAt: new Date(),
      note:      `Job booked (${bookedByRole})`,
    }],
  });

  logger.info('Delivery job booked', { jobId: job._id, tenantId, postcode: address.postcode });
  return job;
};

// ============================================================
// RETRIEVE
// ============================================================

export const getDeliveryJob = async (
  jobId:    string,
  tenantId: string,
  requestingUser?: { userId: string; role: UserRole }
): Promise<IDeliveryJob> => {
  const job = await DeliveryJobModel.findOne({
    _id:      new mongoose.Types.ObjectId(jobId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!job) throw new NotFoundError(`Delivery job not found: ${jobId}`);

  // Customers may only view their own jobs
  if (
    requestingUser?.role === UserRole.CUSTOMER &&
    job.customerId.toString() !== requestingUser.userId
  ) {
    throw new ForbiddenError('You can only view your own delivery jobs.');
  }

  return job;
};

export interface ListDeliveryJobsInput {
  tenantId: string;
  page:     number;
  limit:    number;
  status?:  DeliveryStatus;
  jobType?: DeliveryJobType;
  driverId?: string;
  date?:    string;
  postcode?: string;
}

export const listDeliveryJobs = async (
  input: ListDeliveryJobsInput
): Promise<{ jobs: IDeliveryJob[]; total: number }> => {
  const { tenantId, page, limit, status, jobType, driverId, date, postcode } = input;

  const query: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
  };

  if (status)   query.status  = status;
  if (jobType)  query.jobType = jobType;
  if (driverId) query.driverId = new mongoose.Types.ObjectId(driverId);
  if (postcode) query['address.postcode'] = postcode.trim().toUpperCase();

  if (date) {
    const d = new Date(date);
    query.preferredDate = {
      $gte: new Date(d.setHours(0, 0, 0, 0)),
      $lt:  new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const [jobs, total] = await Promise.all([
    DeliveryJobModel
      .find(query)
      .sort({ preferredDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    DeliveryJobModel.countDocuments(query),
  ]);

  return { jobs: jobs as IDeliveryJob[], total };
};

// ============================================================
// ASSIGN DRIVER
// ============================================================

export interface AssignDriverInput {
  jobId:      string;
  tenantId:   string;
  driverId:   string;
  assignedBy: string;
  note?:      string;
}

export const assignDriver = async (input: AssignDriverInput): Promise<IDeliveryJob> => {
  const { jobId, tenantId, driverId, assignedBy, note } = input;

  const job = await DeliveryJobModel.findOne({
    _id:      new mongoose.Types.ObjectId(jobId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!job) throw new NotFoundError(`Delivery job not found: ${jobId}`);

  if (job.status !== DeliveryStatus.PENDING) {
    throw new ConflictError(
      `Cannot assign a driver to a job with status '${job.status}'. Only PENDING jobs can be assigned.`
    );
  }

  job.driverId   = new mongoose.Types.ObjectId(driverId);
  job.status     = DeliveryStatus.ASSIGNED;
  job.assignedAt = new Date();

  job.statusHistory.push({
    status:    DeliveryStatus.ASSIGNED,
    changedBy: assignedBy,
    changedAt: new Date(),
    note:      note || `Driver ${driverId} assigned`,
  });

  await job.save();

  // TODO: send push notification / SMS to driver here
  logger.info('Driver assigned', { jobId, driverId, assignedBy });
  return job;
};

// ============================================================
// STATUS TRANSITIONS
// ============================================================

export interface UpdateStatusInput {
  jobId:     string;
  tenantId:  string;
  newStatus: DeliveryStatus;
  changedBy: string;
  role:      UserRole;
  gpsLat?:   number;
  gpsLng?:   number;
  note?:     string;
}

export const updateDeliveryStatus = async (input: UpdateStatusInput): Promise<IDeliveryJob> => {
  const { jobId, tenantId, newStatus, changedBy, role, gpsLat, gpsLng, note } = input;

  const job = await DeliveryJobModel.findOne({
    _id:      new mongoose.Types.ObjectId(jobId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!job) throw new NotFoundError(`Delivery job not found: ${jobId}`);

  // ── FSM guard ─────────────────────────────────────────────
  const allowed = ALLOWED_TRANSITIONS[job.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new ConflictError(
      `Cannot transition from '${job.status}' to '${newStatus}'. ` +
      `Allowed next statuses: ${allowed.join(', ') || 'none'}.`
    );
  }

  // ── Role-based cancel guard ────────────────────────────────
  if (newStatus === DeliveryStatus.CANCELLED) {
    if (role === UserRole.CUSTOMER && !CUSTOMER_CANCELLABLE.includes(job.status)) {
      throw new ForbiddenError(
        `You can only cancel a job that is PENDING or ASSIGNED. Current status: ${job.status}`
      );
    }
    if (role === UserRole.DRIVER) {
      throw new ForbiddenError('Drivers cannot cancel jobs. Please contact your manager.');
    }
  }

  // ── Driver guard — can only update jobs assigned to them ───
  if (role === UserRole.DRIVER && job.driverId?.toString() !== changedBy) {
    throw new ForbiddenError('You can only update status on jobs assigned to you.');
  }

  // ── Apply status + milestone timestamps ───────────────────
  job.status = newStatus;

  switch (newStatus) {
    case DeliveryStatus.EN_ROUTE:  job.departedAt = new Date(); break;
    case DeliveryStatus.ARRIVED:   job.arrivedAt  = new Date(); break;
    case DeliveryStatus.DELIVERED: job.completedAt = new Date(); break;
    default: break;
  }

  job.statusHistory.push({
    status:    newStatus,
    changedBy,
    changedAt: new Date(),
    note,
    gpsLat,
    gpsLng,
  });

  await job.save();

  // TODO: send customer notification on key status changes (EN_ROUTE, ARRIVED, DELIVERED)
  logger.info('Job status updated', { jobId, from: job.status, to: newStatus, changedBy });
  return job;
};

// ============================================================
// GPS PINGS (live = Redis; snapshot = Mongo on complete)
// ============================================================

export interface GpsPingInput {
  jobId:    string;
  driverId: string;
  lat:      number;
  lng:      number;
}

export interface GpsPoint {
  lat:        number;
  lng:        number;
  recordedAt: string;
  driverId:   string;
}

export const recordGpsPing = async (input: GpsPingInput): Promise<GpsPoint> => {
  const { jobId, driverId, lat, lng } = input;
  const redis = getRedis();

  const point: GpsPoint = {
    lat, lng, driverId,
    recordedAt: new Date().toISOString(),
  };

  // Store latest ping in Redis with TTL — overwrites previous
  await redis.setex(
    gpsKey(jobId),
    GPS_TTL_SECONDS,
    JSON.stringify(point)
  );

  logger.debug('GPS ping recorded', { jobId, lat, lng });
  return point;
};

export const getLiveDriverLocation = async (
  jobId:    string,
  tenantId: string
): Promise<GpsPoint | null> => {
  // Verify job belongs to tenant first
  const exists = await DeliveryJobModel.exists({
    _id:      new mongoose.Types.ObjectId(jobId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!exists) throw new NotFoundError(`Delivery job not found: ${jobId}`);

  const redis = getRedis();
  const raw   = await redis.get(gpsKey(jobId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GpsPoint;
  } catch {
    return null;
  }
};

// ============================================================
// COMPLETE JOB (proof of delivery)
// ============================================================

export interface CompleteJobInput {
  jobId:                string;
  tenantId:             string;
  driverId:             string;
  proofPhotoUrl?:       string;
  customerSignature?:   string;
  deviceConditionNotes?: string;
  paymentCollected?:    number;
  paymentReference?:    string;
}

export const completeDeliveryJob = async (input: CompleteJobInput): Promise<IDeliveryJob> => {
  const {
    jobId, tenantId, driverId,
    proofPhotoUrl, customerSignature, deviceConditionNotes,
    paymentCollected, paymentReference,
  } = input;

  const job = await DeliveryJobModel.findOne({
    _id:      new mongoose.Types.ObjectId(jobId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!job) throw new NotFoundError(`Delivery job not found: ${jobId}`);

  if (job.driverId?.toString() !== driverId) {
    throw new ForbiddenError('You can only complete jobs assigned to you.');
  }

  if (![DeliveryStatus.ARRIVED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT].includes(job.status)) {
    throw new ConflictError(
      `Job must be in ARRIVED, PICKED_UP, or IN_TRANSIT status to complete. Current: ${job.status}`
    );
  }

  // Flush live GPS trail from Redis → Mongo for permanent record
  const redis = getRedis();
  const rawGps = await redis.get(gpsKey(jobId));
  if (rawGps) {
    try {
      const gpsPoint = JSON.parse(rawGps);
      job.gpsTrail.push({ ...gpsPoint, recordedAt: new Date(gpsPoint.recordedAt) });
    } catch {
      // Silently skip malformed GPS data
    }
    await redis.del(gpsKey(jobId));
  }

  // Apply completion fields
  job.status       = DeliveryStatus.DELIVERED;
  job.completedAt  = new Date();
  job.proofPhotoUrl        = proofPhotoUrl;
  job.customerSignature    = customerSignature;
  job.deviceConditionNotes = deviceConditionNotes;

  if (paymentCollected !== undefined) {
    job.paidAmount        = paymentCollected;
    job.isPaid            = paymentCollected > 0;
    job.paymentReference  = paymentReference;
  }

  job.statusHistory.push({
    status:    DeliveryStatus.DELIVERED,
    changedBy: driverId,
    changedAt: new Date(),
    note:      'Job completed with proof of delivery',
  });

  await job.save();

  // TODO: send completion notification to customer + generate invoice
  logger.info('Job completed', { jobId, driverId });
  return job;
};

// ============================================================
// UK GDPR — RIGHT TO ERASURE (ICO compliance)
// ============================================================

export const anonymiseJobForErasure = async (
  jobId:      string,
  tenantId:   string,
  requestedBy: string,
  ipAddress:  string
): Promise<void> => {
  const job = await DeliveryJobModel.findOne({
    _id:      new mongoose.Types.ObjectId(jobId),
    tenantId: new mongoose.Types.ObjectId(tenantId),
  });

  if (!job) throw new NotFoundError(`Delivery job not found: ${jobId}`);

  if (job.anonymisedAt) {
    throw new ConflictError('This job has already been anonymised.');
  }

  // Active jobs cannot be erased — must be completed/cancelled first
  const activeStatuses: DeliveryStatus[] = [
    DeliveryStatus.PENDING, DeliveryStatus.ASSIGNED,
    DeliveryStatus.EN_ROUTE, DeliveryStatus.ARRIVED,
    DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT,
  ];
  if (activeStatuses.includes(job.status)) {
    throw new ConflictError(
      `Cannot anonymise an active job. Current status: ${job.status}. ` +
      `Please cancel or complete the job first.`
    );
  }

  // Overwrite all PII with anonymised placeholders (ICO best practice)
  // We keep operational/financial data for HMRC records (7-year rule)
  job.address = {
    line1:    '[ERASED]',
    line2:    undefined,
    city:     '[ERASED]',
    county:   undefined,
    postcode: 'XX0 0XX',
    country:  'GB',
    gpsLat:   0,
    gpsLng:   0,
  };

  job.customerNotes    = undefined;
  job.proofPhotoUrl    = undefined;
  job.customerSignature = undefined;
  job.gpsTrail         = [];

  // Anonymise GDPR consent record — keep timestamp + IP (needed for ICO audit)
  // but remove the consent text which may contain PII
  job.gdprConsent = {
    consentGiven:      true,
    consentText:       '[ERASED PER RIGHT TO ERASURE REQUEST]',
    consentTimestamp:  job.gdprConsent.consentTimestamp,
    ipAddress:         job.gdprConsent.ipAddress,
    dataRetentionDays: 0,
  };

  job.anonymisedAt = new Date();

  // Audit trail — keep a record of who requested erasure
  job.internalNotes = (job.internalNotes || '') +
    `\n[ERASURE] Requested by ${requestedBy} from IP ${ipAddress} at ${new Date().toISOString()}`;

  await job.save();

  logger.info('Job anonymised (GDPR erasure)', { jobId, requestedBy, tenantId });
};

// ============================================================
// DRIVER — SELF SERVICE
// ============================================================

export const getDriverActiveJobs = async (
  driverId: string,
  tenantId: string
): Promise<IDeliveryJob[]> => {
  const activeStatuses: DeliveryStatus[] = [
    DeliveryStatus.ASSIGNED, DeliveryStatus.EN_ROUTE,
    DeliveryStatus.ARRIVED, DeliveryStatus.PICKED_UP,
    DeliveryStatus.IN_TRANSIT,
  ];

  return DeliveryJobModel.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    driverId: new mongoose.Types.ObjectId(driverId),
    status:   { $in: activeStatuses },
  }).sort({ preferredDate: 1 });
};

// ============================================================
// SERVICE ZONES
// ============================================================

export interface UpsertServiceZoneInput {
  tenantId:   string;
  createdBy:  string;
  zoneId?:    string;
  zoneData:   Partial<{
    name:               string;
    isActive:           boolean;
    postcodeDistricts:  string[];
    pricingModel:       string;
    baseFeeExVat:       number;
    pricePerKm:         number;
    freeAboveGbp:       number;
    freeAbove?:         number; // alias
    peakPricing?:       object;
    maxDistanceKm:      number;
    estimatedPickupMinutes: number;
    operatingHours:     object;
    operatingDays:      number[];
    maxConcurrentJobs:  number;
    geoJson?:           object;
  }>;
}

export const upsertServiceZone = async (input: UpsertServiceZoneInput): Promise<IServiceZone> => {
  const { tenantId, createdBy, zoneId, zoneData } = input;

  if (zoneId) {
    // Update existing zone
    const zone = await ServiceZoneModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(zoneId), tenantId: new mongoose.Types.ObjectId(tenantId) },
      { $set: zoneData },
      { new: true, runValidators: true }
    );
    if (!zone) throw new NotFoundError(`Service zone not found: ${zoneId}`);
    logger.info('Service zone updated', { zoneId, tenantId });
    return zone;
  }

  // Create new zone
  const zone = await ServiceZoneModel.create({
    tenantId:  new mongoose.Types.ObjectId(tenantId),
    createdBy,
    ...zoneData,
  });

  logger.info('Service zone created', { zoneId: zone._id, tenantId });
  return zone;
};

export const listServiceZones = async (tenantId: string): Promise<IServiceZone[]> => {
  return ServiceZoneModel.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
  }).sort({ isActive: -1, name: 1 });
};

// ============================================================
// ZONE CHECK (public — customer booking form)
// ============================================================

export interface ZoneCheckResult {
  covered:              boolean;
  message:              string;
  zone?:                { name: string; estimatedPickupMinutes: number };
  pricing?:             {
    deliveryFeeExVat: number;
    vatAmount: number;
    deliveryFeeIncVat: number;
    isFree: boolean;
    currency: 'GBP';
  };
  distanceKm?:          number;
}

export const checkPostcodeInZone = async (
  tenantId:        string,
  postcode:        string,
  invoiceValueGbp?: number
): Promise<ZoneCheckResult> => {
  let postcodeInfo;
  try {
    postcodeInfo = await lookupPostcode(postcode);
  } catch {
    return {
      covered: false,
      message: `We couldn't validate postcode ${postcode}. Please check it and try again.`,
    };
  }

  const district = extractPostcodeDistrict(postcode);

  const zone = await ServiceZoneModel.findOne({
    tenantId: tenantId ? new mongoose.Types.ObjectId(tenantId) : undefined,
    isActive: true,
    postcodeDistricts: district,
  });

  if (!zone) {
    return {
      covered: false,
      message: `Sorry, we don't currently cover postcode ${postcodeInfo.postcode}. ` +
               `Contact us to request coverage in your area.`,
    };
  }

  // Calculate distance for display purposes
  const shopCoords = await getShopCoords(tenantId || '');
  const distanceKm = haversineKm(
    shopCoords.lat, shopCoords.lng,
    postcodeInfo.latitude, postcodeInfo.longitude
  );

  if (distanceKm > zone.maxDistanceKm) {
    return {
      covered:     false,
      message:     `Postcode ${postcodeInfo.postcode} is ${distanceKm.toFixed(1)} km from our shop, ` +
                   `which exceeds our ${zone.maxDistanceKm} km radius for this zone.`,
      distanceKm:  Math.round(distanceKm * 10) / 10,
    };
  }

  const pricing = calculateDeliveryFee({ zone, distanceKm, invoiceValueGbp });

  return {
    covered: true,
    message: pricing.isFree
      ? `Great news! Free delivery is available at ${postcodeInfo.postcode}.`
      : `Delivery is available at ${postcodeInfo.postcode} for £${pricing.deliveryFeeIncVat.toFixed(2)} inc. VAT.`,
    zone: {
      name: zone.name,
      estimatedPickupMinutes: zone.estimatedPickupMinutes,
    },
    pricing: {
      deliveryFeeExVat:  pricing.deliveryFeeExVat,
      vatAmount:         pricing.vatAmount,
      deliveryFeeIncVat: pricing.deliveryFeeIncVat,
      isFree:            pricing.isFree,
      currency:          'GBP',
    },
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
};
