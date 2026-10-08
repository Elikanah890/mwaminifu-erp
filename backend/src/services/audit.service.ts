import prisma from '../config/database';
import logger from '../utils/logger.util';

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'pin',
  'pinhash',
  'temppinhash',
  'code',
  'otp',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
];

export function sanitizeAudit(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map((item) => sanitizeAudit(item));
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.includes(key.toLowerCase())) continue;
      out[key] = sanitizeAudit(value);
    }
    return out;
  }
  return obj;
}

export class AuditService {
  async log(
    userId: string,
    action: string,
    details: Record<string, unknown> = {},
    context: AuditContext = {},
    shopId?: string,
    saleId?: string
  ): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          action,
          details: (sanitizeAudit(details) as object) || {},
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          shopId,
          saleId,
        },
      });
    } catch (error) {
      logger.error('Failed to write audit log:', error);
    }
  }

  /**
   * Writes a structured, immutable audit record to the AuditLog table for
   * critical ERP operations (sales, stock, expenses, payments, etc.).
   */
  async logDetailed(
    params: {
      shopId: string;
      userId?: string | null;
      action: string;
      entity?: string;
      entityId?: string;
      oldValue?: unknown;
      newValue?: unknown;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          shopId: params.shopId,
          userId: params.userId || null,
          action: params.action,
          entity: params.entity || null,
          entityId: params.entityId || null,
          oldValue: params.oldValue ? (sanitizeAudit(params.oldValue) as object) : undefined,
          newValue: params.newValue ? (sanitizeAudit(params.newValue) as object) : undefined,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      logger.error('Failed to write detailed audit log:', error);
    }
  }
}

export const auditService = new AuditService();