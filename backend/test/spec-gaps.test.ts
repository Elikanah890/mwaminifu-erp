jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: require('./helpers/mockPrisma').default,
}));

import type { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../src/services/inventory.service';
import { saleService } from '../src/services/sale.service';
import { authService } from '../src/services/auth.service';
import { agentPortalService } from '../src/services/agent-portal.service';
import { requireOwnerOnly, requirePermission } from '../src/middlewares/permission.middleware';
import { hashPassword } from '../src/utils/bcrypt.util';
import mockPrisma, { resetMockPrisma } from './helpers/mockPrisma';

const SHOP = 'shop1';
const USER = 'owner1';

function makeRes() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
function runSync(mw: (req: Request, res: Response, next: NextFunction) => void, req: unknown) {
  const res = makeRes();
  const next = jest.fn();
  mw(req as Request, res, next);
  return { res, next };
}

beforeEach(() => resetMockPrisma());

// ---- FIX 1: price-above-cost ----
describe('price-above-cost validation (Spec 8.4.1)', () => {
  it('rejects a product priced at cost', async () => {
    await expect(
      inventoryService.createProduct(SHOP, USER, { name: 'Rice', costPrice: 100, sellingPrice: 100 })
    ).rejects.toMatchObject({ status: 422, code: 'PRICE_BELOW_COST' });
  });

  it('rejects a product priced below cost', async () => {
    await expect(
      inventoryService.createProduct(SHOP, USER, { name: 'Rice', costPrice: 100, sellingPrice: 80 })
    ).rejects.toMatchObject({ status: 422 });
  });

  it('accepts a price strictly above cost', async () => {
    mockPrisma.product.create.mockResolvedValue({ id: 'p1', needsPriceReview: false });
    const p = await inventoryService.createProduct(SHOP, USER, { name: 'Rice', costPrice: 100, sellingPrice: 120 });
    expect(p.id).toBe('p1');
  });

  it('allows an explicit Owner override', async () => {
    mockPrisma.product.create.mockResolvedValue({ id: 'p1', needsPriceReview: true });
    const p = await inventoryService.createProduct(
      SHOP, USER,
      { name: 'Clearance', costPrice: 100, sellingPrice: 90, priceOverride: true },
      { isOwner: true }
    );
    expect(p.id).toBe('p1');
  });

  it('flags needsPriceReview when a cost edit invalidates the price', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'p1', costPrice: 100, sellingPrice: 120, minPrice: null, needsPriceReview: false, unitConfigs: [],
    });
    mockPrisma.product.update.mockResolvedValue({ id: 'p1' });
    await inventoryService.updateProduct('p1', { costPrice: 150 });
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ needsPriceReview: true }) })
    );
  });

  it('clears the review flag when the price is deliberately corrected', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'p1', costPrice: 150, sellingPrice: 120, minPrice: null, needsPriceReview: true, unitConfigs: [],
    });
    mockPrisma.product.update.mockResolvedValue({ id: 'p1' });
    await inventoryService.updateProduct('p1', { sellingPrice: 200 });
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ needsPriceReview: false }) })
    );
  });
});

// ---- FIX 2: shift gating ----
describe('shift gating (Spec 8.8.1)', () => {
  it('rejects an employee sale with no open shift', async () => {
    mockPrisma.shop.findFirst.mockResolvedValue({ id: SHOP, ownerId: USER, isArchived: false });
    mockPrisma.shift.findFirst.mockResolvedValue(null);
    await expect(
      saleService.createSale(SHOP, USER, { items: [], payments: [] }, { requireOpenShift: true })
    ).rejects.toMatchObject({ status: 422, code: 'SHIFT_REQUIRED' });
  });

  it('records the shiftId on a sale when a shift is open', async () => {
    mockPrisma.shop.findFirst.mockResolvedValue({ id: SHOP, ownerId: USER, isArchived: false });
    mockPrisma.shift.findFirst.mockResolvedValue({ id: 'shift1' });
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'p1', name: 'Rice', sellingPrice: 1000, costPrice: 600, stockQuantity: 10,
      isActive: true, isService: false, unit: 'pc', minPrice: null, maxPrice: null,
    });
    mockPrisma.sale.create.mockResolvedValue({ id: 's1', items: [] });

    await saleService.createSale(
      SHOP, USER,
      { items: [{ productId: 'p1', quantity: 1 }], payments: [{ method: 'cash', amount: 1000 }] },
      { requireOpenShift: true }
    );
    expect(mockPrisma.sale.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ shiftId: 'shift1' }) })
    );
  });
});

// ---- FIX 3: permission granularity ----
describe('owner-only reports (Spec 8.6)', () => {
  it('denies an employee General Reports', () => {
    const { res, next } = runSync(requireOwnerOnly(), { user: { userId: 'e', role: 'EMPLOYEE', permissions: ['reports:general'] } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
  it('allows a business owner', () => {
    expect(runSync(requireOwnerOnly(), { user: { userId: 'o', role: 'BUSINESS_OWNER' } }).next).toHaveBeenCalled();
  });
  it('allows activity-log report for a granted employee', () => {
    expect(
      runSync(requirePermission('reports:activity_log'), { user: { userId: 'e', role: 'EMPLOYEE', permissions: ['reports:activity_log'] } }).next
    ).toHaveBeenCalled();
  });
});

// ---- FIX 4: agent privacy ----
describe('agent privacy (Spec 12.2)', () => {
  it('never exposes owner phone/email in the agent business list', async () => {
    mockPrisma.user.findMany.mockResolvedValue([{
      id: 'b1', name: 'Biz', phone: '255700000000', email: 'owner@example.com',
      isActive: true, isPinSet: true, createdAt: new Date(), agentId: 'ag',
      ownedShops: [], _count: { ownedShops: 0, sales: 0 },
    }]);
    mockPrisma.activityLog.findFirst.mockResolvedValue(null);
    const result = await agentPortalService.listAgentBusinesses('ag', {});
    const item = result.businesses[0] as unknown as Record<string, unknown>;
    expect(item.name).toBe('Biz');
    expect(item.phone).toBeUndefined();
    expect(item.email).toBeUndefined();
  });

  it('never exposes owner phone/email in the agent business detail', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'b1', name: 'Biz', phone: '255700000000', email: 'owner@example.com',
      isActive: true, isPinSet: true, createdAt: new Date(), agentId: 'ag',
      ownedShops: [], _count: { ownedShops: 0, sales: 0 }, agent: { id: 'ag', name: 'Agent', username: 'a' },
    });
    mockPrisma.activityLog.findFirst.mockResolvedValue(null);
    mockPrisma.activityLog.findMany.mockResolvedValue([]);
    mockPrisma.shop.aggregate.mockResolvedValue({ _count: { id: 0 } });
    mockPrisma.employee.count.mockResolvedValue(0);
    const detail = (await agentPortalService.getBusinessDetail('ag', 'b1')) as unknown as Record<string, unknown>;
    expect(detail.name).toBe('Biz');
    expect(detail.phone).toBeUndefined();
    expect(detail.email).toBeUndefined();
  });
});

// ---- FIX 5: owner OTP activation ----
describe('owner OTP activation (Spec 4.7)', () => {
  it('activates the owner on a successful OTP verification', async () => {
    mockPrisma.otp.findFirst.mockResolvedValue({ id: 'otp1', code: '123456', attempts: 0, purpose: 'OWNER_ACTIVATION' });
    mockPrisma.otp.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', phone: '255700000000', role: 'BUSINESS_OWNER', name: 'Owner', isPinSet: false,
      isPhoneVerified: false, activationOtpVerifiedAt: null,
    });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.shop.findFirst.mockResolvedValue({ id: SHOP, name: 'Shop' });
    mockPrisma.refreshToken.create.mockResolvedValue({});

    await authService.verifyOtp('255700000000', '123456');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPhoneVerified: true }) })
    );
  });

  it('blocks PIN login for an unverified owner', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', role: 'BUSINESS_OWNER', isActive: true, isPhoneVerified: false, pinHash: 'x',
    });
    await expect(authService.login('255700000000', '1234')).rejects.toMatchObject({ status: 403, code: 'ACTIVATION_REQUIRED' });
  });
});

// ---- FIX 6: 2-session limit ----
describe('AGAC Owner session limit (Spec 4.3)', () => {
  it('rejects a third concurrent SYSTEM_OWNER session', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'admin1', username: 'admin', role: 'SYSTEM_OWNER', name: 'Admin', email: null,
      isActive: true, deletedAt: null, passwordHash: await hashPassword('pw'),
    });
    mockPrisma.refreshToken.count.mockResolvedValue(2);
    await expect(authService.adminLogin('admin', 'pw')).rejects.toMatchObject({ status: 409, code: 'SESSION_LIMIT' });
  });

  it('allows a SYSTEM_OWNER session when under the limit', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'admin1', username: 'admin', role: 'SYSTEM_OWNER', name: 'Admin', email: null,
      isActive: true, deletedAt: null, passwordHash: await hashPassword('pw'),
    });
    mockPrisma.refreshToken.count.mockResolvedValue(1);
    mockPrisma.refreshToken.create.mockResolvedValue({});
    const res = await authService.adminLogin('admin', 'pw');
    expect(res.accessToken).toBeTruthy();
  });
});
