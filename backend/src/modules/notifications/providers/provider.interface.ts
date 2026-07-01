import type { NotificationChannel } from '../schema/notification.schema';

export interface SendPayload {
  to: string;
  subject?: string;
  body: string;
  title: string;
  tenantId: string;
  notificationId: string;
  recipientUserId?: string;
  recipientCustomerId?: string;
  apiKey?: string; // decrypted at send time
}

export interface SendResult {
  success: boolean;
  providerReference?: string;
  error?: string;
}

export interface INotificationProvider {
  readonly channel: NotificationChannel;
  readonly providerId: string;
  send(payload: SendPayload): Promise<SendResult>;
}
