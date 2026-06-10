import crypto from 'crypto';
import { Notification } from '../schema/notification.schema';
import { NotificationTemplate } from '../schema/notificationTemplate.schema';
import { TenantNotificationConfig } from '../schema/tenantNotificationConfig.schema';
import { NotificationPreferences } from '../schema/notificationPreferences.schema';
import { notificationQueue } from '../queue/notificationQueue';
import { resolveTemplate, renderTemplate } from '../templates/templateEngine';
import { registerNotificationEventListener } from '../events/notificationEventListener';
import { encrypt, decrypt, generateSecureToken } from '../../../utils/encryption';
import { NotFoundError, ForbiddenError } from '../../../errors';
import type {
  NotificationEvent,
  NotificationEventPayload,
  NotificationEventType,
} from '../events/eventBus';
import { EVENT_CHANNEL_MAP, URGENT_EVENT_TYPES } from '../events/eventBus';
import type { NotificationChannel } from '../schema/notification.schema';
import type { IQuietHours } from '../schema/tenantNotificationConfig.schema';
import { logger } from '../../../utils/logger';

// ── Quiet hours check ────────────────────────────────────────────────────────
function isInQuietHours(quietHours: IQuietHours, timezone: string): boolean {
  if (!quietHours.enabled) return false;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone || 'UTC',
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  });

  const parts = formatter.formatToParts(now);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value   || '0');
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0');
  const current = h * 60 + m;

  const [sh, sm] = quietHours.start.split(':').map(Number);
  const [eh, em] = quietHours.end.split(':').map(Number);
  const start = sh * 60 + sm;
  const end   = eh * 60 + em;

  return start > end
    ? current >= start || current < end  // overnight window e.g. 22:00–08:00
    : current >= start && current < end;
}

// ── Recipient resolution ─────────────────────────────────────────────────────
interface Recipient {
  userId?: string;
  customerId?: string;
  email?: string;
  phone?: string;
  name?: string;
}

function buildRecipients(payload: NotificationEventPayload): Recipient[] {
  const recipients: Recipient[] = [];

  if (payload.customerId || payload.customerEmail) {
    recipients.push({
      customerId: payload.customerId,
      email:      payload.customerEmail,
      phone:      payload.customerPhone,
      name:       payload.customerName,
    });
  }

  if (payload.recipientUserId || payload.recipientEmail) {
    recipients.push({
      userId: payload.recipientUserId,
      email:  payload.recipientEmail,
      phone:  payload.recipientPhone,
      name:   payload.recipientName,
    });
  }

  if (Array.isArray(payload.recipientUserIds) && payload.recipientUserIds.length) {
    const emails = (payload.recipientEmails as string[]) || [];
    payload.recipientUserIds.forEach((uid, i) => {
      recipients.push({ userId: uid, email: emails[i] });
    });
  }

  return recipients;
}

function contactFor(channel: NotificationChannel, recipient: Recipient): string | null {
  if (channel === 'email')   return recipient.email || null;
  if (channel === 'sms')     return recipient.phone || null;
  if (channel === 'in_app')  return 'in_app';
  if (channel === 'whatsapp') return recipient.phone || null;
  return null;
}

// ── Idempotency key ──────────────────────────────────────────────────────────
function buildIdempotencyKey(
  tenantId: string,
  type: NotificationEventType,
  channel: NotificationChannel,
  payload: NotificationEventPayload
): string {
  const ref = payload.ticketId || payload.invoiceId || payload.itemId || payload.leadId || '';
  return crypto
    .createHash('sha256')
    .update(`${tenantId}:${type}:${channel}:${ref}`)
    .digest('hex');
}

// ── Orchestrator ─────────────────────────────────────────────────────────────
export const orchestrateNotification = async (event: NotificationEvent): Promise<void> => {
  const { type, tenantId, payload } = event;

  const channels   = EVENT_CHANNEL_MAP[type] || ['in_app'];
  const recipients = buildRecipients(payload);

  if (!recipients.length) {
    logger.warn('No recipients resolved for event', { type, tenantId });
    return;
  }

  const tenantConfig = await TenantNotificationConfig.findOne({ tenantId }).lean();

  for (const recipient of recipients) {
    for (const channel of channels) {
      const to = contactFor(channel, recipient);
      if (!to) continue;

      // Preference check
      const prefsQuery = recipient.userId
        ? { tenantId, userId: recipient.userId }
        : { tenantId, customerId: recipient.customerId };
      const prefs = await NotificationPreferences.findOne(prefsQuery).lean();
      if (prefs && !prefs.channels[channel as keyof typeof prefs.channels]) continue;

      // Quiet hours (SMS / WhatsApp only, non-urgent)
      if (['sms', 'whatsapp'].includes(channel) && !URGENT_EVENT_TYPES.has(type)) {
        if (tenantConfig?.quietHours?.enabled) {
          if (isInQuietHours(tenantConfig.quietHours, tenantConfig.timezone || 'UTC')) {
            logger.info('Suppressed by quiet hours', { tenantId, type, channel });
            continue;
          }
        }
      }

      // Idempotency — skip if same notification sent in last 5 minutes
      const iKey = buildIdempotencyKey(tenantId, type, channel, payload);
      const recent = await Notification.findOne({
        tenantId,
        type,
        channel,
        'payload.idempotencyKey': iKey,
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      }).lean();
      if (recent) {
        logger.info('Idempotency guard — duplicate skipped', { tenantId, type, channel });
        continue;
      }

      // Resolve + render template
      const template = await resolveTemplate(tenantId, type, channel);
      const rendered = renderTemplate(
        template,
        { ...payload, shopName: payload.shopName || tenantId },
        `${type.replace(/_/g, ' ')} notification`
      );

      // Persist notification record (pending)
      const notif = await Notification.create({
        tenantId,
        userId:     recipient.userId,
        customerId: recipient.customerId,
        type,
        channel,
        title:      rendered.title,
        message:    rendered.body,
        templateId: rendered.templateId,
        payload:    { ...payload, idempotencyKey: iKey },
        status:     'pending',
      });

      // Enqueue delivery job
      await notificationQueue.add('deliver', {
        notificationId:      notif._id.toString(),
        tenantId,
        channel,
        to,
        subject:             rendered.subject,
        body:                rendered.body,
        title:               rendered.title,
        recipientUserId:     recipient.userId,
        recipientCustomerId: recipient.customerId,
      });
    }
  }
};

// ── Boot listener ────────────────────────────────────────────────────────────
export const startNotificationService = (): void => {
  registerNotificationEventListener(orchestrateNotification);
};

// ── Inbox API ────────────────────────────────────────────────────────────────
export const getInbox = async (
  tenantId: string,
  userId: string,
  page: number,
  limit: number
) => {
  const skip  = (page - 1) * limit;
  const query = { tenantId, userId };
  const [items, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(query),
  ]);
  const unread = await Notification.countDocuments({ ...query, readAt: null });
  return { items, total, unread, page, limit };
};

export const markNotificationRead = async (
  tenantId: string,
  notificationId: string,
  userId: string
) => {
  const notif = await Notification.findOne({ _id: notificationId, tenantId });
  if (!notif) throw new NotFoundError('Notification not found');
  if (notif.userId !== userId && notif.customerId !== userId)
    throw new ForbiddenError('Not your notification');

  notif.readAt = new Date();
  await notif.save();
  return notif;
};

export const markAllRead = async (tenantId: string, userId: string) => {
  await Notification.updateMany(
    { tenantId, userId, readAt: null },
    { $set: { readAt: new Date() } }
  );
};

// ── Preferences ──────────────────────────────────────────────────────────────
export const getOrCreatePreferences = async (tenantId: string, userId: string) => {
  let prefs = await NotificationPreferences.findOne({ tenantId, userId });
  if (!prefs) {
    prefs = await NotificationPreferences.create({
      tenantId,
      userId,
      channels:     { email: true, sms: true, whatsapp: true, push: true, in_app: true },
      optOutToken:  generateSecureToken(24),
    });
  }
  return prefs;
};

export const updatePreferences = async (
  tenantId: string,
  userId: string,
  channels: Partial<Record<NotificationChannel, boolean>>
) => {
  const prefs = await getOrCreatePreferences(tenantId, userId);
  Object.assign(prefs.channels, channels);
  await prefs.save();
  return prefs;
};

export const handleUnsubscribe = async (optOutToken: string) => {
  const prefs = await NotificationPreferences.findOne({ optOutToken });
  if (!prefs) throw new NotFoundError('Invalid unsubscribe token');
  prefs.channels.email = false;
  await prefs.save();
  return true;
};

// ── Tenant config ─────────────────────────────────────────────────────────────
export const getTenantConfig = async (tenantId: string) => {
  const config = await TenantNotificationConfig.findOne({ tenantId }).lean();
  if (!config) return null;

  // Mask encrypted keys before returning
  const maskedKeys: Record<string, string> = {};
  for (const [k] of Object.entries(config.providerKeys || {})) {
    maskedKeys[k] = '***configured***';
  }
  return { ...config, providerKeys: maskedKeys };
};

export const upsertTenantConfig = async (
  tenantId: string,
  data: {
    emailProvider?: string;
    smsProvider?: string;
    whatsappProvider?: string;
    quietHours?: { enabled?: boolean; start?: string; end?: string };
    timezone?: string;
    providerKeys?: Record<string, string>;
  }
) => {
  const existing = await TenantNotificationConfig.findOne({ tenantId });
  const doc = existing || new TenantNotificationConfig({ tenantId });

  if (data.emailProvider)    doc.emailProvider    = data.emailProvider;
  if (data.smsProvider)      doc.smsProvider      = data.smsProvider;
  if (data.whatsappProvider) doc.whatsappProvider = data.whatsappProvider;
  if (data.timezone)         doc.timezone         = data.timezone;
  if (data.quietHours) {
    if (data.quietHours.enabled !== undefined) doc.quietHours.enabled = data.quietHours.enabled;
    if (data.quietHours.start)                 doc.quietHours.start   = data.quietHours.start;
    if (data.quietHours.end)                   doc.quietHours.end     = data.quietHours.end;
  }

  if (data.providerKeys) {
    const encryptedKeys = { ...doc.providerKeys };
    for (const [provider, rawKey] of Object.entries(data.providerKeys)) {
      if (rawKey && rawKey !== '***configured***') {
        encryptedKeys[provider] = encrypt(rawKey);
      }
    }
    doc.providerKeys = encryptedKeys;
  }

  await doc.save();
  return getTenantConfig(tenantId);
};

// ── Templates ────────────────────────────────────────────────────────────────
export const listTemplates = async (tenantId: string) =>
  NotificationTemplate.find({
    $or: [{ tenantId }, { tenantId: null }],
  }).lean();

export const createTemplate = async (
  tenantId: string,
  data: { key: string; channel: string; subject?: string; body: string; language?: string }
) => NotificationTemplate.create({ ...data, tenantId, isActive: true });

export const updateTemplate = async (
  tenantId: string,
  id: string,
  data: Partial<{ subject: string; body: string; isActive: boolean; language: string }>
) => {
  const tpl = await NotificationTemplate.findOne({ _id: id, tenantId });
  if (!tpl) throw new NotFoundError('Template not found');
  Object.assign(tpl, data);
  return tpl.save();
};

export const deleteTemplate = async (tenantId: string, id: string) => {
  const tpl = await NotificationTemplate.findOne({ _id: id, tenantId });
  if (!tpl) throw new NotFoundError('Template not found');
  await tpl.deleteOne();
};
