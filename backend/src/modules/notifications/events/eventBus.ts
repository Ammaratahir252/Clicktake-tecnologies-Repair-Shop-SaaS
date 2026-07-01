import { EventEmitter } from 'events';
import type { NotificationChannel } from '../schema/notification.schema';

export type NotificationEventType =
  | 'ticket_created'
  | 'ticket_assigned'
  | 'estimate_sent'
  | 'repair_completed'
  | 'ready_for_pickup'
  | 'ticket_delivered'
  | 'status_changed'
  | 'invoice_generated'
  | 'payment_received'
  | 'payment_failed'
  | 'low_stock'
  | 'lead_routed'
  | 'lead_unclaimed'
  | 'lead_expired';

export interface NotificationEventPayload {
  // Customer recipient
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  // Single staff recipient
  recipientUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  // Multiple staff recipients (e.g. low_stock → all managers)
  recipientUserIds?: string[];
  recipientEmails?: string[];
  // Entity references (used as template variables + idempotency)
  ticketId?: string;
  ticketNumber?: string;
  invoiceId?: string;
  estimateId?: string;
  paymentId?: string;
  itemId?: string;
  itemName?: string;
  quantity?: number;
  lowStockLimit?: number;
  leadId?: string;
  deviceModel?: string;
  repairType?: string;
  technicianName?: string;
  shopName?: string;
  amount?: number;
  currency?: string;
  newStatus?: string;
  [key: string]: unknown;
}

export interface NotificationEvent {
  type: NotificationEventType;
  tenantId: string;
  payload: NotificationEventPayload;
}

// Channels to activate per event type
export const EVENT_CHANNEL_MAP: Record<NotificationEventType, NotificationChannel[]> = {
  ticket_created:    ['in_app'],
  ticket_assigned:   ['in_app'],
  estimate_sent:     ['email', 'in_app'],
  repair_completed:  ['email', 'sms', 'in_app'],
  ready_for_pickup:  ['email', 'sms', 'in_app'],
  ticket_delivered:  ['email', 'in_app'],
  status_changed:    ['in_app'],
  invoice_generated: ['email', 'in_app'],
  payment_received:  ['email', 'sms', 'in_app'],
  payment_failed:    ['email', 'in_app'],
  low_stock:         ['email', 'in_app'],
  lead_routed:       ['in_app'],
  lead_unclaimed:    ['in_app'],
  lead_expired:      ['in_app'],
};

// These event types bypass quiet hours (time-sensitive / transactional)
export const URGENT_EVENT_TYPES: Set<NotificationEventType> = new Set([
  'payment_received',
  'payment_failed',
  'ready_for_pickup',
]);

class NotificationEventBus extends EventEmitter {}

export const notificationEventBus = new NotificationEventBus();
notificationEventBus.setMaxListeners(50);

// ── Public API — other modules call this, never touch the bus directly ──
export const emitNotificationEvent = (event: NotificationEvent): void => {
  notificationEventBus.emit('notification', event);
};
