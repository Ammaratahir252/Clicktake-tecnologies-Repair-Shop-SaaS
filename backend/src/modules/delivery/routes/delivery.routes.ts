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
  app.get('/check-zone', (req: FastifyRequest, rep: FastifyReply) => checkZoneHandler(req, rep));

  // ── Protected routes — separate encapsulated scope ────────
  app.register(async (protectedApp: FastifyInstance): Promise<void> => {

    protectedApp.addHook('preHandler', authMiddleware);
    protectedApp.addHook('preHandler', tenantMiddleware);

    // DELIVERY JOBS
    protectedApp.post('/jobs', {
      preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) => bookDeliveryJobHandler(req, rep));

    protectedApp.get('/jobs', {
      preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) =>
      listDeliveryJobsHandler(req as FastifyRequest<{ Querystring: Record<string, string> }>, rep)
    );

    protectedApp.get('/jobs/:id', {
      preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.DRIVER, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) =>
      getDeliveryJobHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
    );

    protectedApp.patch('/jobs/:id/assign-driver', {
      preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) =>
      assignDriverHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
    );

    protectedApp.patch('/jobs/:id/status', {
      preHandler: [requireRole([UserRole.DRIVER, UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) =>
      updateStatusHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
    );

    protectedApp.post('/jobs/:id/gps-ping', {
      preHandler: [requireRole([UserRole.DRIVER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) =>
      gpsPingHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
    );

    protectedApp.get('/jobs/:id/live-location', {
      preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) =>
      getLiveLocationHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
    );

    protectedApp.post('/jobs/:id/complete', {
      preHandler: [requireRole([UserRole.DRIVER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) =>
      completeJobHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
    );

    protectedApp.post('/jobs/:id/erase', {
      preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) =>
      erasureRequestHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
    );

    // DRIVER — SELF-SERVICE
    protectedApp.get('/my-jobs', {
      preHandler: [requireRole([UserRole.DRIVER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) => myActiveJobsHandler(req, rep));

    // SERVICE ZONES
    protectedApp.get('/zones', {
      preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.FRONTDESK, UserRole.CUSTOMER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) => listZonesHandler(req, rep));

    protectedApp.post('/zones', {
      preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) => createZoneHandler(req, rep));

    protectedApp.patch('/zones/:id', {
      preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
    }, (req: FastifyRequest, rep: FastifyReply) =>
      updateZoneHandler(req as FastifyRequest<{ Params: { id: string } }>, rep)
    );
  });
};