// ============================================================
// DibnowRepairSaaS — Module 9: Doorstep Delivery Routes (UK)
// ============================================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../../../middleware/authMiddleware';
import { tenantMiddleware } from '../../../middleware/tenantMiddleware';
import { requireRole } from '../../../middleware/roleMiddleware';
import { UserRole } from '../../../types';
import {
  bookDeliveryJobHandler,
  getDeliveryJobHandler,
  listDeliveryJobsHandler,
  assignDriverHandler,
  updateStatusHandler,
  gpsPingHandler,
  getLiveLocationHandler,
  completeJobHandler,
  erasureRequestHandler,
  myActiveJobsHandler,
  checkZoneHandler,
  createZoneHandler,
  updateZoneHandler,
  listZonesHandler,
} from '../controller/delivery.controller';

export const deliveryRoutes = async (app: FastifyInstance): Promise<void> => {

  // ── Public — no auth needed ───────────────────────────────
  // Customer booking form checks their UK postcode before login
  app.get('/check-zone', (req: FastifyRequest, rep: FastifyReply) => checkZoneHandler(req, rep));

  // ── All routes below require auth + tenant ────────────────
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', tenantMiddleware);

  // ─────────────────────────────────────────────────────────
  // DELIVERY JOBS
  // ─────────────────────────────────────────────────────────

  // Book pickup/delivery — staff create on behalf of customer; customer self-books
  app.post('/jobs', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => bookDeliveryJobHandler(req, rep));

  // List all jobs — ops dashboard (staff only)
  app.get('/jobs', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) =>
    listDeliveryJobsHandler(req as FastifyRequest<{ Querystring: Record<string, string> }>, rep)
  );

  // Get single job — staff + customer (service enforces customer own-data check)
  app.get('/jobs/:id', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.DRIVER, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) =>
    getDeliveryJobHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
  );

  // Assign driver — Manager / Owner only
  app.patch('/jobs/:id/assign-driver', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) =>
    assignDriverHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
  );

  // Update status — Driver (en_route→delivered); Manager/Owner/Customer (cancel)
  app.patch('/jobs/:id/status', {
    preHandler: [requireRole([UserRole.DRIVER, UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) =>
    updateStatusHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
  );

  // GPS ping — Driver only, called every 30 seconds
  app.post('/jobs/:id/gps-ping', {
    preHandler: [requireRole([UserRole.DRIVER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) =>
    gpsPingHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
  );

  // Live driver location — customer portal + staff
  app.get('/jobs/:id/live-location', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) =>
    getLiveLocationHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
  );

  // Complete job with proof of delivery — Driver only
  app.post('/jobs/:id/complete', {
    preHandler: [requireRole([UserRole.DRIVER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) =>
    completeJobHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
  );

  // UK GDPR right to erasure — Owner / Manager only (ICO compliance)
  app.post('/jobs/:id/erase', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) =>
    erasureRequestHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
  );

  // ─────────────────────────────────────────────────────────
  // DRIVER — SELF-SERVICE
  // ─────────────────────────────────────────────────────────

  app.get('/my-jobs', {
    preHandler: [requireRole([UserRole.DRIVER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => myActiveJobsHandler(req, rep));

  // ─────────────────────────────────────────────────────────
  // SERVICE ZONES — postcode-based UK coverage areas
  // ─────────────────────────────────────────────────────────

  app.get('/zones', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => listZonesHandler(req, rep));

  app.post('/zones', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => createZoneHandler(req, rep));

  app.patch('/zones/:id', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) =>
    updateZoneHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
  );
};
