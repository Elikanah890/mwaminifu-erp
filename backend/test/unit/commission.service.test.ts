jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import { subscriptionService } from '../../src/services/subscription.service';
import { adminService } from '../../src/services/admin.service';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';

const SHOP = 'shop1';
const OWNER = 'owner1';
const AGENT = 'agent1';
const PLAN = {
  id: 'plan1', name: 'Basic', price: 5000, billingCycle: 'MONTHLY', isActive: true, deletedAt: null,
};

beforeEach(() => {
  resetMockPrisma();
  mockPrisma.shop.findUnique.mockResolvedValue({ ownerId: OWNER, owner: { agentId: AGENT } });
  mockPrisma.subscription.updateMany.mockResolvedValue({ count: 0 });
  mockPrisma.subscription.create.mockResolvedValue({ id: 'sub1', planConfig: PLAN });
  mockPrisma.subscriptionPayment.create.mockResolvedValue({ id: 'pay1', amount: 5000 });
  mockPrisma.commission.findUnique.mockResolvedValue(null);
  mockPrisma.commission.create.mockResolvedValue({ id: 'comm1' });
});

describe('Agent commission — first payment only', () => {
  it('creates 5% commission on the first Basic payment', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(PLAN);
    await subscriptionService.subscribe(SHOP, { planId: 'plan1' });
    expect(mockPrisma.commission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ agentId: AGENT, ownerId: OWNER, amount: 250, status: 'PENDING' }),
    });
  });

  it('creates 5% commission on the first Premium payment', async () => {
    const premium = { ...PLAN, id: 'plan2', name: 'Premium', price: 8000 };
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(premium);
    mockPrisma.subscriptionPayment.create.mockResolvedValue({ id: 'pay2', amount: 8000 });
    await subscriptionService.subscribe(SHOP, { planId: 'plan2' });
    expect(mockPrisma.commission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 400 }),
    });
  });

  it('does not create a second commission for the same owner', async () => {
    mockPrisma.commission.findUnique.mockResolvedValue({ id: 'existing', ownerId: OWNER });
    mockPrisma.subscription.findFirst.mockResolvedValue({
      id: 'sub1', planConfig: PLAN, endDate: new Date(Date.now() + 86400000), billingCycle: 'MONTHLY', isActive: true,
    });
    mockPrisma.subscription.update.mockResolvedValue({ id: 'sub1', planConfig: PLAN });
    await subscriptionService.renew(SHOP, {});
    expect(mockPrisma.commission.create).not.toHaveBeenCalled();
  });

  it('does not create a commission when the owner already has a prior payment', async () => {
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(PLAN);
    mockPrisma.subscriptionPayment.count.mockResolvedValue(2);
    await subscriptionService.subscribe(SHOP, { planId: 'plan1' });
    expect(mockPrisma.commission.create).not.toHaveBeenCalled();
  });

  it('skips commission when the owner has no linked agent', async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({ ownerId: OWNER, owner: { agentId: null } });
    mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(PLAN);
    await subscriptionService.subscribe(SHOP, { planId: 'plan1' });
    expect(mockPrisma.commission.create).not.toHaveBeenCalled();
  });
});

describe('Agent payout grouping', () => {
  const pending = [
    { id: 'c1', amount: 250 },
    { id: 'c2', amount: 250 },
    { id: 'c3', amount: 400 },
  ];

  beforeEach(() => {
    mockPrisma.agent.findUnique.mockResolvedValue({ id: AGENT, name: 'Agent', phone: '255700000000' });
    mockPrisma.commission.findMany.mockResolvedValue(pending);
    mockPrisma.payout.create.mockResolvedValue({ id: 'payout1', amount: 900, reference: 'PAY-TEST' });
    mockPrisma.commission.updateMany.mockResolvedValue({ count: 3 });
  });

  it('groups all pending commissions into one payout transaction', async () => {
    const payout = await adminService.payoutAgent(AGENT, {}, 'admin1');
    expect(payout.amount).toBe(900);
    expect(mockPrisma.payout.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 900, status: 'COMPLETED' }),
    });
    expect(mockPrisma.commission.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['c1', 'c2', 'c3'] }, status: 'PENDING' },
      data: expect.objectContaining({ status: 'PAID', payoutId: 'payout1' }),
    });
  });

  it('rejects payout when there is nothing pending', async () => {
    mockPrisma.commission.findMany.mockResolvedValue([]);
    await expect(adminService.payoutAgent(AGENT, {}, 'admin1')).rejects.toMatchObject({ status: 422 });
  });
});
