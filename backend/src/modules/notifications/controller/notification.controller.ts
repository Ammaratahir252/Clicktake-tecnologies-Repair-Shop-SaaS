import { FastifyRequest, FastifyReply } from 'fastify';
import {
  getInbox,
  markNotificationRead,
  markAllRead,
  getOrCreatePreferences,
  updatePreferences,
  handleUnsubscribe,
  getTenantConfig,
  upsertTenantConfig,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../service/notification.service';
import {
  inboxQuerySchema,
  preferencesUpdateSchema,
  tenantConfigUpdateSchema,
  templateCreateSchema,
  templateUpdateSchema,
} from '../validation/notification.validation';
import { ValidationError } from '../../../errors';

// ── Inbox ─────────────────────────────────────────────────────────────────────

export const getInboxHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const parsed = inboxQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError('Invalid query params');

  const result = await getInbox(
    req.tenantId,
    req.user.userId,
    parsed.data.page,
    parsed.data.limit
  );
  return rep.send({ success: true, message: 'Success', data: result });
};

export const markReadHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  const notif = await markNotificationRead(req.tenantId, req.params.id, req.user.userId);
  return rep.send({ success: true, message: 'Marked as read', data: notif });
};

export const markAllReadHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  await markAllRead(req.tenantId, req.user.userId);
  return rep.send({ success: true, message: 'All marked as read', data: null });
};

// ── Preferences ───────────────────────────────────────────────────────────────

export const getPreferencesHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const prefs = await getOrCreatePreferences(req.tenantId, req.user.userId);
  return rep.send({ success: true, message: 'Success', data: prefs });
};

export const updatePreferencesHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const parsed = preferencesUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Invalid preferences');

  const prefs = await updatePreferences(req.tenantId, req.user.userId, parsed.data.channels);
  return rep.send({ success: true, message: 'Preferences updated', data: prefs });
};

// ── Unsubscribe (public) ──────────────────────────────────────────────────────

export const unsubscribeHandler = async (
  req: FastifyRequest<{ Params: { token: string } }>,
  rep: FastifyReply
) => {
  await handleUnsubscribe(req.params.token);
  return rep.send({ success: true, message: 'You have been unsubscribed from email notifications.', data: null });
};

// ── Tenant config ─────────────────────────────────────────────────────────────

export const getTenantConfigHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const config = await getTenantConfig(req.tenantId);
  return rep.send({ success: true, message: 'Success', data: config });
};

export const updateTenantConfigHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const parsed = tenantConfigUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Invalid config');

  const config = await upsertTenantConfig(req.tenantId, parsed.data);
  return rep.send({ success: true, message: 'Config updated', data: config });
};

// ── Templates ─────────────────────────────────────────────────────────────────

export const listTemplatesHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const templates = await listTemplates(req.tenantId);
  return rep.send({ success: true, message: 'Success', data: templates });
};

export const createTemplateHandler = async (req: FastifyRequest, rep: FastifyReply) => {
  const parsed = templateCreateSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Invalid template data');

  const template = await createTemplate(req.tenantId, parsed.data);
  return rep.status(201).send({ success: true, message: 'Template created', data: template });
};

export const updateTemplateHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  const parsed = templateUpdateSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError('Invalid template data');

  const template = await updateTemplate(req.tenantId, req.params.id, parsed.data);
  return rep.send({ success: true, message: 'Template updated', data: template });
};

export const deleteTemplateHandler = async (
  req: FastifyRequest<{ Params: { id: string } }>,
  rep: FastifyReply
) => {
  await deleteTemplate(req.tenantId, req.params.id);
  return rep.send({ success: true, message: 'Template deleted', data: null });
};
