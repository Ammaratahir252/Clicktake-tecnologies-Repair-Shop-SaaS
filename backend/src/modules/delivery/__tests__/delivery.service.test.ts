// Mock Mongoose models
jest.mock('../model/delivery.model', () => {
  const DeliveryStatus = {
    PENDING: 'pending', ASSIGNED: 'assigned', EN_ROUTE: 'en_route',
    ARRIVED: 'arrived', PICKED_UP: 'picked_up', IN_TRANSIT: 'in_transit',
    DELIVERED: 'delivered', CANCELLED: 'cancelled', FAILED: 'failed',
  };
  return {
    DeliveryJobModel: {
      findOne: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      exists: jest.fn(),
    },
    DeliveryStatus,
    DeliveryJobType: { PICKUP: 'pickup', DROPOFF: 'dropoff' },
    PricingModel: { FLAT_POSTCODE: 'flat_postcode' },
  };
});

jest.mock('../model/serviceZone.model', () => ({
  ServiceZoneModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  },
}));

jest.mock('../utils/postcode.utils', () => ({
  lookupPostcode: jest.fn(),
  extractPostcodeDistrict: jest.fn(),
  haversineKm: jest.fn(),
}));

jest.mock('../utils/pricing.utils', () => ({
  calculateDeliveryFee: jest.fn(),
}));

jest.mock('../../../config/redis', () => ({
  getRedis: jest.fn(),
  gpsKey: (jobId: string) => `gps:job:${jobId}`,
  GPS_TTL_SECONDS: 600,
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

import mongoose from 'mongoose';
import {
  bookDeliveryJob,
  getDeliveryJob,
  listDeliveryJobs,
  assignDriver,
  updateDeliveryStatus,
  recordGpsPing,
  getLiveDriverLocation,
  completeDeliveryJob,
  anonymiseJobForErasure,
  getDriverActiveJobs,
  upsertServiceZone,
  listServiceZones,
  checkPostcodeInZone,
} from '../service/delivery.service';
import { DeliveryJobModel, DeliveryStatus } from '../model/delivery.model';
import { ServiceZoneModel } from '../model/serviceZone.model';
import { lookupPostcode, extractPostcodeDistrict, haversineKm } from '../utils/postcode.utils';
import { calculateDeliveryFee } from '../utils/pricing.utils';
import { getRedis } from '../../../config/redis';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../../errors';
import { UserRole } from '../../../types';

const TENANT  = '507f1f77bcf86cd799439011';
const CUST    = '507f1f77bcf86cd799439012';
const DRIVER  = '507f1f77bcf86cd799439013';
const JOB_ID  = '507f1f77bcf86cd799439014';
const ZONE_ID = '507f1f77bcf86cd799439015';

const mockRedis = { setex: jest.fn(), get: jest.fn(), del: jest.fn() };
(getRedis as jest.Mock).mockReturnValue(mockRedis);

// ─── Chainable mongoose query mock ─────────────────────────────
const chainable = (resolved: unknown) => {
  const obj: any = {
    sort: jest.fn(() => obj),
    skip: jest.fn(() => obj),
    limit: jest.fn(() => obj),
    lean: jest.fn(() => Promise.resolve(resolved)),
    then: (resolve: (v: unknown) => void) => resolve(resolved),
  };
  return obj;
};

afterEach(() => {
  jest.clearAllMocks();
  (getRedis as jest.Mock).mockReturnValue(mockRedis);
});

// ─────────────────────────────────────────────────────────────
// bookDeliveryJob
// ─────────────────────────────────────────────────────────────
describe('bookDeliveryJob', () => {
  const baseInput = {
    tenantId: TENANT,
    customerId: CUST,
    jobType: 'pickup',
    address: { line1: '10 Downing St', city: 'London', postcode: 'SW1A 2AA', country: 'GB' as const },
    preferredDate: '2026-06-20T10:00:00.000Z',
    timeSlot: 'anytime',
    paymentMethod: 'cash',
    gdprConsent: { consentGiven: true as const, consentText: 'I agree' },
    bookedBy: CUST,
    bookedByRole: 'frontdesk',
    ipAddress: '127.0.0.1',
  };

  beforeEach(() => {
    (lookupPostcode as jest.Mock).mockResolvedValue({ postcode: 'SW1A 2AA', latitude: 51.5, longitude: -0.14 });
    (extractPostcodeDistrict as jest.Mock).mockReturnValue('SW1');
    (haversineKm as jest.Mock).mockReturnValue(2);
  });

  it('throws ValidationError when no zone matches the postcode', async () => {
    (ServiceZoneModel.findOne as jest.Mock).mockResolvedValue(null);
    await expect(bookDeliveryJob(baseInput)).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when zone is not operating on that day', async () => {
    const bookingDay = new Date(baseInput.preferredDate).getDay();
    const otherDay = (bookingDay + 1) % 7;
    (ServiceZoneModel.findOne as jest.Mock).mockResolvedValue({
      _id: ZONE_ID, operatingDays: [otherDay], maxDistanceKm: 10, maxConcurrentJobs: 5,
    });
    await expect(bookDeliveryJob(baseInput)).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError when distance exceeds zone max', async () => {
    const bookingDay = new Date(baseInput.preferredDate).getDay();
    (ServiceZoneModel.findOne as jest.Mock).mockResolvedValue({
      _id: ZONE_ID, operatingDays: [0,1,2,3,4,5,6], maxDistanceKm: 1, maxConcurrentJobs: 5,
    });
    (haversineKm as jest.Mock).mockReturnValue(5); // > maxDistanceKm of 1
    await expect(bookDeliveryJob(baseInput)).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ConflictError when zone is fully booked for that date', async () => {
    (ServiceZoneModel.findOne as jest.Mock).mockResolvedValue({
      _id: ZONE_ID, operatingDays: [0,1,2,3,4,5,6], maxDistanceKm: 10, maxConcurrentJobs: 1,
    });
    (DeliveryJobModel.countDocuments as jest.Mock).mockResolvedValue(1); // already at capacity
    await expect(bookDeliveryJob(baseInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('creates a job successfully when all checks pass', async () => {
    (ServiceZoneModel.findOne as jest.Mock).mockResolvedValue({
      _id: ZONE_ID, operatingDays: [0,1,2,3,4,5,6], maxDistanceKm: 10, maxConcurrentJobs: 5,
    });
    (DeliveryJobModel.countDocuments as jest.Mock).mockResolvedValue(0);
    (calculateDeliveryFee as jest.Mock).mockReturnValue({
      deliveryFeeExVat: 5, vatAmount: 1, deliveryFeeIncVat: 6, isFree: false, pricingModel: 'flat_postcode',
    });
    (DeliveryJobModel.create as jest.Mock).mockResolvedValue({ _id: JOB_ID, status: DeliveryStatus.PENDING });

    const result = await bookDeliveryJob(baseInput);
    expect(result._id).toBe(JOB_ID);
    expect(DeliveryJobModel.create).toHaveBeenCalledTimes(1);

    const createArgs = (DeliveryJobModel.create as jest.Mock).mock.calls[0][0];
    expect(createArgs.status).toBe(DeliveryStatus.PENDING);
    expect(createArgs.deliveryFeeIncVat).toBe(6);
  });
});

// ─────────────────────────────────────────────────────────────
// getDeliveryJob
// ─────────────────────────────────────────────────────────────
describe('getDeliveryJob', () => {
  it('throws NotFoundError when job does not exist', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue(null);
    await expect(getDeliveryJob(JOB_ID, TENANT)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ForbiddenError when CUSTOMER requests another customer\'s job', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({ customerId: { toString: () => CUST } });
    await expect(
      getDeliveryJob(JOB_ID, TENANT, { userId: 'someone-else', role: UserRole.CUSTOMER })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('returns the job for its own customer', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({ customerId: { toString: () => CUST }, status: 'pending' });
    const result = await getDeliveryJob(JOB_ID, TENANT, { userId: CUST, role: UserRole.CUSTOMER });
    expect(result.status).toBe('pending');
  });
});

// ─────────────────────────────────────────────────────────────
// listDeliveryJobs / getDriverActiveJobs
// ─────────────────────────────────────────────────────────────
describe('listDeliveryJobs', () => {
  it('returns jobs and total count', async () => {
    (DeliveryJobModel.find as jest.Mock).mockReturnValue(chainable([{ _id: JOB_ID }]));
    (DeliveryJobModel.countDocuments as jest.Mock).mockResolvedValue(1);

    const result = await listDeliveryJobs({ tenantId: TENANT, page: 1, limit: 20 });
    expect(result.jobs).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

describe('getDriverActiveJobs', () => {
  it('returns active jobs for the driver', async () => {
    (DeliveryJobModel.find as jest.Mock).mockReturnValue(chainable([{ _id: JOB_ID, status: 'en_route' }]));
    const result = await getDriverActiveJobs(DRIVER, TENANT);
    expect(result).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// assignDriver
// ─────────────────────────────────────────────────────────────
describe('assignDriver', () => {
  it('throws NotFoundError when job does not exist', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue(null);
    await expect(assignDriver({ jobId: JOB_ID, tenantId: TENANT, driverId: DRIVER, assignedBy: 'mgr1' }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when job is not PENDING', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({ status: DeliveryStatus.ASSIGNED });
    await expect(assignDriver({ jobId: JOB_ID, tenantId: TENANT, driverId: DRIVER, assignedBy: 'mgr1' }))
      .rejects.toBeInstanceOf(ConflictError);
  });

  it('assigns driver to a PENDING job', async () => {
    const job: any = { status: DeliveryStatus.PENDING, statusHistory: [], save: jest.fn().mockResolvedValue(true) };
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue(job);

    const result = await assignDriver({ jobId: JOB_ID, tenantId: TENANT, driverId: DRIVER, assignedBy: 'mgr1' });
    expect(result.status).toBe(DeliveryStatus.ASSIGNED);
    expect(result.statusHistory).toHaveLength(1);
    expect(job.save).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────
// updateDeliveryStatus
// ─────────────────────────────────────────────────────────────
describe('updateDeliveryStatus', () => {
  const baseInput = { jobId: JOB_ID, tenantId: TENANT, changedBy: 'user1' };

  it('throws ConflictError on invalid FSM transition', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({ status: DeliveryStatus.PENDING, statusHistory: [], save: jest.fn() });
    await expect(updateDeliveryStatus({
      ...baseInput, newStatus: DeliveryStatus.DELIVERED, role: UserRole.OWNER,
    })).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ForbiddenError when CUSTOMER cancels a non-cancellable job', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({ status: DeliveryStatus.EN_ROUTE, statusHistory: [], save: jest.fn() });
    await expect(updateDeliveryStatus({
      ...baseInput, newStatus: DeliveryStatus.CANCELLED, role: UserRole.CUSTOMER,
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws ForbiddenError when DRIVER tries to cancel', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({ status: DeliveryStatus.PENDING, statusHistory: [], save: jest.fn() });
    await expect(updateDeliveryStatus({
      ...baseInput, newStatus: DeliveryStatus.CANCELLED, role: UserRole.DRIVER,
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws ForbiddenError when DRIVER updates a job not assigned to them', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({
      status: DeliveryStatus.ASSIGNED, statusHistory: [], save: jest.fn(),
      driverId: { toString: () => 'someone-else' },
    });
    await expect(updateDeliveryStatus({
      ...baseInput, changedBy: DRIVER, newStatus: DeliveryStatus.EN_ROUTE, role: UserRole.DRIVER,
    })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('transitions ASSIGNED → EN_ROUTE and sets departedAt', async () => {
    const job: any = {
      status: DeliveryStatus.ASSIGNED, statusHistory: [], save: jest.fn().mockResolvedValue(true),
      driverId: { toString: () => DRIVER },
    };
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue(job);

    const result = await updateDeliveryStatus({
      ...baseInput, changedBy: DRIVER, newStatus: DeliveryStatus.EN_ROUTE, role: UserRole.DRIVER,
    });
    expect(result.status).toBe(DeliveryStatus.EN_ROUTE);
    expect(result.departedAt).toBeInstanceOf(Date);
    expect(result.statusHistory).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// GPS
// ─────────────────────────────────────────────────────────────
describe('GPS ping / live location', () => {
  it('recordGpsPing stores a point in Redis', async () => {
    const point = await recordGpsPing({ jobId: JOB_ID, driverId: DRIVER, lat: 51.5, lng: -0.1 });
    expect(point.lat).toBe(51.5);
    expect(mockRedis.setex).toHaveBeenCalledWith('gps:job:' + JOB_ID, 600, JSON.stringify(point));
  });

  it('getLiveDriverLocation throws NotFoundError when job does not exist', async () => {
    (DeliveryJobModel.exists as jest.Mock).mockResolvedValue(null);
    await expect(getLiveDriverLocation(JOB_ID, TENANT)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('getLiveDriverLocation returns null when no GPS data stored', async () => {
    (DeliveryJobModel.exists as jest.Mock).mockResolvedValue(true);
    mockRedis.get.mockResolvedValue(null);
    const result = await getLiveDriverLocation(JOB_ID, TENANT);
    expect(result).toBeNull();
  });

  it('getLiveDriverLocation returns parsed GPS point', async () => {
    (DeliveryJobModel.exists as jest.Mock).mockResolvedValue(true);
    const point = { lat: 51.5, lng: -0.1, driverId: DRIVER, recordedAt: new Date().toISOString() };
    mockRedis.get.mockResolvedValue(JSON.stringify(point));
    const result = await getLiveDriverLocation(JOB_ID, TENANT);
    expect(result?.lat).toBe(51.5);
  });
});

// ─────────────────────────────────────────────────────────────
// completeDeliveryJob
// ─────────────────────────────────────────────────────────────
describe('completeDeliveryJob', () => {
  it('throws ForbiddenError when driver does not own the job', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({ driverId: { toString: () => 'other-driver' } });
    await expect(completeDeliveryJob({ jobId: JOB_ID, tenantId: TENANT, driverId: DRIVER }))
      .rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws ConflictError when status not eligible for completion', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({
      driverId: { toString: () => DRIVER }, status: DeliveryStatus.PENDING,
    });
    await expect(completeDeliveryJob({ jobId: JOB_ID, tenantId: TENANT, driverId: DRIVER }))
      .rejects.toBeInstanceOf(ConflictError);
  });

  it('completes the job and flushes GPS trail from Redis', async () => {
    const gpsPoint = { lat: 51.5, lng: -0.1, driverId: DRIVER, recordedAt: new Date().toISOString() };
    mockRedis.get.mockResolvedValue(JSON.stringify(gpsPoint));

    const job: any = {
      driverId: { toString: () => DRIVER },
      status: DeliveryStatus.ARRIVED,
      gpsTrail: [], statusHistory: [],
      save: jest.fn().mockResolvedValue(true),
    };
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue(job);

    const result = await completeDeliveryJob({
      jobId: JOB_ID, tenantId: TENANT, driverId: DRIVER,
      paymentCollected: 50, paymentReference: 'CASH_1',
    });

    expect(result.status).toBe(DeliveryStatus.DELIVERED);
    expect(result.gpsTrail).toHaveLength(1);
    expect(result.isPaid).toBe(true);
    expect(mockRedis.del).toHaveBeenCalledWith('gps:job:' + JOB_ID);
  });
});

// ─────────────────────────────────────────────────────────────
// anonymiseJobForErasure
// ─────────────────────────────────────────────────────────────
describe('anonymiseJobForErasure', () => {
  it('throws NotFoundError when job missing', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue(null);
    await expect(anonymiseJobForErasure(JOB_ID, TENANT, 'mgr1', '127.0.0.1'))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws ConflictError when already anonymised', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({ anonymisedAt: new Date(), status: DeliveryStatus.DELIVERED });
    await expect(anonymiseJobForErasure(JOB_ID, TENANT, 'mgr1', '127.0.0.1'))
      .rejects.toBeInstanceOf(ConflictError);
  });

  it('throws ConflictError when job is still active', async () => {
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue({ anonymisedAt: null, status: DeliveryStatus.EN_ROUTE });
    await expect(anonymiseJobForErasure(JOB_ID, TENANT, 'mgr1', '127.0.0.1'))
      .rejects.toBeInstanceOf(ConflictError);
  });

  it('anonymises a completed job', async () => {
    const job: any = {
      anonymisedAt: null,
      status: DeliveryStatus.DELIVERED,
      gdprConsent: { consentTimestamp: new Date(), ipAddress: '1.2.3.4' },
      internalNotes: '',
      save: jest.fn().mockResolvedValue(true),
    };
    (DeliveryJobModel.findOne as jest.Mock).mockResolvedValue(job);

    await anonymiseJobForErasure(JOB_ID, TENANT, 'mgr1', '127.0.0.1');

    expect(job.address.line1).toBe('[ERASED]');
    expect(job.customerNotes).toBeUndefined();
    expect(job.gpsTrail).toEqual([]);
    expect(job.anonymisedAt).toBeInstanceOf(Date);
    expect(job.save).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────
// SERVICE ZONES
// ─────────────────────────────────────────────────────────────
describe('upsertServiceZone', () => {
  it('throws NotFoundError when updating a non-existent zone', async () => {
    (ServiceZoneModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    await expect(upsertServiceZone({ tenantId: TENANT, createdBy: 'owner1', zoneId: ZONE_ID, zoneData: { name: 'New' } }))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates an existing zone', async () => {
    (ServiceZoneModel.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: ZONE_ID, name: 'Updated' });
    const result = await upsertServiceZone({ tenantId: TENANT, createdBy: 'owner1', zoneId: ZONE_ID, zoneData: { name: 'Updated' } });
    expect(result.name).toBe('Updated');
  });

  it('creates a new zone when zoneId is not provided', async () => {
    (ServiceZoneModel.create as jest.Mock).mockResolvedValue({ _id: ZONE_ID, name: 'Central London' });
    const result = await upsertServiceZone({ tenantId: TENANT, createdBy: 'owner1', zoneData: { name: 'Central London' } });
    expect(result.name).toBe('Central London');
  });
});

describe('listServiceZones', () => {
  it('returns zones for the tenant', async () => {
    (ServiceZoneModel.find as jest.Mock).mockReturnValue(chainable([{ name: 'Zone A' }]));
    const result = await listServiceZones(TENANT);
    expect(result).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────
// checkPostcodeInZone
// ─────────────────────────────────────────────────────────────
describe('checkPostcodeInZone', () => {
  it('returns covered=false when postcode lookup fails', async () => {
    (lookupPostcode as jest.Mock).mockRejectedValue(new Error('bad postcode'));
    const result = await checkPostcodeInZone(TENANT, 'INVALID');
    expect(result.covered).toBe(false);
  });

  it('returns covered=false when no matching zone', async () => {
    (lookupPostcode as jest.Mock).mockResolvedValue({ postcode: 'SW1A 2AA', latitude: 51.5, longitude: -0.14 });
    (extractPostcodeDistrict as jest.Mock).mockReturnValue('SW1');
    (ServiceZoneModel.findOne as jest.Mock).mockResolvedValue(null);

    const result = await checkPostcodeInZone(TENANT, 'SW1A 2AA');
    expect(result.covered).toBe(false);
  });

  it('returns covered=false when distance exceeds zone radius', async () => {
    (lookupPostcode as jest.Mock).mockResolvedValue({ postcode: 'SW1A 2AA', latitude: 51.5, longitude: -0.14 });
    (extractPostcodeDistrict as jest.Mock).mockReturnValue('SW1');
    (ServiceZoneModel.findOne as jest.Mock).mockResolvedValue({ maxDistanceKm: 1, name: 'Zone A', estimatedPickupMinutes: 30 });
    (haversineKm as jest.Mock).mockReturnValue(5);

    const result = await checkPostcodeInZone(TENANT, 'SW1A 2AA');
    expect(result.covered).toBe(false);
    expect(result.distanceKm).toBe(5);
  });

  it('returns covered=true with pricing when in zone', async () => {
    (lookupPostcode as jest.Mock).mockResolvedValue({ postcode: 'SW1A 2AA', latitude: 51.5, longitude: -0.14 });
    (extractPostcodeDistrict as jest.Mock).mockReturnValue('SW1');
    (ServiceZoneModel.findOne as jest.Mock).mockResolvedValue({ maxDistanceKm: 10, name: 'Zone A', estimatedPickupMinutes: 30 });
    (haversineKm as jest.Mock).mockReturnValue(2);
    (calculateDeliveryFee as jest.Mock).mockReturnValue({
      deliveryFeeExVat: 5, vatAmount: 1, deliveryFeeIncVat: 6, isFree: false,
    });

    const result = await checkPostcodeInZone(TENANT, 'SW1A 2AA');
    expect(result.covered).toBe(true);
    expect(result.pricing?.deliveryFeeIncVat).toBe(6);
    expect(result.zone?.name).toBe('Zone A');
  });
});