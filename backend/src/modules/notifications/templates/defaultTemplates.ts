import { NotificationTemplate } from '../schema/notificationTemplate.schema';
import { logger } from '../../../utils/logger';

const PLATFORM_TEMPLATES = [
  // ── Ticket Created ──────────────────────────────────────────
  {
    key: 'ticket_created_in_app', channel: 'in_app',
    title: 'New Repair Ticket',
    body:  'Ticket {{ticketNumber}} has been created for {{deviceModel}}.',
  },
  // ── Ticket Assigned ─────────────────────────────────────────
  {
    key: 'ticket_assigned_in_app', channel: 'in_app',
    title: 'Ticket Assigned to You',
    body:  'Ticket {{ticketNumber}} ({{deviceModel}}) has been assigned to you.',
  },
  // ── Estimate Sent ────────────────────────────────────────────
  {
    key: 'estimate_sent_email', channel: 'email',
    subject: 'Your repair estimate is ready — {{shopName}}',
    title:   'Estimate Ready',
    body:    '<p>Hi {{customerName}},</p><p>Your repair estimate for <strong>{{deviceModel}}</strong> is ready. Ticket: <strong>{{ticketNumber}}</strong>.</p><p>Please contact {{shopName}} to approve or decline.</p>',
  },
  {
    key: 'estimate_sent_in_app', channel: 'in_app',
    title: 'Estimate Ready',
    body:  'Your estimate for {{deviceModel}} (Ticket {{ticketNumber}}) is ready for review.',
  },
  // ── Repair Completed ─────────────────────────────────────────
  {
    key: 'repair_completed_email', channel: 'email',
    subject: 'Your {{deviceModel}} repair is complete — {{shopName}}',
    title:   'Repair Complete',
    body:    '<p>Hi {{customerName}},</p><p>Great news! Your <strong>{{deviceModel}}</strong> has been repaired and is ready for collection.</p><p>Ticket: <strong>{{ticketNumber}}</strong> | Technician: {{technicianName}}</p><p>Please visit us to pick up your device.</p>',
  },
  {
    key: 'repair_completed_sms', channel: 'sms',
    title: 'Repair Complete',
    body:  '{{shopName}}: Your {{deviceModel}} repair is complete! Ticket {{ticketNumber}}. Please collect your device.',
  },
  {
    key: 'repair_completed_in_app', channel: 'in_app',
    title: 'Repair Complete',
    body:  '{{deviceModel}} (Ticket {{ticketNumber}}) repair is complete and ready for collection.',
  },
  // ── Ready for Pickup ─────────────────────────────────────────
  {
    key: 'ready_for_pickup_email', channel: 'email',
    subject: 'Your device is ready for collection — {{shopName}}',
    title:   'Ready for Pickup',
    body:    '<p>Hi {{customerName}},</p><p>Your <strong>{{deviceModel}}</strong> is ready for collection from {{shopName}}.</p><p>Ticket: <strong>{{ticketNumber}}</strong></p>',
  },
  {
    key: 'ready_for_pickup_sms', channel: 'sms',
    title: 'Ready for Pickup',
    body:  '{{shopName}}: Your {{deviceModel}} is ready for pickup! Ticket {{ticketNumber}}. Visit us today.',
  },
  {
    key: 'ready_for_pickup_in_app', channel: 'in_app',
    title: 'Ready for Pickup',
    body:  '{{deviceModel}} (Ticket {{ticketNumber}}) is ready for collection.',
  },
  // ── Ticket Delivered ─────────────────────────────────────────
  {
    key: 'ticket_delivered_email', channel: 'email',
    subject: 'Your device has been delivered — {{shopName}}',
    title:   'Device Delivered',
    body:    '<p>Hi {{customerName}},</p><p>Your <strong>{{deviceModel}}</strong> has been delivered. Ticket: <strong>{{ticketNumber}}</strong>.</p><p>Thank you for choosing {{shopName}}!</p>',
  },
  {
    key: 'ticket_delivered_in_app', channel: 'in_app',
    title: 'Device Delivered',
    body:  '{{deviceModel}} (Ticket {{ticketNumber}}) has been delivered.',
  },
  // ── Status Changed ───────────────────────────────────────────
  {
    key: 'status_changed_in_app', channel: 'in_app',
    title: 'Ticket Status Updated',
    body:  'Ticket {{ticketNumber}} status changed to {{newStatus}}.',
  },
  // ── Invoice Generated ────────────────────────────────────────
  {
    key: 'invoice_generated_email', channel: 'email',
    subject: 'Invoice for your repair — {{shopName}}',
    title:   'Invoice Ready',
    body:    '<p>Hi {{customerName}},</p><p>Your invoice for <strong>{{deviceModel}}</strong> is ready. Amount: <strong>{{currency}} {{amount}}</strong>.</p><p>Ticket: <strong>{{ticketNumber}}</strong></p>',
  },
  {
    key: 'invoice_generated_in_app', channel: 'in_app',
    title: 'Invoice Generated',
    body:  'Invoice for Ticket {{ticketNumber}} — {{currency}} {{amount}}.',
  },
  // ── Payment Received ─────────────────────────────────────────
  {
    key: 'payment_received_email', channel: 'email',
    subject: 'Payment confirmed — {{shopName}}',
    title:   'Payment Confirmed',
    body:    '<p>Hi {{customerName}},</p><p>We received your payment of <strong>{{currency}} {{amount}}</strong> for Ticket <strong>{{ticketNumber}}</strong>. Thank you!</p>',
  },
  {
    key: 'payment_received_sms', channel: 'sms',
    title: 'Payment Confirmed',
    body:  '{{shopName}}: Payment of {{currency}} {{amount}} received for Ticket {{ticketNumber}}. Thank you!',
  },
  {
    key: 'payment_received_in_app', channel: 'in_app',
    title: 'Payment Received',
    body:  'Payment of {{currency}} {{amount}} received for Ticket {{ticketNumber}}.',
  },
  // ── Payment Failed ───────────────────────────────────────────
  {
    key: 'payment_failed_email', channel: 'email',
    subject: 'Payment failed — {{shopName}}',
    title:   'Payment Failed',
    body:    '<p>Hi {{customerName}},</p><p>Your payment of <strong>{{currency}} {{amount}}</strong> for Ticket <strong>{{ticketNumber}}</strong> could not be processed. Please try again.</p>',
  },
  {
    key: 'payment_failed_in_app', channel: 'in_app',
    title: 'Payment Failed',
    body:  'Payment for Ticket {{ticketNumber}} failed. Please try again.',
  },
  // ── Low Stock ────────────────────────────────────────────────
  {
    key: 'low_stock_email', channel: 'email',
    subject: 'Low stock alert — {{itemName}}',
    title:   'Low Stock Alert',
    body:    '<p>Stock alert: <strong>{{itemName}}</strong> is running low ({{quantity}} remaining, limit: {{lowStockLimit}}). Please reorder soon.</p>',
  },
  {
    key: 'low_stock_in_app', channel: 'in_app',
    title: 'Low Stock Alert',
    body:  '{{itemName}} is running low — {{quantity}} left (limit: {{lowStockLimit}}).',
  },
  // ── Lead Events ──────────────────────────────────────────────
  {
    key: 'lead_routed_in_app', channel: 'in_app',
    title: 'New Lead Assigned',
    body:  'A new lead has been routed to you. Lead ID: {{leadId}}.',
  },
  {
    key: 'lead_unclaimed_in_app', channel: 'in_app',
    title: 'Lead Unclaimed',
    body:  'Lead {{leadId}} is unclaimed and requires attention.',
  },
  {
    key: 'lead_expired_in_app', channel: 'in_app',
    title: 'Lead Expired',
    body:  'Lead {{leadId}} has expired.',
  },
];

export const seedDefaultTemplates = async (): Promise<void> => {
  for (const tpl of PLATFORM_TEMPLATES) {
    const exists = await NotificationTemplate.findOne({ key: tpl.key, tenantId: null });
    if (!exists) {
      await NotificationTemplate.create({ ...tpl, tenantId: null, isActive: true, language: 'en' });
    }
  }
  logger.info('M7 default templates seeded');
};
