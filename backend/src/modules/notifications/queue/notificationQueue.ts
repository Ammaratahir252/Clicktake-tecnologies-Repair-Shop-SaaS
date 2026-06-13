import { Queue } from 'bullmq';
import type { NotificationChannel } from '../schema/notification.schema';

export interface NotificationJobData {
  notificationId: string;
  tenantId: string;
  channel: NotificationChannel;
  to: string;              // email address, phone number, or 'in_app'
  subject?: string;
  body: string;
  title: string;
  recipientUserId?: string;
  recipientCustomerId?: string;
}

const connection = {
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db:       parseInt(process.env.REDIS_DB || '0', 10),
};

// FIXED: Changed 'm7:notifications' to 'm7-notifications' to remove the forbidden colon character
export const notificationQueue = new Queue<NotificationJobData>('m7-notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 200 },
    removeOnFail:     { count: 100 },
  },
});