jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import type { Request, Response, NextFunction } from 'express';
import {
  requirePermission,
  requireRoles,
  enforceShopSubscription,
  requireShopAccess,
  requireEntityAccess,
  requireActiveSubscription,
  getSubscriptionInfo,
} from '../../src/middlewares/permission.middleware';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';

const SHOP = 'shop_1';

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

describe('requireRoles', () => {
  it('allows a matching role', () => {
    const { next, res } = runSync(requireRoles('SYSTEM_OWNER'), { user: { userId: 'u', role: 'SYSTEM_OWNER' } });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a non-matching role with 403', () => {
    const { next, res } = runSync(requireRoles('SYSTEM_OWNER'), { user: { userId: 'u', role: 'BUSINESS_OWNER' } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects unauthenticated requests with 401', () => {
    const { res } = runSync(requireRoles('BUSINESS_OWNER'), {});
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requirePermission', () => {
  it('grants system owners everything', () => {
    const { next } = runSync(requirePermission('loans:write'), { user: { userId: 'u', role: 'SYSTEM_OWNER' } });
    expect(next).toHaveBeenCalled();
  });

  it('grants business owners everything', () => {
    const { next } = runSync(requirePermission('cash:write'), { user: { userId: 'u', role: 'BUSINESS_OWNER' } });
    expect(next).toHaveBeenCalled();
  });

  it('grants employees holding the permission', () => {
    const { next } = runSync(requirePermission('loans:read'), { user: { userId: 'u', role: 'EMPLOYEE', permissions: ['loans:read'] } });
    expect(next).toHaveBeenCalled();
  });

  it('denies employees missing the permission', () => {
    const { res, next } = runSync(requirePermission('loans:read'), { user: { userId: 'u', role: 'EMPLOYEE', permissions: [] } });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('limits agents to the operational allow-list', () => {
    expect(runSync(requirePermission('sales:create'), { user: { userId: 'a', role: 'AGENT', permissions: [] } }).next).toHaveBeenCalled();
    expect(runSync(requirePermission('loans:write'), { user: { userId: 'a', role: 'AGENT', permissions: [] } }).res.status).toHaveBeenCalledWith(403);
  });
});

describe('enforceShopSubscription', () => {
  it('allows writes on an active subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: null });
    const res = makeRes();
    const ok = await enforceShopSubscription(SHOP, { method: 'POST', user: { role: 'BUSINESS_OWNER' } } as Request, res);
    expect(ok).toBe(true);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows writes during the grace window', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: new Date(Date.now() - 2 * 86400000) });
    const res = makeRes();
    const ok = await enforceShopSubscription(SHOP, { method: 'POST', user: { role: 'BUSINESS_OWNER' } } as Request, res);
    expect(ok).toBe(true);
  });

  it('blocks writes with 402 after grace lapses', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: new Date(Date.now() - 10 * 86400000) });
    const res = makeRes();
    const ok = await enforceShopSubscription(SHOP, { method: 'POST', user: { role: 'BUSINESS_OWNER' } } as Request, res);
    expect(ok).toBe(false);
    expect(res.status).toHaveBeenCalledWith(402);
  });

  it('allows reads after grace lapses', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: new Date(Date.now() - 10 * 86400000) });
    const res = makeRes();
    const ok = await enforceShopSubscription(SHOP, { method: 'GET', user: { role: 'BUSINESS_OWNER' } } as Request, res);
    expect(ok).toBe(true);
  });

  it('never blocks system owners', async () => {
    const res = makeRes();
    const ok = await enforceShopSubscription(SHOP, { method: 'POST', user: { role: 'SYSTEM_OWNER' } } as Request, res);
    expect(ok).toBe(true);
  });

  it('reports state NONE when no subscription exists', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue(null);
    const info = await getSubscriptionInfo(SHOP);
    expect(info.state).toBe('NONE');
  });
});

async function runAsync(
  mw: (req: Request, res: Response, next: NextFunction) => Promise<void>,
  req: unknown
) {
  const res = makeRes();
  const next = jest.fn();
  await mw(req as Request, res, next);
  return { res, next };
}

describe('requireShopAccess', () => {
  it('allows an owner with an active subscription', async () => {
    mockPrisma.shop.findFirst.mockResolvedValue({ id: SHOP, ownerId: 'o1', isArchived: false });
    mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: null });
    const { next } = await runAsync(requireShopAccess(), {
      params: { shopId: SHOP }, method: 'GET', user: { userId: 'o1', role: 'BUSINESS_OWNER' },
    });
    expect(next).toHaveBeenCalled();
  });

  it('rejects agents with 403', async () => {
    const { res } = await runAsync(requireShopAccess(), {
      params: { shopId: SHOP }, method: 'GET', user: { userId: 'a', role: 'AGENT' },
    });
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects a non-member with 403', async () => {
    mockPrisma.shop.findFirst.mockResolvedValue(null);
    mockPrisma.employee.findFirst.mockResolvedValue(null);
    const { res } = await runAsync(requireShopAccess(), {
      params: { shopId: SHOP }, method: 'GET', user: { userId: 'x', role: 'BUSINESS_OWNER' },
    });
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('requireEntityAccess', () => {
  it('resolves the entity shop and allows an owner', async () => {
    mockPrisma.sale.findUnique.mockResolvedValue({ shopId: SHOP });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: SHOP, ownerId: 'o1', isArchived: false });
    mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: null });
    const { next } = await runAsync(requireEntityAccess('sale'), {
      params: { id: 's1' }, method: 'GET', user: { userId: 'o1', role: 'BUSINESS_OWNER' },
    });
    expect(next).toHaveBeenCalled();
  });

  it('returns 404 when the entity is missing', async () => {
    mockPrisma.sale.findUnique.mockResolvedValue(null);
    const { res } = await runAsync(requireEntityAccess('sale'), {
      params: { id: 'missing' }, method: 'GET', user: { userId: 'o1', role: 'BUSINESS_OWNER' },
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('requireActiveSubscription', () => {
  it('allows a request with an active subscription', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: null });
    const { next } = await runAsync(requireActiveSubscription(), {
      params: {}, body: {}, query: {}, method: 'POST', user: { userId: 'e', role: 'EMPLOYEE', shopId: SHOP },
    });
    expect(next).toHaveBeenCalled();
  });

  it('blocks writes when the subscription has lapsed', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: new Date(Date.now() - 10 * 86400000) });
    const { res } = await runAsync(requireActiveSubscription(), {
      params: {}, body: {}, query: {}, method: 'POST', user: { userId: 'e', role: 'EMPLOYEE', shopId: SHOP },
    });
    expect(res.status).toHaveBeenCalledWith(402);
  });
});
