import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.util';
import { shopService } from '../services/shop.service';
import prisma from '../config/database';
import { subscriptionStatus } from '../services/subscription.service';
import { getErrorStatus } from '../utils/error.util';
import { expandPermissions } from '../config/permissions';

type RoleType = 'SYSTEM_OWNER' | 'AGENT' | 'BUSINESS_OWNER' | 'EMPLOYEE';

const SUBSCRIPTION_GRACE_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionState = 'ACTIVE' | 'GRACE' | 'LAPSED' | 'NONE';

export interface SubscriptionInfo {
  state: SubscriptionState;
  endDate: Date | null;
  graceEndsAt: Date | null;
  daysUntilExpiry: number | null;
}

/** Resolve the effective subscription state for a shop. */
export async function getSubscriptionInfo(shopId: string): Promise<SubscriptionInfo> {
  const sub = await prisma.subscription.findFirst({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
  });
  if (!sub) {
    return { state: 'NONE', endDate: null, graceEndsAt: null, daysUntilExpiry: null };
  }
  const state = subscriptionStatus(sub as { isActive: boolean; endDate: Date | null });
  const graceEndsAt = sub.endDate ? new Date(sub.endDate.getTime() + SUBSCRIPTION_GRACE_DAYS * DAY_MS) : null;
  const daysUntilExpiry = sub.endDate ? Math.ceil((sub.endDate.getTime() - Date.now()) / DAY_MS) : null;
  return { state, endDate: sub.endDate, graceEndsAt, daysUntilExpiry };
}

function isWriteMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

/**
 * Enforce subscription state for a resolved shop.
 *
 * ACTIVE / within the 5-day GRACE window → allow everything.
 * LAPSED (past grace) or NONE → read-only: block writes with 402.
 * System Owner and Agent bypass this entirely.
 *
 * Returns `true` when the request may proceed, `false` when a 402 was sent.
 */
export async function enforceShopSubscription(shopId: string, req: Request, res: Response): Promise<boolean> {
  if (req.user?.role === 'SYSTEM_OWNER' || req.user?.role === 'AGENT') return true;

  const info = await getSubscriptionInfo(shopId);
  if (info.state === 'ACTIVE' || info.state === 'GRACE') return true;
  if (!isWriteMethod(req.method)) return true;

  logger.warn(`Subscription ${info.state} blocked ${req.method} ${req.path} for shop ${shopId}`);
  res.status(402).json({
    success: false,
    error: {
      code: info.state === 'NONE' ? 'SUBSCRIPTION_REQUIRED' : 'SUBSCRIPTION_EXPIRED',
      message: info.state === 'NONE'
        ? 'No active subscription. Renew to continue.'
        : 'Subscription expired. Renew to continue.',
      details: {
        state: info.state,
        endDate: info.endDate,
        graceEndsAt: info.graceEndsAt,
        graceDays: SUBSCRIPTION_GRACE_DAYS,
      },
    },
    timestamp: new Date().toISOString(),
  });
  return false;
}

export type EntityType = 'sale' | 'product' | 'product-unit' | 'customer' | 'expense' | 'loan' | 'employee' | 'receipt' | 'supplier' | 'purchase' | 'category' | 'refund';

const ENTITY_RESOLVERS: Record<EntityType, (id: string) => Promise<{ shopId: string } | null>> = {
  sale: (id) => prisma.sale.findUnique({ where: { id }, select: { shopId: true } }),
  product: (id) => prisma.product.findUnique({ where: { id }, select: { shopId: true } }),
  'product-unit': async (id) => {
    const unit = await prisma.productUnitConfig.findUnique({ where: { id }, select: { product: { select: { shopId: true } } } });
    return unit?.product ? { shopId: unit.product.shopId } : null;
  },
  customer: (id) => prisma.customer.findUnique({ where: { id }, select: { shopId: true } }),
  expense: (id) => prisma.expense.findUnique({ where: { id }, select: { shopId: true } }),
  loan: (id) => prisma.loan.findUnique({ where: { id }, select: { shopId: true } }),
  employee: (id) => prisma.employee.findUnique({ where: { id }, select: { shopId: true } }),
  // Receipt lookup is scoped to a shop by the caller (see receipt controller).
  receipt: (number) => prisma.sale.findFirst({ where: { receiptNumber: number }, select: { shopId: true } }),
  supplier: (id) => prisma.supplier.findUnique({ where: { id }, select: { shopId: true } }),
  purchase: (id) => prisma.purchase.findUnique({ where: { id }, select: { shopId: true } }),
  category: (id) => prisma.category.findUnique({ where: { id }, select: { shopId: true } }),
  refund: (id) => prisma.refund.findUnique({ where: { id }, select: { shopId: true } }),
};

export function requireRoles(...roles: RoleType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (!roles.includes(req.user.role as RoleType)) {
      logger.warn(`Access denied for user ${req.user.userId} with role ${req.user.role}`);
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // System Owner has all permissions
    if (req.user.role === 'SYSTEM_OWNER') {
      next();
      return;
    }

    // Business Owner has all shop-scoped permissions
    if (req.user.role === 'BUSINESS_OWNER') {
      next();
      return;
    }

    // Agent has limited permissions - only general operational ones
    if (req.user.role === 'AGENT') {
      const agentAllowed = ['sales:create', 'sales:view', 'inventory:view', 'reports:sales'];
      if (agentAllowed.includes(permission)) {
        next();
        return;
      }
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Agents cannot perform this action' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Employee permission check — permissions are reloaded from the DB by
    // authMiddleware on every request; legacy strings are expanded to canonical.
    if (req.user.role === 'EMPLOYEE') {
      const effective = expandPermissions(req.user.permissions || []);
      if (!effective.has(permission)) {
        logger.warn(`Permission denied for employee ${req.user.userId}: missing ${permission}`);
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `Missing required permission: ${permission}`,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next();
      return;
    }

    next();
  };
}

/**
 * Grants access when the caller holds ANY of the listed permissions. Owners and
 * System Owners always pass. Useful for shared read routes (e.g. product lists
 * reachable by POS, inventory or product-viewing employees).
 */
export function requireAnyPermission(permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
      return;
    }
    if (req.user.role === 'SYSTEM_OWNER' || req.user.role === 'BUSINESS_OWNER') {
      next();
      return;
    }
    if (req.user.role === 'AGENT') {
      const agentAllowed = ['sales:create', 'sales:view', 'inventory:view', 'reports:sales'];
      if (permissions.some((p) => agentAllowed.includes(p))) {
        next();
        return;
      }
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Agents cannot perform this action' }, timestamp: new Date().toISOString() });
      return;
    }
    if (req.user.role === 'EMPLOYEE') {
      const effective = expandPermissions(req.user.permissions || []);
      if (!permissions.some((p) => effective.has(p))) {
        logger.warn(`Permission denied for employee ${req.user.userId}: needs one of ${permissions.join(', ')}`);
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: `Missing required permission: one of ${permissions.join(', ')}` },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next();
      return;
    }
    next();
  };
}

/**
 * A credit sale (payment method "credit") additionally requires `credit:create`
 * for employees — the check is skipped when the sale has no credit payment.
 */
export function requireCreditCreateForCreditSale() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
      return;
    }
    if (req.user.role !== 'EMPLOYEE') {
      next();
      return;
    }
    const creditSale = (req.body && req.body.payments) as Array<{ method?: string }> | undefined;
    const hasCredit = Array.isArray(creditSale) && creditSale.some((p) => String(p.method || '').toLowerCase() === 'credit');
    if (!hasCredit) {
      next();
      return;
    }
    const effective = expandPermissions(req.user.permissions || []);
    if (!effective.has('credit:create')) {
      logger.warn(`Permission denied for employee ${req.user.userId}: missing credit:create for credit sale`);
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Missing required permission: credit:create' },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
}

/**
 * For an entity that carries a `userId`: allow the resource's own user, or a
 * Business/System Owner. Used to stop employees reading colleagues' records.
 */
export function requireSelfOrOwner(type: 'employee') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
      return;
    }
    if (req.user.role === 'SYSTEM_OWNER' || req.user.role === 'BUSINESS_OWNER') {
      next();
      return;
    }
    const id = req.params.id;
    if (!id) {
      next();
      return;
    }
    try {
      const employee = await prisma.employee.findUnique({ where: { id }, select: { userId: true } });
      if (!employee || employee.userId !== req.user.userId) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only view your own record' }, timestamp: new Date().toISOString() });
        return;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Resolve a shopId carried in the request body (e.g. shift open/close) and
 * verify the caller owns it or is an active employee of it.
 */
export function requireBodyShopAccess() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
      return;
    }
    if (req.user.role === 'SYSTEM_OWNER' || req.user.role === 'AGENT') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Platform and agent accounts cannot access shop-level data' }, timestamp: new Date().toISOString() });
      return;
    }
    const shopId = (req.body && (req.body.shopId as string)) || (req.query.shopId as string) || req.params.shopId;
    if (!shopId) {
      res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'shopId is required' }, timestamp: new Date().toISOString() });
      return;
    }
    try {
      await shopService.verifyShopAccess(shopId, req.user.userId);
      req.params.shopId = shopId;
      next();
    } catch (err: unknown) {
      const status = getErrorStatus(err);
      if (status === 403 || status === 404) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this shop' }, timestamp: new Date().toISOString() });
        return;
      }
      next(err);
    }
  };
}

/**
 * Owner-only guard for General Reports and Finance Overview (Spec 8.6 / 15).
 * These are never grantable to employees, so this cannot be satisfied by any
 * employee permission string.
 */
export function requireOwnerOnly() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (req.user.role === 'SYSTEM_OWNER' || req.user.role === 'BUSINESS_OWNER') {
      next();
      return;
    }
    logger.warn(`Owner-only access denied for user ${req.user.userId} with role ${req.user.role}`);
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'This report is available to the owner only' },
      timestamp: new Date().toISOString(),
    });
  };
}

export function requireShopAccess(opts: { enforceSubscription?: boolean } = {}) {
  const enforceSubscription = opts.enforceSubscription !== false;
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Spec 15.1 — shop sales/inventory/customers/employees are private to the
    // Business Owner. Neither the platform owner nor agents may read shop data.
    if (req.user.role === 'SYSTEM_OWNER' || req.user.role === 'AGENT') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Platform and agent accounts cannot access shop-level data' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const shopId = req.params.shopId || (req.body && (req.body.shopId as string)) || (req.query.shopId as string);
    if (!shopId) {
      next();
      return;
    }

    try {
      await shopService.verifyShopAccess(shopId, req.user.userId);
      if (enforceSubscription && !(await enforceShopSubscription(shopId, req, res))) return;
      next();
    } catch (err: unknown) {
      const status = getErrorStatus(err);
      if (status === 403 || status === 404) {
        logger.warn(`Shop access denied for user ${req.user!.userId} on shop ${shopId}`);
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied to this shop' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  };
}

/**
 * Verifies that the entity identified by `:id` (or `:receiptNumber`) belongs to a shop
 * the requesting user is allowed to access (owner or active employee).
 * Attaches the resolved shopId in `req.resolvedShopId` so controllers can operate
 * correctly for multi-shop owners (instead of relying on the JWT shopId).
 */
export function requireEntityAccess(type: EntityType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Spec 15.1 — platform/agent accounts never read shop entity data.
    if (req.user.role === 'SYSTEM_OWNER' || req.user.role === 'AGENT') {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Platform and agent accounts cannot access shop-level data' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const id = req.params.id || req.params.receiptNumber;
    if (!id) {
      next();
      return;
    }

    try {
      const entity = await ENTITY_RESOLVERS[type](id);
      if (!entity) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Resource not found' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      await shopService.verifyShopAccess(entity.shopId, req.user.userId);
      req.resolvedShopId = entity.shopId;
      if (!(await enforceShopSubscription(entity.shopId, req, res))) return;
      next();
    } catch (err: unknown) {
      const status = getErrorStatus(err);
      if (status === 403 || status === 404) {
        logger.warn(`Entity access denied for user ${req.user!.userId} on ${type} ${id}`);
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied to this resource' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
    }
  };
}

function resolveRequestShopId(req: Request): string | null {
  return (
    (req as Request & { resolvedShopId?: string }).resolvedShopId ||
    (req.user as { shopId?: string } | undefined)?.shopId ||
    req.params.shopId ||
    (req.body && (req.body.shopId as string)) ||
    (req.query.shopId as string) ||
    null
  );
}

async function resolveSubscriptionForRequest(req: Request) {
  const shopId = resolveRequestShopId(req);
  if (!shopId) return null;
  return prisma.subscription.findFirst({
    where: { shopId, isActive: true },
    include: { planConfig: true },
  });
}

/**
 * Standalone subscription guard for routes that do not already pass through
 * `requireShopAccess`/`requireEntityAccess` (e.g. `/shifts`). Resolves the shop
 * from the resolved entity, token, params, body or query.
 */
export function requireActiveSubscription() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
      return;
    }
    if (req.user.role === 'SYSTEM_OWNER' || req.user.role === 'AGENT') {
      next();
      return;
    }
    const shopId = resolveRequestShopId(req);
    if (!shopId) {
      next();
      return;
    }
    if (!(await enforceShopSubscription(shopId, req, res))) return;
    next();
  };
}

export function requireFeature(feature: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, timestamp: new Date().toISOString() });
      return;
    }
    if (req.user.role === 'SYSTEM_OWNER') {
      next();
      return;
    }
    const subscription = await resolveSubscriptionForRequest(req);
    const features = ((subscription?.planConfig?.features as string[]) || []).map((f) => f.toLowerCase());
    if (!features.includes(feature.toLowerCase())) {
      res.status(403).json({
        success: false,
        error: { code: 'FEATURE_NOT_INCLUDED', message: `Your current plan does not include "${feature}"` },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  };
}
