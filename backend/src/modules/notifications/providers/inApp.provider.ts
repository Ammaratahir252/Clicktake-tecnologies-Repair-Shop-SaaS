import { Notification } from '../schema/notification.schema';
import { emitToUser, emitToCustomer } from '../gateway/socketGateway';
import type { INotificationProvider, SendPayload, SendResult } from './provider.interface';

export class InAppProvider implements INotificationProvider {
  readonly channel = 'in_app' as const;
  readonly providerId = 'socket_io';

  async send(payload: SendPayload): Promise<SendResult> {
    const { tenantId, notificationId, title, body, recipientUserId, recipientCustomerId } = payload;

    const socketData = {
      notificationId,
      title,
      message: body,
      createdAt: new Date().toISOString(),
    };

    if (recipientUserId) {
      emitToUser(tenantId, recipientUserId, socketData);
    }
    if (recipientCustomerId) {
      emitToCustomer(tenantId, recipientCustomerId, socketData);
    }

    return {
      success: true,
      providerReference: `socket:${Date.now()}`,
    };
  }
}
