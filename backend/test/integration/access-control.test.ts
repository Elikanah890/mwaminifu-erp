jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import request from 'supertest';
import app from '../../src/app';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';
import { signAccessToken } from '../../src/utils/jwt.util';

const SHOP = 'shop_1';
const OWNER = 'owner_1';
const EMP = 'emp_1';

const ownerToken = signAccessToken({ sub: OWNER, role: 'BUSINESS_OWNER', shopId: SHOP });
const agentToken = signAccessToken({ sub: 'agent_1', role: 'AGENT' });
const employeeToken = signAccessToken({ sub: EMP, role: 'EMPLOYEE', shopId: SHOP, permissions: [] });

const DAY = 24 * 60 * 60 * 1000;

function authOwner() {
  mockPrisma.shop.findFirst.mockResolvedValue({ id: SHOP, ownerId: OWNER, isArchived: false });
}

function authEmployee(permissions: string[]) {
  mockPrisma.shop.findFirst.mockResolvedValue(null);
  mockPrisma.employee.findFirst.mockResolvedValue({
    id: 'e1', userId: EMP, shopId: SHOP, isActive: true, permissions,
  });
}

function activeSubscription() {
  mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: null });
}

beforeEach(() => {
  resetMockPrisma();
  activeSubscription();
});

describe('RBAC — loans & cash permissions', () => {
  it('denies an employee without loans:read', async () => {
    authEmployee(['pos:write']);
    const res = await request(app)
      .get(`/api/v1/shops/${SHOP}/loans`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/loans:read/);
  });

  it('denies an employee without cash:read', async () => {
    authEmployee(['pos:write']);
    const res = await request(app)
      .get(`/api/v1/shops/${SHOP}/cash`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/cash:read/);
  });

  it('allows an employee explicitly granted cash:read', async () => {
    authEmployee(['cash:read']);
    const res = await request(app)
      .get(`/api/v1/shops/${SHOP}/cash`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(200);
  });

  it('allows a business owner (owner holds all permissions)', async () => {
    authOwner();
    const [loans, cash] = await Promise.all([
      request(app).get(`/api/v1/shops/${SHOP}/loans`).set('Authorization', `Bearer ${ownerToken}`),
      request(app).get(`/api/v1/shops/${SHOP}/cash`).set('Authorization', `Bearer ${ownerToken}`),
    ]);
    expect(loans.status).toBe(200);
    expect(cash.status).toBe(200);
  });

  it('blocks agents from shop data', async () => {
    const res = await request(app)
      .get(`/api/v1/shops/${SHOP}/products`)
      .set('Authorization', `Bearer ${agentToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Subscription enforcement', () => {
  it('blocks writes with 402 once the grace period has lapsed', async () => {
    authOwner();
    mockPrisma.subscription.findFirst.mockResolvedValue({
      isActive: true,
      endDate: new Date(Date.now() - 10 * DAY),
    });
    const res = await request(app)
      .post(`/api/v1/shops/${SHOP}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Blocked Customer' });
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('SUBSCRIPTION_EXPIRED');
  });

  it('still allows reads when lapsed (read-only mode)', async () => {
    authOwner();
    mockPrisma.subscription.findFirst.mockResolvedValue({
      isActive: true,
      endDate: new Date(Date.now() - 10 * DAY),
    });
    const res = await request(app)
      .get(`/api/v1/shops/${SHOP}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  it('allows writes inside the 5-day grace window', async () => {
    authOwner();
    mockPrisma.subscription.findFirst.mockResolvedValue({
      isActive: true,
      endDate: new Date(Date.now() - 2 * DAY),
    });
    mockPrisma.customer.create.mockResolvedValue({ id: 'c1', name: 'Grace Customer' });
    const res = await request(app)
      .post(`/api/v1/shops/${SHOP}/customers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Grace Customer' });
    expect(res.status).not.toBe(402);
  });

  it('exposes the subscription status endpoint', async () => {
    mockPrisma.subscription.findFirst.mockResolvedValue({ isActive: true, endDate: null });
    const res = await request(app)
      .get(`/api/v1/subscriptions/status?shopId=${SHOP}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.state).toBe('ACTIVE');
  });
});

describe('Role boundaries', () => {
  it('denies business owners access to admin endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/admin/platform-stats')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(403);
  });

  it('rejects requests with no token', async () => {
    const res = await request(app).get(`/api/v1/shops/${SHOP}/cash`);
    expect(res.status).toBe(401);
  });
});
