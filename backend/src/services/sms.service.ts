import logger from '../utils/logger.util';
import { env, isProduction } from '../config/env';
import prisma from '../config/database';

export interface SmsSendMeta {
  /** Business purpose, e.g. LOGIN_OTP, PIN_RESET, EMPLOYEE_WELCOME. */
  purpose?: string;
  userId?: string;
  shopId?: string;
}

interface GatewayResult {
  ok: boolean;
  gateway: string;
  gatewayId?: string;
  error?: string;
}

const GSM_SEGMENT_CHARS = 160;

function estimateCost(message: string): { segments: number; cost: number } {
  const segments = Math.max(1, Math.ceil(message.length / GSM_SEGMENT_CHARS));
  return { segments, cost: Number((segments * env.SMS_COST_PER_SEGMENT).toFixed(4)) };
}

export class SmsService {
  /**
   * Send an SMS through the configured gateway.
   *
   * - Development (`MOCK_SMS=true`): does not hit the network; logs and records
   *   the message with status `MOCKED`.
   * - Production: requires a real provider (`beem` / `http`). Misconfiguration
   *   is rejected at startup by `validateProductionConfig()`.
   *
   * Every attempt is persisted to `SmsLog` (recipient, purpose, status, gateway)
   * and logged with an estimated cost.
   */
  async send(phone: string, message: string, meta: SmsSendMeta = {}): Promise<boolean> {
    const purpose = meta.purpose || 'GENERAL';
    const { segments, cost } = estimateCost(message);

    let result: GatewayResult;

    if (env.MOCK_SMS) {
      if (isProduction && !env.ALLOW_MOCK_MESSAGING) {
        // Startup already blocks this combination; kept as a defensive guard.
        // When ALLOW_MOCK_MESSAGING=true (temporary client-testing mode) the
        // mock path is allowed so registration/OTP flows do not fail at runtime.
        throw new Error('MOCK_SMS is enabled in production — refusing to send SMS.');
      }
      logger.info(`[SMS][MOCK] to=${phone} purpose=${purpose} segments=${segments} cost=${cost} (${env.SMS_COST_PER_SEGMENT}/segment)`);
      result = { ok: true, gateway: 'mock', gatewayId: `mock-${Date.now()}` };
    } else {
      result = await this.dispatch(phone, message);
    }

    // Persist an audit trail for every message (success or failure).
    try {
      await prisma.smsLog.create({
        data: {
          phone,
          message,
          type: purpose,
          status: result.ok ? (result.gateway === 'mock' ? 'mocked' : 'sent') : 'failed',
          gateway: result.gateway,
          gatewayId: result.gatewayId,
          error: result.error,
          userId: meta.userId,
          shopId: meta.shopId,
        },
      });
    } catch (err) {
      logger.error('Failed to persist SmsLog', err);
    }

    if (result.ok) {
      logger.info(`sms.sent phone=${phone} purpose=${purpose} gateway=${result.gateway} segments=${segments} cost=${cost}`);
    } else {
      logger.error(`sms.failed phone=${phone} purpose=${purpose} gateway=${result.gateway} error=${result.error}`);
    }

    return result.ok;
  }

  async sendBulk(phones: string[], message: string, meta: SmsSendMeta = {}): Promise<boolean> {
    let allOk = true;
    for (const phone of phones) {
      const ok = await this.send(phone, message, meta);
      allOk = allOk && ok;
    }
    return allOk;
  }

  private async dispatch(phone: string, message: string): Promise<GatewayResult> {
    switch (env.SMS_PROVIDER) {
      case 'beem':
        return this.sendViaBeem(phone, message);
      case 'http':
        return this.sendViaHttp(phone, message);
      default:
        return {
          ok: false,
          gateway: env.SMS_PROVIDER || 'unknown',
          error: `Unknown or unconfigured SMS_PROVIDER "${env.SMS_PROVIDER}".`,
        };
    }
  }

  /** Beem Africa (https://beem.africa) — common gateway in Tanzania. */
  private async sendViaBeem(phone: string, message: string): Promise<GatewayResult> {
    if (!env.SMS_API_KEY || !env.SMS_API_SECRET) {
      return { ok: false, gateway: 'beem', error: 'Missing SMS_API_KEY / SMS_API_SECRET' };
    }
    try {
      const auth = Buffer.from(`${env.SMS_API_KEY}:${env.SMS_API_SECRET}`).toString('base64');
      const res = await fetch(env.SMS_API_URL || 'https://apisms.beem.africa/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          source_addr: env.SMS_SENDER_ID,
          schedule_time: '',
          encoding: 0,
          message,
          recipients: [{ recipient_id: 1, dest_addr: phone }],
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, gateway: 'beem', error: `HTTP ${res.status}: ${JSON.stringify(payload)}` };
      }
      const gatewayId = (payload as { request_id?: string })?.request_id;
      return { ok: true, gateway: 'beem', gatewayId };
    } catch (err) {
      return { ok: false, gateway: 'beem', error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Generic HTTP JSON gateway. Configure `SMS_API_URL`, `SMS_API_KEY` and the
   * provider-specific request/response shape via SMS_API_URL.
   *
   * TODO(provider): map the payload to your provider's API contract if it is not
   * `{ to, message, sender }` -> `{ id }`.
   */
  private async sendViaHttp(phone: string, message: string): Promise<GatewayResult> {
    if (!env.SMS_API_URL || !env.SMS_API_KEY) {
      return { ok: false, gateway: 'http', error: 'Missing SMS_API_URL / SMS_API_KEY' };
    }
    try {
      const res = await fetch(env.SMS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.SMS_API_KEY}`,
        },
        body: JSON.stringify({ to: phone, message, sender: env.SMS_SENDER_ID }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, gateway: 'http', error: `HTTP ${res.status}: ${JSON.stringify(payload)}` };
      }
      const gatewayId = (payload as { id?: string; message_id?: string })?.id
        || (payload as { message_id?: string })?.message_id;
      return { ok: true, gateway: 'http', gatewayId };
    } catch (err) {
      return { ok: false, gateway: 'http', error: err instanceof Error ? err.message : String(err) };
    }
  }
}
