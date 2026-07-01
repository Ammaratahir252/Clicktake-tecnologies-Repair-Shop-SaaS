import { notificationEventBus } from './eventBus';
import type { NotificationEvent } from './eventBus';
import { logger } from '../../../utils/logger';

let _registered = false;

export const registerNotificationEventListener = (
  orchestrate: (event: NotificationEvent) => Promise<void>
): void => {
  if (_registered) return;
  _registered = true;

  notificationEventBus.on('notification', async (event: NotificationEvent) => {
    try {
      await orchestrate(event);
    } catch (err) {
      logger.error('Notification orchestration error', {
        type:     event.type,
        tenantId: event.tenantId,
        error:    err instanceof Error ? err.message : String(err),
      });
    }
  });

  logger.info('M7 notification event listener registered');
};
