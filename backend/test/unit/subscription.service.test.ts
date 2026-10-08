jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import { subscriptionService, subscriptionStatus } from '../../src/services/subscription.service';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';

beforeEach(() => resetMockPrisma());

describe('subscriptionStatus', () => {
  it('is ACTIVE for an open-ended subscription', () => {
    expect(subscriptionStatus({ isActive: true, endDate: null })).toBe('ACTIVE');
  });
});

describe('subscriptionService.getShopSubscription', () => {
  it('returns the effective state and read-only flag', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 's1', isActive: true, endDate: null, payments: [], planConfig: null, shop: { id: 'shop1', name: 'Shop' },
    });
    const sub = await subscriptionService.getShopSubscription('shop1');
    expect(sub?.state).toBe('ACTIVE');
    expect(sub?.readOnly).toBe(false);
    expect(sub?.graceDays).toBe(5);
  });

  it('returns null when the shop has no subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    expect(await subscriptionService.getShopSubscription('shop1')).toBeNull();
  });
});

describe('subscriptionService.subscribe', () => {
  it('rejects an unknown or inactive plan', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);
    await expect(subscriptionService.subscribe('shop1', { planId: 'nope' })).rejects.toMatchObject({ status: 404 });
  });

  it('creates a subscription and records the payment', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
      id: 'p1', name: 'Basic', price: 5000, billingCycle: 'MONTHLY', isActive: true, deletedAt: null,
    });
    mockPrisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.subscription.create.mockResolvedValue({ id: 's1', planConfig: null });
    mockPrisma.subscriptionPayment.create.mockResolvedValue({ id: 'pay1' });

    const sub = await subscriptionService.subscribe('shop1', { planId: 'p1' });
    expect(sub.id).toBe('s1');
    expect(mockPrisma.subscriptionPayment.create).toHaveBeenCalledTimes(1);
  });
});

describe('subscriptionService lifecycle', () => {
  it('renews an active subscription and records a payment', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 's1', isActive: true, billingCycle: 'MONTHLY', endDate: new Date(), planConfig: { price: 5000 },
    });
    mockPrisma.subscription.update.mockResolvedValue({ id: 's1', planConfig: null });
    mockPrisma.subscriptionPayment.create.mockResolvedValue({});
    const res = await subscriptionService.renew('shop1', { method: 'cash' });
    expect(res.id).toBe('s1');
    expect(mockPrisma.subscriptionPayment.create).toHaveBeenCalledTimes(1);
  });

  it('rejects renewal when no subscription exists', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    await expect(subscriptionService.renew('shop1', {})).rejects.toMatchObject({ status: 404 });
  });

  it('changes to another plan', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({ id: 'p2', name: 'Premium', price: 8000, billingCycle: 'MONTHLY', isActive: true, deletedAt: null });
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 's1' });
    mockPrisma.subscription.update.mockResolvedValue({ id: 's1', planConfig: null });
    mockPrisma.subscriptionPayment.create.mockResolvedValue({});
    const res = await subscriptionService.changePlan('shop1', { planId: 'p2' });
    expect(res.id).toBe('s1');
  });

  it('cancels a subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 's1' });
    mockPrisma.subscription.update.mockResolvedValue({ id: 's1', isActive: false });
    const res = await subscriptionService.cancel('shop1');
    expect(res.isActive).toBe(false);
  });

  it('lists active plans', async () => {
    mockPrisma.subscriptionPlan.findMany.mockResolvedValue([{ id: 'p1' }]);
    expect(await subscriptionService.listPlans()).toHaveLength(1);
  });

  it('seeds default plans when none exist', async () => {
    mockPrisma.subscriptionPlan.count.mockResolvedValue(0);
    mockPrisma.subscriptionPlan.createMany.mockResolvedValue({ count: 2 });
    await subscriptionService.ensureDefaultPlans();
    expect(mockPrisma.subscriptionPlan.createMany).toHaveBeenCalled();
  });
});
