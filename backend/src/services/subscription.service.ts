import prisma from '../config/database';
import { Prisma } from '@prisma/client';

const GRACE_DAYS = 5;
const DAY = 24 * 60 * 60 * 1000;
const COMMISSION_RATE = 0.05;

/**
 * Spec 12.3 — a one-time 5% referral commission is created for the agent who
 * registered the owner, on the owner's FIRST successful subscription payment.
 * Tied to the owner (one row per owner).
 */
async function createFirstPaymentCommission(
  tx: Prisma.TransactionClient,
  shopId: string,
  paymentId: string,
  amount: number
): Promise<void> {
  const shop = await tx.shop.findUnique({
    where: { id: shopId },
    select: { ownerId: true, owner: { select: { agentId: true } } },
  });
  const agentId = shop?.owner?.agentId;
  if (!shop || !agentId) return;

  const existing = await tx.commission.findFirst({ where: { ownerId: shop.ownerId } });
  if (existing) return;

  const commission = Math.round(amount * COMMISSION_RATE * 100) / 100;
  if (commission <= 0) return;

  await tx.commission.create({
    data: { agentId, ownerId: shop.ownerId, paymentId, amount: commission, status: 'PENDING' },
  });
}

export const PLAN_FEATURES = [
  { id: 'pos', label: 'Point of Sale (POS)' },
  { id: 'inventory', label: 'Inventory Management' },
  { id: 'credit', label: 'Customer Credit (Deni)' },
  { id: 'reports', label: 'Reports' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'loans', label: 'Loans' },
  { id: 'employees', label: 'Employees' },
  { id: 'sms', label: 'SMS Communications' },
  { id: 'email', label: 'Email Communications' },
  { id: 'whatsapp', label: 'WhatsApp Business' },
  { id: 'multishop', label: 'Multi-shop (up to 5)' },
];

function addInterval(date: Date, cycle: string): Date {
  const d = new Date(date);
  if (cycle === 'DAILY') d.setDate(d.getDate() + 1);
  else if (cycle === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export function subscriptionStatus(sub: { isActive: boolean; endDate: Date | null }): 'ACTIVE' | 'GRACE' | 'LAPSED' {
  if (!sub.isActive) return 'LAPSED';
  const now = new Date();
  if (!sub.endDate || sub.endDate >= now) return 'ACTIVE';
  const graceEnd = new Date(sub.endDate.getTime() + GRACE_DAYS * DAY);
  return now <= graceEnd ? 'GRACE' : 'LAPSED';
}

export class SubscriptionService {
  async ensureDefaultPlans() {
    const activeCount = await prisma.subscriptionPlan.count({ where: { deletedAt: null, isActive: true } });
    if (activeCount > 0) return;

    const defaults = [
      {
        name: 'Basic',
        description: 'For single-shop retailers',
        price: 5000,
        billingCycle: 'MONTHLY',
        features: ['pos', 'inventory', 'credit', 'reports', 'expenses', 'loans', 'employees'],
        isActive: true,
        isDefault: true,
        displayOrder: 1,
      },
      {
        name: 'Premium',
        description: 'Full platform with messaging and multi-shop',
        price: 8000,
        billingCycle: 'MONTHLY',
        features: ['pos', 'inventory', 'credit', 'reports', 'expenses', 'loans', 'employees', 'sms', 'email', 'whatsapp', 'multishop'],
        isActive: true,
        isDefault: false,
        displayOrder: 2,
      },
    ];

    for (const plan of defaults) {
      const existing = await prisma.subscriptionPlan.findUnique({ where: { name: plan.name } });
      if (existing) {
        // Reactivate a previously soft-deleted default plan.
        await prisma.subscriptionPlan.update({
          where: { id: existing.id },
          data: {
            price: plan.price,
            billingCycle: plan.billingCycle,
            features: plan.features,
            isActive: true,
            deletedAt: null,
            displayOrder: plan.displayOrder,
          },
        });
      } else {
        await prisma.subscriptionPlan.create({ data: plan });
      }
    }
  }

  async listPlans(includeInactive = false) {
    return prisma.subscriptionPlan.findMany({
      where: includeInactive ? { deletedAt: null } : { deletedAt: null, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async getShopSubscription(shopId: string) {
    const sub = await prisma.subscription.findFirst({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: {
        planConfig: true,
        shop: { select: { id: true, name: true } },
        payments: { orderBy: { paidAt: 'desc' } },
      },
    });
    if (!sub) return null;
    const state = subscriptionStatus(sub);
    const graceEndsAt = sub.endDate ? new Date(sub.endDate.getTime() + GRACE_DAYS * DAY) : null;
    const daysUntilExpiry = sub.endDate
      ? Math.ceil((sub.endDate.getTime() - Date.now()) / DAY)
      : null;
    return {
      ...sub,
      effectiveStatus: state,
      state,
      graceDays: GRACE_DAYS,
      graceEndsAt,
      daysUntilExpiry,
      // Read-only is only applied to writes once the grace window has passed.
      readOnly: state === 'LAPSED',
    };
  }

  async subscribe(shopId: string, data: { planId: string; billingCycle?: string; method?: string }) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
    if (!plan || !plan.isActive || plan.deletedAt) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Plan not found or inactive' };
    }
    const cycle = data.billingCycle || plan.billingCycle || 'MONTHLY';
    const start = new Date();
    const end = addInterval(start, cycle);

    return prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({ where: { shopId, isActive: true }, data: { isActive: false, status: 'LAPSED' } });
      const sub = await tx.subscription.create({
        data: {
          shopId,
          plan: plan.name,
          planId: plan.id,
          status: 'ACTIVE',
          billingCycle: cycle,
          startDate: start,
          endDate: end,
          isActive: true,
          autoRenew: true,
        },
        include: { planConfig: true },
      });
      const payment = await tx.subscriptionPayment.create({
        data: { subscriptionId: sub.id, amount: plan.price, method: data.method || 'cash', status: 'COMPLETED' },
      });
      await createFirstPaymentCommission(tx, shopId, payment.id, plan.price);
      return { ...sub, effectiveStatus: 'ACTIVE' as const };
    });
  }

  async renew(shopId: string, data: { method?: string }) {
    const sub = await prisma.subscription.findFirst({ where: { shopId, isActive: true }, include: { planConfig: true } });
    if (!sub) throw { status: 404, code: 'NOT_FOUND', message: 'No active subscription' };
    const price = sub.planConfig?.price ?? 0;
    const base = sub.endDate && sub.endDate > new Date() ? sub.endDate : new Date();
    const end = addInterval(new Date(base), sub.billingCycle || 'MONTHLY');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE', isActive: true, endDate: end },
        include: { planConfig: true },
      });
      const payment = await tx.subscriptionPayment.create({
        data: { subscriptionId: sub.id, amount: price, method: data.method || 'cash', status: 'COMPLETED' },
      });
      await createFirstPaymentCommission(tx, shopId, payment.id, price);
      return { ...updated, effectiveStatus: 'ACTIVE' as const };
    });
  }

  async changePlan(shopId: string, data: { planId: string; billingCycle?: string; method?: string }) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
    if (!plan || !plan.isActive || plan.deletedAt) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Plan not found or inactive' };
    }
    const sub = await prisma.subscription.findFirst({ where: { shopId, isActive: true } });
    if (!sub) return this.subscribe(shopId, data);

    const cycle = data.billingCycle || plan.billingCycle || 'MONTHLY';
    const end = addInterval(new Date(), cycle);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.subscription.update({
        where: { id: sub.id },
        data: { plan: plan.name, planId: plan.id, billingCycle: cycle, endDate: end, status: 'ACTIVE', isActive: true },
        include: { planConfig: true },
      });
      const payment = await tx.subscriptionPayment.create({
        data: { subscriptionId: sub.id, amount: plan.price, method: data.method || 'cash', status: 'COMPLETED' },
      });
      await createFirstPaymentCommission(tx, shopId, payment.id, plan.price);
      return { ...updated, effectiveStatus: 'ACTIVE' as const };
    });
  }

  async cancel(shopId: string) {
    const sub = await prisma.subscription.findFirst({ where: { shopId, isActive: true } });
    if (!sub) throw { status: 404, code: 'NOT_FOUND', message: 'No active subscription' };
    return prisma.subscription.update({ where: { id: sub.id }, data: { autoRenew: false, isActive: false, status: 'LAPSED' } });
  }
}

export const subscriptionService = new SubscriptionService();
