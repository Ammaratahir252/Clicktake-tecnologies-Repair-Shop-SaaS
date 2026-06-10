import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../../../middleware/authMiddleware';
import { tenantMiddleware } from '../../../middleware/tenantMiddleware';
import { requireRole } from '../../../middleware/roleMiddleware';
import { UserRole } from '../../../types';
import {
  getInboxHandler,
  markReadHandler,
  markAllReadHandler,
  getPreferencesHandler,
  updatePreferencesHandler,
  unsubscribeHandler,
  getTenantConfigHandler,
  updateTenantConfigHandler,
  listTemplatesHandler,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from '../controller/notification.controller';

type ReqWithId = FastifyRequest<{ Params: { id: string } }>;
type ReqWithToken = FastifyRequest<{ Params: { token: string } }>;

const allRoles = [
  UserRole.OWNER, UserRole.MANAGER, UserRole.TECHNICIAN,
  UserRole.FRONTDESK, UserRole.CUSTOMER, UserRole.DRIVER, UserRole.SUPER_ADMIN,
] as UserRole[];

export const notificationRoutes = async (app: FastifyInstance): Promise<void> => {

  // ── Public — one-click unsubscribe (token-scoped, no auth) ────────────────
  app.get('/unsubscribe/:token',
    (req: FastifyRequest, rep: FastifyReply) => unsubscribeHandler(req as ReqWithToken, rep)
  );

  // ── All routes below require auth + tenant context ────────────────────────
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', tenantMiddleware);

  // ── In-app inbox ──────────────────────────────────────────────────────────
  app.get('/notifications', {
    preHandler: [requireRole(allRoles)],
  }, (req: FastifyRequest, rep: FastifyReply) => getInboxHandler(req, rep));

  app.patch('/notifications/read-all', {
    preHandler: [requireRole(allRoles)],
  }, (req: FastifyRequest, rep: FastifyReply) => markAllReadHandler(req, rep));

  app.patch('/notifications/:id/read', {
    preHandler: [requireRole(allRoles)],
  }, (req: FastifyRequest, rep: FastifyReply) => markReadHandler(req as ReqWithId, rep));

  // ── Preferences (per-user) ────────────────────────────────────────────────
  app.get('/notifications/preferences', {
    preHandler: [requireRole(allRoles)],
  }, (req: FastifyRequest, rep: FastifyReply) => getPreferencesHandler(req, rep));

  app.patch('/notifications/preferences', {
    preHandler: [requireRole(allRoles)],
  }, (req: FastifyRequest, rep: FastifyReply) => updatePreferencesHandler(req, rep));

  // ── Tenant config (owner only) ────────────────────────────────────────────
  app.get('/notifications/config', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => getTenantConfigHandler(req, rep));

  app.patch('/notifications/config', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => updateTenantConfigHandler(req, rep));

  // ── Templates (owner + manager) ───────────────────────────────────────────
  app.get('/notifications/templates', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => listTemplatesHandler(req, rep));

  app.post('/notifications/templates', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => createTemplateHandler(req, rep));

  app.patch('/notifications/templates/:id', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => updateTemplateHandler(req as ReqWithId, rep));

  app.delete('/notifications/templates/:id', {
    preHandler: [requireRole([UserRole.OWNER, UserRole.MANAGER, UserRole.SUPER_ADMIN])],
  }, (req: FastifyRequest, rep: FastifyReply) => deleteTemplateHandler(req as ReqWithId, rep));
};
