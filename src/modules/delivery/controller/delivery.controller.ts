// ============================================================
// DibnowRepairSaaS — Module 9: Doorstep Delivery Controller (UK)
// Thin layer: validate → service → respond
// ============================================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { ValidationError } from '../../../errors';
import {
  bookDeliveryJobSchema,
  assignDriverSchema,
  updateStatusSchema,
  gpsPingSchema,
  completeJobSchema,
  createServiceZoneSchema,
  listJobsQuerySchema,
  checkZoneQuerySchema,
  erasureRequestSchema,
  formatZodErrors,
} from '../validators/delivery.validators';
import {
  bookDeliveryJob,
  assignDriver,
  updateDeliveryStatus,
  recordGpsPing,
  getLiveDriverLocation,
  completeDeliveryJob,
  anonymiseJobForErasure,
  getDeliveryJob,
  listDeliveryJobs,
  getDriverActiveJobs,
  upsertServiceZone,
  listServiceZones,
  checkPostcodeInZone,
} from '../service/delivery.service';
import { DeliveryStatus, DeliveryJobType, UKPaymentMethod, UKTimeSlot } from '../model/delivery.model';
import { UserRole } from '../../../types';

// ─── Book a doorstep pickup or delivery ───────────────────────
export const bookDeliveryJobHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const parsed = bookDeliveryJobSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Validation failed', formatZodErrors(parsed.error));

  const job = await bookDeliveryJob({
    ...parsed.data,
    tenantId:     req.tenantId,
    bookedBy:     req.user.userId,
    bookedByRole: req.user.role,
    ipAddress:    req.ipAddress,
  });

  return rep.status(201).send({
    success: true,
    message: `Booking confirmed! Your ${parsed.data.jobType === 'pickup' ? 'collection' : 'delivery'} is scheduled. We'll send a confirmation shortly.`,
    data: job,
  });
};

// ─── Get single job ───────────────────────────────────────────
export const getDeliveryJobHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  const job = await getDeliveryJob(req.params.id, req.tenantId);
  return rep.send({ success: true, message: 'Success', data: job });
};

// ─── List jobs (ops dashboard) ────────────────────────────────
export const listDeliveryJobsHandler = async (
  req: FastifyRequest<{ Querystring: Record<string, string> }>,
  rep: FastifyReply
) => {
  const parsed = listJobsQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError('Invalid query params', formatZodErrors(parsed.error));

  const { jobs, total } = await listDeliveryJobs({
    tenantId: req.tenantId,
    page:     parsed.data.page,
    limit:    parsed.data.limit,
    status:   parsed.data.status as DeliveryStatus | undefined,
    jobType:  parsed.data.jobType as DeliveryJobType | undefined,
    driverId: parsed.data.driverId,
    date:     parsed.data.date,
    postcode: parsed.data.postcode,
  });

  return rep.send({
    success: true,
    message: 'Delivery jobs retrieved',
    data:    jobs,
    meta: {
      page:       parsed.data.page,
      limit:      parsed.data.limit,
      total,
      totalPages: Math.ceil(total / parsed.data.limit),
    },
  });
};

// ─── Assign driver ────────────────────────────────────────────
export const assignDriverHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  const parsed = assignDriverSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Validation failed', formatZodErrors(parsed.error));

  const job = await assignDriver({
    jobId:      req.params.id,
    tenantId:   req.tenantId,
    driverId:   parsed.data.driverId,
    assignedBy: req.user.userId,
    note:       parsed.data.note,
  });

  return rep.send({ success: true, message: 'Driver assigned. They will be notified now.', data: job });
};

// ─── Update status ────────────────────────────────────────────
export const updateStatusHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Validation failed', formatZodErrors(parsed.error));

  const job = await updateDeliveryStatus({
    jobId:     req.params.id,
    tenantId:  req.tenantId,
    newStatus: parsed.data.status as DeliveryStatus,
    changedBy: req.user.userId,
    role:      req.user.role as UserRole,
    gpsLat:    parsed.data.gpsLat,
    gpsLng:    parsed.data.gpsLng,
    note:      parsed.data.note,
  });

  return rep.send({ success: true, message: `Status updated to '${parsed.data.status}'`, data: job });
};

// ─── GPS ping ─────────────────────────────────────────────────
export const gpsPingHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  const parsed = gpsPingSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Invalid GPS data', formatZodErrors(parsed.error));

  const loc = await recordGpsPing({
    jobId:    req.params.id,
    driverId: req.user.userId,
    lat:      parsed.data.lat,
    lng:      parsed.data.lng,
  });

  return rep.send({ success: true, message: 'Location updated', data: loc });
};

// ─── Get live driver location ─────────────────────────────────
export const getLiveLocationHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  const loc = await getLiveDriverLocation(req.params.id, req.tenantId);
  return rep.send({
    success: true,
    message: loc ? 'Driver location retrieved' : 'Driver location not yet available',
    data:    loc,
  });
};

// ─── Complete job with proof of delivery ─────────────────────
export const completeJobHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  const parsed = completeJobSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Validation failed', formatZodErrors(parsed.error));

  const job = await completeDeliveryJob({
    jobId:                req.params.id,
    tenantId:             req.tenantId,
    driverId:             req.user.userId,
    proofPhotoUrl:        parsed.data.proofPhotoUrl,
    customerSignature:    parsed.data.customerSignature,
    deviceConditionNotes: parsed.data.deviceConditionNotes,
    paymentCollected:     parsed.data.paymentCollected,
    paymentReference:     parsed.data.paymentReference,
  });

  return rep.send({ success: true, message: 'Job completed. Customer has been notified.', data: job });
};

// ─── UK GDPR right to erasure ─────────────────────────────────
export const erasureRequestHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  await anonymiseJobForErasure(
    req.params.id,
    req.tenantId,
    req.user.userId,
    req.ipAddress
  );

  return rep.send({
    success: true,
    message: 'Personal data has been anonymised in accordance with UK GDPR and ICO guidelines.',
    data:    { jobId: req.params.id, anonymisedAt: new Date().toISOString() },
  });
};

// ─── Driver — my active jobs ──────────────────────────────────
export const myActiveJobsHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const jobs = await getDriverActiveJobs(req.user.userId, req.tenantId);
  return rep.send({ success: true, message: 'Your active jobs', data: jobs });
};

// ─── Zone check (postcode-based) ─────────────────────────────
export const checkZoneHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const parsed = checkZoneQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError('Invalid postcode', formatZodErrors(parsed.error));

  const result = await checkPostcodeInZone(
    req.tenantId,
    parsed.data.postcode,
    parsed.data.invoiceValueGbp
  );

  return rep.send({ success: true, message: result.message, data: result });
};

// ─── Create service zone ──────────────────────────────────────
export const createZoneHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const parsed = createServiceZoneSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Validation failed', formatZodErrors(parsed.error));

  const zone = await upsertServiceZone({
    tenantId:  req.tenantId,
    createdBy: req.user.userId,
    zoneData:  parsed.data,
  });

  return rep.status(201).send({ success: true, message: 'Service zone created', data: zone });
};

// ─── Update service zone ──────────────────────────────────────
export const updateZoneHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  const { z } = await import('zod');
  const partial = z.object({ name: z.string().optional(), isActive: z.boolean().optional(), postcodeDistricts: z.array(z.string()).optional(), baseFeeExVat: z.number().optional(), pricingModel: z.string().optional() });
  const parsed = partial.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Validation failed', formatZodErrors(parsed.error));

  const zone = await upsertServiceZone({
    tenantId:  req.tenantId,
    createdBy: req.user.userId,
    zoneData:  parsed.data,
    zoneId:    req.params.id,
  });

  return rep.send({ success: true, message: 'Service zone updated', data: zone });
};

// ─── List service zones ───────────────────────────────────────
export const listZonesHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const zones = await listServiceZones(req.tenantId);
  return rep.send({ success: true, message: 'Service zones retrieved', data: zones });
};
