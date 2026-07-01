import Handlebars from 'handlebars';
import { NotificationTemplate } from '../schema/notificationTemplate.schema';
import type { NotificationEventType, NotificationEventPayload } from '../events/eventBus';
import type { NotificationChannel } from '../schema/notification.schema';

export interface RenderedTemplate {
  title: string;
  subject?: string;
  body: string;
  templateId?: string;
}

// Derive template key from event type + channel
export const buildTemplateKey = (type: NotificationEventType, channel: NotificationChannel): string =>
  `${type}_${channel}`;

export const resolveTemplate = async (
  tenantId: string,
  type: NotificationEventType,
  channel: NotificationChannel
) => {
  const key = buildTemplateKey(type, channel);

  // Prefer tenant-specific, fall back to platform default (no tenantId)
  const template =
    (await NotificationTemplate.findOne({ key, channel, tenantId, isActive: true }).lean()) ||
    (await NotificationTemplate.findOne({ key, channel, tenantId: null, isActive: true }).lean()) ||
    (await NotificationTemplate.findOne({ key, channel, isActive: true }).lean());

  return template ?? null;
};

export const renderTemplate = (
  template: { title?: string; subject?: string; body: string } | null,
  payload: NotificationEventPayload,
  fallbackTitle: string
): RenderedTemplate => {
  if (!template) {
    return {
      title:   fallbackTitle,
      subject: fallbackTitle,
      body:    fallbackTitle,
    };
  }

  const ctx = payload as Record<string, unknown>;

  const compile = (src: string) => {
    try {
      return Handlebars.compile(src)(ctx);
    } catch {
      return src;
    }
  };

  return {
    title:      compile((template as any).title || fallbackTitle),
    subject:    template.subject   ? compile(template.subject)   : undefined,
    body:       compile(template.body),
    templateId: (template as any)._id?.toString(),
  };
};
