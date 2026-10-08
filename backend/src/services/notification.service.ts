import logger from '../utils/logger.util';
import { env, isProduction } from '../config/env';
import prisma from '../config/database';

export class NotificationService {
  /**
   * Deliver a push notification to a user's registered device.
   *
   * - Development (`MOCK_FCM=true`): logs only, no network call.
   * - Production: requires `FCM_SERVER_KEY` (validated at startup); sends via
   *   Firebase Cloud Messaging.
   */
  async sendPush(userId: string, title: string, body: string, data: Record<string, unknown> = {}): Promise<boolean> {
    if (env.MOCK_FCM) {
      if (isProduction) {
        throw new Error('MOCK_FCM is enabled in production — refusing to send push notification.');
      }
      logger.info(`[FCM][MOCK] userId=${userId} title="${title}"`);
      return true;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) {
      logger.warn(`fcm.skipped userId=${userId} reason=no_device_token`);
      return false;
    }

    if (!env.FCM_SERVER_KEY) {
      logger.error('fcm.failed reason=missing_FCM_SERVER_KEY');
      return false;
    }

    try {
      const res = await fetch(env.FCM_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${env.FCM_SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: user.fcmToken,
          notification: { title, body, sound: 'default' },
          data,
          priority: 'high',
        }),
      });
      const payload = await res.json().catch(() => null) as { success?: number; results?: unknown[] } | null;
      const delivered = res.ok && payload?.success === 1;
      if (delivered) {
        logger.info(`fcm.sent userId=${userId} title="${title}"`);
      } else {
        logger.error(`fcm.failed userId=${userId} status=${res.status} payload=${JSON.stringify(payload)}`);
      }
      return delivered;
    } catch (err) {
      logger.error(`fcm.failed userId=${userId} error=${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  async sendLowStockAlert(shopId: string, productName: string, stock: number, reorderLevel: number) {
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    });

    if (shop) {
      await this.sendPush(
        shop.ownerId,
        'Low Stock Alert',
        `${productName} is below reorder level (${stock}/${reorderLevel})`,
        { type: 'low_stock', shopId }
      );
    }
  }
}

export const notificationService = new NotificationService();
