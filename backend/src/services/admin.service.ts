import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../utils/bcrypt.util';
import { SmsService } from './sms.service';
import { auditService, AuditContext } from './audit.service';
import { getPagination, getSort } from '../utils/pagination.util';
import { generateOtp } from '../utils/otp.util';
import { settingsService } from './settings.service';

const smsService = new SmsService();

const INSENSITIVE = { mode: 'insensitive' as const };

export interface AdminListQuery {
  [key: string]: string | undefined;
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  shopId?: string;
  agentId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
  priority?: string;
  isRead?: string;
  plan?: string;
  ownerId?: string;
  target?: string;
}

function getDateRange(from?: string, to?: string) {
  const toDate = to && !isNaN(new Date(to).getTime()) ? new Date(to) : new Date();
  toDate.setHours(23, 59, 59, 999);
  const fromDate = from && !isNaN(new Date(from).getTime())
    ? new Date(from)
    : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  fromDate.setHours(0, 0, 0, 0);
  return { fromDate, toDate };
}

function pick(obj: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in obj) out[key] = obj[key];
  }
  return out;
}

/** Business-level platform events surfaced on the System Owner dashboard. */
const BUSINESS_EVENT_ACTIONS: Record<string, string> = {
  BUSINESS_OWNER_CREATED: 'New business registered',
  BUSINESS_ONBOARDED: 'New business registered',
  AGENT_CREATED: 'New agent registered',
  AGENT_UPDATED: 'Agent updated',
  AGENT_STATUS_CHANGED: 'Agent status changed',
  OWNER_STATUS_CHANGED: 'Business owner status changed',
  SHOP_ARCHIVED: 'Shop archived',
  SHOP_UNARCHIVED: 'Shop restored',
};

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

// 60-second cache for the System Owner dashboard (keyed by granularity).
let dashboardCache: { at: number; byGranularity: Record<string, unknown> } = { at: 0, byGranularity: {} };

/** Group a daily subscription-revenue series into the requested granularity. */
function bucketRevenueTrend(rows: Array<{ day: Date; revenue: number }>, granularity: Granularity) {
  const buckets = new Map<string, number>();
  for (const row of rows) {
    const d = new Date(row.day);
    let key: string;
    if (granularity === 'daily') {
      key = d.toISOString().slice(0, 10);
    } else if (granularity === 'weekly') {
      const monday = new Date(d);
      const day = (monday.getUTCDay() + 6) % 7; // Monday = 0
      monday.setUTCDate(monday.getUTCDate() - day);
      key = monday.toISOString().slice(0, 10);
    } else if (granularity === 'monthly') {
      key = d.toISOString().slice(0, 7);
    } else {
      key = d.toISOString().slice(0, 4);
    }
    buckets.set(key, (buckets.get(key) || 0) + (row.revenue || 0));
  }
  return Array.from(buckets.entries())
    .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export class AdminService {
  // ---------------- Agents ----------------

  async createAgent(data: { username: string; password: string; name: string; phone?: string; email?: string }, createdBy: string, ctx: AuditContext = {}) {
    const existingUser = await prisma.user.findUnique({ where: { username: data.username } });
    if (existingUser) {
      throw { status: 409, code: 'CONFLICT', message: 'Username already exists' };
    }

    const existingAgent = await prisma.agent.findUnique({ where: { username: data.username } });
    if (existingAgent) {
      throw { status: 409, code: 'CONFLICT', message: 'Username already exists' };
    }

    const hashedPassword = await hashPassword(data.password);

    const agent = await prisma.$transaction(async (tx) => {
      const createdAgent = await tx.agent.create({
        data: {
          username: data.username,
          passwordHash: hashedPassword,
          name: data.name,
          phone: data.phone,
          email: data.email,
          createdBy,
        },
      });

      await tx.user.create({
        data: {
          username: data.username,
          passwordHash: hashedPassword,
          name: data.name,
          phone: data.phone,
          email: data.email,
          role: 'AGENT',
          agentId: createdAgent.id,
        },
      });

      return createdAgent;
    });

    await auditService.log(createdBy, 'AGENT_CREATED', {
      agent: { id: agent.id, name: agent.name, username: agent.username },
    }, ctx);

    // Spec 12.1 — deliver the agent's login credentials automatically.
    if (agent.phone) {
      const appName = await settingsService.get('appName');
      await smsService.send(
        agent.phone,
        `${appName}: Your agent account is ready. Username: ${agent.username}  Password: ${data.password}. Open the app, choose "Agent", and sign in.`,
        { purpose: 'AGENT_WELCOME' }
      );
    }

    return agent;
  }

  async listAgents(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, ...INSENSITIVE } },
        { username: { contains: query.search, ...INSENSITIVE } },
        { phone: { contains: query.search, ...INSENSITIVE } },
        { email: { contains: query.search, ...INSENSITIVE } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;

    const { field, order } = getSort(query);
    const [total, agents] = await Promise.all([
      prisma.agent.count({ where }),
      prisma.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [field]: order } as Record<string, 'asc' | 'desc'>,
        include: { _count: { select: { onboardedUsers: true } } },
      }),
    ]);

    const agentIds = agents.map((a) => a.id);
    const [earned, paid] = agentIds.length
      ? await Promise.all([
          prisma.commission.groupBy({ by: ['agentId'], where: { agentId: { in: agentIds } }, _sum: { amount: true } }),
          prisma.commission.groupBy({ by: ['agentId'], where: { agentId: { in: agentIds }, status: 'PAID' }, _sum: { amount: true } }),
        ])
      : [[], []];
    const earnedMap = new Map(earned.map((r) => [r.agentId, r._sum.amount || 0]));
    const paidMap = new Map(paid.map((r) => [r.agentId, r._sum.amount || 0]));

    const data = agents.map((a) => ({
      ...a,
      commissionEarned: earnedMap.get(a.id) || 0,
      commissionPaid: paidMap.get(a.id) || 0,
    }));

    return { agents: data, total, page, limit };
  }

  async getAgent(agentId: string) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        onboardedUsers: {
          where: { deletedAt: null },
          select: { id: true, name: true, phone: true, isActive: true, createdAt: true },
        },
      },
    });
    if (!agent) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Agent not found' };
    }

    const [commissions, payouts, earnedAgg, paidAgg] = await Promise.all([
      prisma.commission.findMany({
        where: { agentId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { owner: { select: { name: true, phone: true } }, payout: { select: { id: true, reference: true } } },
      }),
      prisma.payout.findMany({ where: { agentId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.commission.aggregate({ where: { agentId }, _sum: { amount: true } }),
      prisma.commission.aggregate({ where: { agentId, status: 'PAID' }, _sum: { amount: true } }),
    ]);

    return {
      ...agent,
      commissions,
      payouts,
      stats: {
        onboardedUsers: agent.onboardedUsers.length,
        activeUsers: agent.onboardedUsers.filter((u) => u.isActive).length,
        commissionEarned: earnedAgg._sum.amount || 0,
        commissionPaid: paidAgg._sum.amount || 0,
        revenue: 0,
        transactions: 0,
      },
    };
  }

  // ---------------- Commissions & Payouts ----------------

  async listCommissions(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.CommissionWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.agentId) where.agentId = query.agentId;
    const [total, rows] = await Promise.all([
      prisma.commission.count({ where }),
      prisma.commission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: { select: { id: true, name: true, username: true } },
          owner: { select: { id: true, name: true, phone: true } },
          payout: { select: { id: true, reference: true, status: true } },
        },
      }),
    ]);
    return { commissions: rows, total, page, limit };
  }

  async listPayouts(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.PayoutWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.agentId) where.agentId = query.agentId;
    const [total, rows] = await Promise.all([
      prisma.payout.count({ where }),
      prisma.payout.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { agent: { select: { id: true, name: true, username: true } } },
      }),
    ]);
    return { payouts: rows, total, page, limit };
  }

  /** Sum an agent's PENDING commissions, pay them out, and mark them PAID. */
  async payoutAgent(agentId: string, data: { method?: string; walletNumber?: string }, actorId: string, ctx: AuditContext = {}) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Agent not found' };
    }

    const pending = await prisma.commission.findMany({ where: { agentId, status: 'PENDING' } });
    const amount = Math.round(pending.reduce((s, c) => s + c.amount, 0) * 100) / 100;
    if (pending.length === 0 || amount <= 0) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'No pending commission to pay out' };
    }

    const reference = `PAY-${Date.now().toString(36).toUpperCase()}`;
    const payout = await prisma.$transaction(async (tx) => {
      const created = await tx.payout.create({
        data: {
          agentId,
          amount,
          method: data.method || 'mobile_money',
          walletNumber: data.walletNumber || agent.phone || null,
          reference,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      await tx.commission.updateMany({
        where: { agentId, status: 'PENDING' },
        data: { status: 'PAID', payoutId: created.id, paidAt: new Date() },
      });
      return created;
    });

    await auditService.log(actorId, 'AGENT_PAYOUT', { agentId, agentName: agent.name, amount, reference }, ctx);
    return payout;
  }

  /** Generate (and SMS) a fresh owner activation OTP; returns it once for the System Owner. */
  async generateOwnerOtp(ownerId: string, actorId: string, ctx: AuditContext = {}) {
    const user = await prisma.user.findFirst({ where: { id: ownerId, role: 'BUSINESS_OWNER', deletedAt: null } });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Business owner not found' };
    }
    if (!user.phone) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Owner has no phone number on file' };
    }

    const code = generateOtp();
    const minutes = await settingsService.get('otpLifetimeMinutes');
    const appName = await settingsService.get('appName');
    await prisma.otp.create({
      data: { phone: user.phone, code, purpose: 'OWNER_ACTIVATION', expiresAt: new Date(Date.now() + minutes * 60 * 1000), userId: user.id },
    });
    await smsService.send(user.phone, `${appName}: Your activation code is ${code}. Valid for ${minutes} minutes.`, {
      purpose: 'OWNER_ACTIVATION',
      userId: user.id,
    });
    await auditService.log(actorId, 'OWNER_OTP_VIEWED', { ownerId: user.id, ownerName: user.name, phone: user.phone }, ctx);
    return { phone: user.phone, otp: code, expiresInMinutes: minutes };
  }

  async updateAgent(agentId: string, data: { name?: string; phone?: string; email?: string; isActive?: boolean }, actorId: string, ctx: AuditContext = {}) {
    const before = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!before) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Agent not found' };
    }

    const agent = await prisma.agent.update({ where: { id: agentId }, data });

    await prisma.user.updateMany({
      where: { username: before.username },
      data: pick(data, ['name', 'phone', 'email', 'isActive']),
    });

    await auditService.log(actorId, 'AGENT_UPDATED', {
      agentId,
      before: pick(before as unknown as Record<string, unknown>, ['name', 'phone', 'email', 'isActive']),
      after: pick(agent as unknown as Record<string, unknown>, ['name', 'phone', 'email', 'isActive']),
    }, ctx);

    return agent;
  }

  async toggleAgentStatus(agentId: string, actorId: string, ctx: AuditContext = {}) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Agent not found' };
    }

    const isActive = !agent.isActive;
    const updated = await prisma.agent.update({ where: { id: agentId }, data: { isActive } });
    // Only the agent's own login should follow the agent's status. Business
    // owners onboarded by this agent must remain unaffected.
    await prisma.user.updateMany({ where: { agentId, role: 'AGENT' }, data: { isActive } });

    await auditService.log(actorId, 'AGENT_STATUS_CHANGED', {
      agentId,
      before: agent.isActive,
      after: isActive,
    }, ctx);

    return updated;
  }

  async deleteAgent(agentId: string, actorId: string, ctx: AuditContext = {}) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Agent not found' };
    }

    const now = new Date();
    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { deletedAt: now, isActive: false },
    });
    // Soft-delete ONLY the agent's own login account. Business owners onboarded
    // by this agent must remain active — their shops, employees and data are
    // not deleted (see onboarding/cascade requirement).
    await prisma.user.updateMany({
      where: { agentId, role: 'AGENT' },
      data: { deletedAt: now, isActive: false },
    });

    await auditService.log(actorId, 'AGENT_DELETED', {
      agent: { id: agentId, name: agent.name, username: agent.username },
    }, ctx);

    return updated;
  }

  // ---------------- Business Owners ----------------

  async createBusinessOwner(
    data: { phone: string; name: string; email?: string; shopName: string; shopAddress?: string; region?: string; district?: string; ward?: string; street?: string; businessCategory?: string; currency?: string; agentId?: string },
    createdBy: string,
    ctx: AuditContext = {}
  ) {
    const existingUser = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existingUser) {
      throw { status: 409, code: 'CONFLICT', message: 'A user with this phone already exists' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          phone: data.phone,
          name: data.name,
          email: data.email,
          role: 'BUSINESS_OWNER',
          isActive: true,
          isPinSet: false,
          isPhoneVerified: false,
          ...(data.agentId ? { agentId: data.agentId } : {}),
        },
      });

      const shop = await tx.shop.create({
        data: {
          ownerId: user.id,
          name: data.shopName,
          address: data.shopAddress,
          region: data.region,
          district: data.district,
          ward: data.ward,
          street: data.street,
          businessCategory: data.businessCategory,
          currency: data.currency || 'TZS',
        },
      });

      await tx.subscription.create({
        data: { shopId: shop.id, plan: 'basic', status: 'active' },
      });

      const defaultCategories = [
        'Grocery', 'Drinks', 'Food', 'Cosmetics', 'Electronics',
        'Hardware', 'Pharmacy', 'Agriculture', 'Stationery',
      ];
      await tx.category.createMany({
        data: defaultCategories.map((name) => ({
          shopId: shop.id,
          name,
          isDefault: true,
        })),
      });

      return { user, shop };
    });

    // Spec 4.7 — send an account-activation OTP (not a welcome message). The
    // owner enters it on first login to prove the phone number and activate.
    const activationCode = generateOtp();
    const activationMinutes = await settingsService.get('otpLifetimeMinutes');
    const activationAppName = await settingsService.get('appName');
    await prisma.otp.create({
      data: {
        phone: data.phone,
        code: activationCode,
        purpose: 'OWNER_ACTIVATION',
        expiresAt: new Date(Date.now() + activationMinutes * 60 * 1000),
        userId: result.user.id,
      },
    });
    await smsService.send(
      data.phone,
      `${activationAppName}: Your "${result.shop.name}" activation code is ${activationCode}. Valid for ${activationMinutes} minutes. Enter it in the app to activate your account.`,
      { purpose: 'OWNER_ACTIVATION', userId: result.user.id, shopId: result.shop.id }
    );

    await auditService.log(createdBy, 'BUSINESS_OWNER_CREATED', {
      businessOwner: { id: result.user.id, name: result.user.name, phone: result.user.phone },
      shop: { id: result.shop.id, name: result.shop.name, currency: result.shop.currency },
    }, ctx, result.shop.id);

    // Returned ONCE to the (System Owner) caller so the activation code can be
    // shared if the SMS does not arrive. Never persisted in plain in responses.
    return { ...result, activationOtp: activationCode };
  }

  async listBusinessOwners(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = { role: 'BUSINESS_OWNER', deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, ...INSENSITIVE } },
        { phone: { contains: query.search, ...INSENSITIVE } },
        { email: { contains: query.search, ...INSENSITIVE } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;
    if (query.agentId) where.agentId = query.agentId;

    const { field, order } = getSort(query);
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [field]: order } as Record<string, 'asc' | 'desc'>,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          isActive: true,
          isPinSet: true,
          lastLoginAt: true,
          createdAt: true,
          agent: { select: { id: true, name: true, username: true } },
          _count: { select: { ownedShops: true, sales: true } },
        },
      }),
    ]);

    return { users, total, page, limit };
  }

  async getBusinessOwner(ownerId: string) {
    const user = await prisma.user.findFirst({
      where: { id: ownerId, role: 'BUSINESS_OWNER', deletedAt: null },
      include: {
        agent: { select: { id: true, name: true, username: true } },
        ownedShops: {
          select: {
            id: true,
            name: true,
            address: true,
            isArchived: true,
            createdAt: true,
          },
        },
      },
    });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Business owner not found' };
    }

    // Spec 15.1 — subscription/CRM data only; no shop sales, inventory,
    // customers or employee counts.
    const shopIds = user.ownedShops.map((s) => s.id);
    const subscriptions = shopIds.length
      ? await prisma.subscription.findMany({ where: { shopId: { in: shopIds } } })
      : [];

    return {
      ...user,
      stats: { subscriptions },
    };
  }

  async updateBusinessOwnerStatus(ownerId: string, isActive: boolean, actorId: string, ctx: AuditContext = {}) {
    const user = await prisma.user.findFirst({ where: { id: ownerId, role: 'BUSINESS_OWNER', deletedAt: null } });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Business owner not found' };
    }

    const updated = await prisma.user.update({ where: { id: ownerId }, data: { isActive } });

    await auditService.log(actorId, 'OWNER_STATUS_CHANGED', {
      ownerId,
      ownerName: user.name,
      before: user.isActive,
      after: isActive,
    }, ctx);

    return updated;
  }

  async resetBusinessOwnerPin(ownerId: string, actorId: string, ctx: AuditContext = {}) {
    const user = await prisma.user.findFirst({ where: { id: ownerId, role: 'BUSINESS_OWNER', deletedAt: null } });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Business owner not found' };
    }
    if (!user.phone) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Owner has no phone number on file' };
    }

    const code = generateOtp();
    const minutes = await settingsService.get('otpLifetimeMinutes');
    const appName = await settingsService.get('appName');
    await prisma.otp.create({
      data: {
        phone: user.phone,
        code,
        purpose: 'PIN_RESET',
        expiresAt: new Date(Date.now() + minutes * 60 * 1000),
        userId: user.id,
      },
    });

    await smsService.send(user.phone, `${appName}: Your PIN reset OTP is ${code}. Valid for ${minutes} minutes. Open the app and set a new PIN.`, { purpose: 'OWNER_PIN_RESET', userId: user.id });

    await auditService.log(actorId, 'OWNER_PIN_RESET', {
      ownerId: user.id,
      ownerName: user.name,
      phone: user.phone,
    }, ctx);

    return { message: 'PIN reset OTP sent to the owner phone. The owner sets the new PIN in the app.' };
  }

  /**
   * Soft-remove a business owner. Their shops are archived and sessions are
   * revoked; no shop data is deleted (Spec: system owner controls access, not
   * the owner's private business data).
   */
  async deleteBusinessOwner(ownerId: string, actorId: string, ctx: AuditContext = {}) {
    const user = await prisma.user.findFirst({ where: { id: ownerId, role: 'BUSINESS_OWNER' } });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Business owner not found' };
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: ownerId },
        data: { isActive: false, deletedAt: now },
      });
      await tx.refreshToken.updateMany({ where: { userId: ownerId }, data: { isRevoked: true } });
      await tx.shop.updateMany({ where: { ownerId }, data: { isArchived: true } });
    });

    await auditService.log(actorId, 'BUSINESS_OWNER_DELETED', {
      ownerId,
      ownerName: user.name,
      phone: user.phone,
    }, ctx);

    return { id: ownerId, deleted: true };
  }

  /** Regenerate an agent's login password. Returns the one-time temp password. */
  async resetAgentPassword(agentId: string, actorId: string, ctx: AuditContext = {}) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Agent not found' };
    }

    const tempPassword = Math.random().toString(36).slice(2, 10);
    const hashed = await hashPassword(tempPassword);

    await prisma.$transaction(async (tx) => {
      await tx.agent.update({ where: { id: agentId }, data: { passwordHash: hashed } });
      await tx.user.updateMany({ where: { agentId, role: 'AGENT' }, data: { passwordHash: hashed } });
    });

    await auditService.log(actorId, 'AGENT_PASSWORD_RESET', {
      agentId,
      agentName: agent.name,
      username: agent.username,
    }, ctx);

    // Send the new password to the agent automatically.
    if (agent.phone) {
      const appName = await settingsService.get('appName');
      await smsService.send(
        agent.phone,
        `${appName}: Your agent password was reset. Username: ${agent.username}  New password: ${tempPassword}. Sign in under "Agent".`,
        { purpose: 'AGENT_PASSWORD_RESET' }
      );
    }

    return { username: agent.username, tempPassword };
  }

  // ---------------- Businesses ----------------

  async listBusinesses(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = { role: 'BUSINESS_OWNER', deletedAt: null };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, ...INSENSITIVE } },
        { phone: { contains: query.search, ...INSENSITIVE } },
        { email: { contains: query.search, ...INSENSITIVE } },
        { agent: { name: { contains: query.search, ...INSENSITIVE } } },
      ];
    }
    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;

    const { field, order } = getSort(query);
    const [total, owners] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [field]: order } as Record<string, 'asc' | 'desc'>,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          agent: { select: { id: true, name: true } },
          ownedShops: { select: { id: true } },
        },
      }),
    ]);

    const ownerIds = owners.map((o) => o.id);
    const shopCounts = await prisma.shop.groupBy({ by: ['ownerId'], where: { ownerId: { in: ownerIds } }, _count: { _all: true } });
    const shopMap = new Map(shopCounts.map((s) => [s.ownerId, s._count._all]));

    // Spec 15.1 — system owner sees platform/CRM data only, never shop sales,
    // inventory, customers or employee counts.
    const businesses = owners.map((o) => ({
      id: o.id,
      name: o.name,
      phone: o.phone,
      email: o.email,
      isActive: o.isActive,
      agentName: o.agent?.name || null,
      shopCount: shopMap.get(o.id) || 0,
      lastLoginAt: o.lastLoginAt,
      createdAt: o.createdAt,
    }));

    return { businesses, total, page, limit };
  }

  async getBusiness(businessId: string) {
    const owner = await prisma.user.findFirst({
      where: { id: businessId, role: 'BUSINESS_OWNER', deletedAt: null },
      include: { agent: { select: { id: true, name: true, username: true } } },
    });
    if (!owner) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Business not found' };
    }

    // Spec 15.1 — shop profile + subscription only; no sales/inventory/
    // customer/employee data is exposed to the system owner.
    const shops = await prisma.shop.findMany({
      where: { ownerId: businessId },
      select: {
        id: true,
        name: true,
        address: true,
        currency: true,
        isArchived: true,
        createdAt: true,
        subscriptions: {
          select: { id: true, plan: true, status: true, isActive: true, billingCycle: true, startDate: true, endDate: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { ...owner, shops };
  }

  // ---------------- Shops ----------------

  async listShopsAdmin(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.status === 'archived') where.isArchived = true;
    else if (query.status === 'active') where.isArchived = false;
    if (query.ownerId) where.ownerId = query.ownerId;

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, ...INSENSITIVE } },
        { address: { contains: query.search, ...INSENSITIVE } },
        { owner: { name: { contains: query.search, ...INSENSITIVE } } },
        { owner: { phone: { contains: query.search, ...INSENSITIVE } } },
      ];
    }

    const { field, order } = getSort(query);
    const [total, shops] = await Promise.all([
      prisma.shop.count({ where }),
      prisma.shop.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [field]: order } as Record<string, 'asc' | 'desc'>,
        include: {
          owner: { select: { id: true, name: true, phone: true, email: true } },
          subscriptions: { select: { id: true, plan: true, status: true, isActive: true, billingCycle: true, endDate: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);

    return { shops, total, page, limit };
  }

  async getShopAdmin(shopId: string) {
    // Spec 15.1 — shop profile + subscription only; no employees, sales,
    // inventory or customer data for the system owner.
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        owner: { select: { id: true, name: true, phone: true, email: true, isActive: true } },
        subscriptions: { select: { id: true, plan: true, status: true, isActive: true, billingCycle: true, startDate: true, endDate: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!shop) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Shop not found' };
    }

    return { ...shop, stats: { subscription: shop.subscriptions?.[0] ?? null } };
  }

  async setShopArchived(shopId: string, archived: boolean, actorId: string, ctx: AuditContext = {}) {
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Shop not found' };
    }

    const updated = await prisma.shop.update({ where: { id: shopId }, data: { isArchived: archived } });

    await auditService.log(actorId, archived ? 'SHOP_ARCHIVED' : 'SHOP_UNARCHIVED', {
      shopId,
      shopName: shop.name,
      ownerId: shop.ownerId,
    }, ctx);

    return updated;
  }

  // ---------------- Employees ----------------

  async listEmployeesAdmin(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.shopId) where.shopId = query.shopId;
    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;

    if (query.search) {
      where.OR = [
        { role: { contains: query.search, ...INSENSITIVE } },
        { user: { name: { contains: query.search, ...INSENSITIVE } } },
        { user: { phone: { contains: query.search, ...INSENSITIVE } } },
        { shop: { name: { contains: query.search, ...INSENSITIVE } } },
      ];
    }

    const { field, order } = getSort(query);
    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [field]: order } as Record<string, 'asc' | 'desc'>,
        include: {
          user: { select: { id: true, name: true, phone: true, email: true, isActive: true, lastLoginAt: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { employees, total, page, limit };
  }

  async getEmployeeAdmin(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, isActive: true, createdAt: true, lastLoginAt: true } },
        shop: { select: { id: true, name: true, address: true } },
      },
    });
    if (!employee) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Employee not found' };
    }

    return {
      ...employee,
      permissions: (employee.permissions as string[]) || [],
    };
  }

  async updateEmployeeStatus(employeeId: string, isActive: boolean, actorId: string, ctx: AuditContext = {}) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { user: true } });
    if (!employee) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Employee not found' };
    }

    const updated = await prisma.employee.update({ where: { id: employeeId }, data: { isActive } });
    await prisma.user.updateMany({ where: { id: employee.userId }, data: { isActive } });

    await auditService.log(actorId, 'EMPLOYEE_STATUS_CHANGED', {
      employeeId,
      employeeName: employee.user.name,
      shopId: employee.shopId,
      before: employee.isActive,
      after: isActive,
    }, ctx);

    return updated;
  }

  async resetEmployeePin(employeeId: string, actorId: string, ctx: AuditContext = {}) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { user: true, shop: true } });
    if (!employee) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Employee not found' };
    }
    if (!employee.user.phone) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Employee has no phone number on file' };
    }

    const code = generateOtp();
    const minutes = await settingsService.get('otpLifetimeMinutes');
    const appName = await settingsService.get('appName');
    await prisma.otp.create({
      data: {
        phone: employee.user.phone,
        code,
        purpose: 'PIN_RESET',
        expiresAt: new Date(Date.now() + minutes * 60 * 1000),
        userId: employee.user.id,
      },
    });

    await smsService.send(employee.user.phone, `${appName}: Your PIN reset OTP is ${code}. Valid for ${minutes} minutes. Open the app and set a new PIN.`, { purpose: 'EMPLOYEE_PIN_RESET', userId: employee.userId, shopId: employee.shopId });

    await auditService.log(actorId, 'EMPLOYEE_PIN_RESET', {
      employeeId,
      employeeName: employee.user.name,
      phone: employee.user.phone,
      shopId: employee.shopId,
    }, ctx);

    return { message: 'PIN reset OTP sent to the employee phone. The employee sets the new PIN in the app.' };
  }

  // ---------------- Sales ----------------

  async listSalesAdmin(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.shopId) where.shopId = query.shopId;

    if (query.from || query.to) {
      const { fromDate, toDate } = getDateRange(query.from, query.to);
      where.saleDate = { gte: fromDate, lte: toDate };
    }

    if (query.search) {
      where.OR = [
        { receiptNumber: { contains: query.search, ...INSENSITIVE } },
        { shop: { name: { contains: query.search, ...INSENSITIVE } } },
        { user: { name: { contains: query.search, ...INSENSITIVE } } },
        { customer: { name: { contains: query.search, ...INSENSITIVE } } },
      ];
    }

    const { field, order } = getSort(query, 'saleDate');
    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [field]: order } as Record<string, 'asc' | 'desc'>,
        include: {
          shop: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return { sales, total, page, limit };
  }

  async getSaleAdmin(saleId: string) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        shop: { select: { id: true, name: true, currency: true } },
        user: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
        items: {
          include: { product: { select: { id: true, name: true, sku: true } } },
        },
        creditPayments: true,
      },
    });
    if (!sale) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Sale not found' };
    }

    return {
      ...sale,
      paymentDetails: (sale.paymentDetails as Record<string, unknown>[]) || [],
    };
  }

  // ---------------- Revenue ----------------

  async getRevenue(query: AdminListQuery = {}) {
    const { fromDate, toDate } = getDateRange(query.from, query.to);
    const range = { gte: fromDate, lte: toDate };
    const completedWhere: Prisma.SaleWhereInput = { status: 'COMPLETED', deletedAt: null, saleDate: range };

    const [grossAgg, refundsAgg, voidsAgg, expenseAgg, outstandingAgg, byShopAgg, dailyRows, methodSales] = await Promise.all([
      prisma.sale.aggregate({ where: completedWhere, _count: { _all: true }, _sum: { grandTotal: true } }),
      prisma.sale.aggregate({ where: { status: 'REFUNDED', deletedAt: null, saleDate: range }, _sum: { grandTotal: true } }),
      prisma.sale.aggregate({ where: { status: 'VOIDED', deletedAt: null, saleDate: range }, _sum: { grandTotal: true } }),
      prisma.expense.aggregate({ where: { expenseDate: range, deletedAt: null }, _sum: { amount: true } }),
      prisma.customer.aggregate({ where: { isArchived: false }, _sum: { outstandingBalance: true } }),
      prisma.sale.groupBy({
        by: ['shopId'],
        where: completedWhere,
        _count: { _all: true },
        _sum: { grandTotal: true },
      }),
      prisma.$queryRaw`
        SELECT date_trunc('day', "saleDate")::date AS day,
               COUNT(*)::int AS orders,
               COALESCE(SUM("grandTotal"), 0)::float8 AS revenue
        FROM "Sale"
        WHERE "status" = 'COMPLETED' AND "deletedAt" IS NULL AND "saleDate" >= ${fromDate} AND "saleDate" <= ${toDate}
        GROUP BY 1 ORDER BY 1 ASC
      `,
      prisma.sale.findMany({ where: completedWhere, select: { paymentDetails: true } }),
    ]);

    const shops = await prisma.shop.findMany({
      where: { id: { in: byShopAgg.map((r) => r.shopId) } },
      select: { id: true, name: true },
    });
    const shopName = new Map(shops.map((s) => [s.id, s.name]));

    const gross = grossAgg._sum?.grandTotal || 0;
    const refunds = refundsAgg._sum?.grandTotal || 0;
    const voids = voidsAgg._sum?.grandTotal || 0;

    const methodMap = new Map<string, { amount: number; count: number }>();
    for (const sale of methodSales) {
      const payments = (sale.paymentDetails as Array<{ method?: string; amount?: number }> | null) || [];
      for (const payment of payments) {
        const key = payment.method || 'unknown';
        const entry = methodMap.get(key) || { amount: 0, count: 0 };
        entry.amount += payment.amount || 0;
        entry.count += 1;
        methodMap.set(key, entry);
      }
    }

    return {
      summary: {
        grossRevenue: gross,
        refunds,
        voids,
        netRevenue: gross - refunds - voids,
        orders: (grossAgg._count as { _all?: number } | undefined)?._all || 0,
        expenses: expenseAgg._sum?.amount || 0,
        outstandingCredit: outstandingAgg._sum?.outstandingBalance || 0,
      },
      byShop: byShopAgg.map((r) => ({
        shopId: r.shopId,
        shopName: shopName.get(r.shopId) || 'Unknown',
        revenue: r._sum?.grandTotal || 0,
        orders: (r._count as { _all?: number } | undefined)?._all || 0,
      })),
      byMethod: Array.from(methodMap.entries()).map(([method, v]) => ({
        method,
        amount: v.amount,
        count: v.count,
      })),
      daily: (dailyRows as Array<{ day: Date; orders: number; revenue: number }>).map((r) => ({
        date: r.day.toISOString().slice(0, 10),
        orders: r.orders,
        revenue: r.revenue,
      })),
    };
  }

  // ---------------- Reports ----------------

  async salesReport(query: AdminListQuery = {}) {
    const revenue = await this.getRevenue(query);
    return revenue;
  }

  async agentsReport() {
    const agents = await prisma.agent.findMany({
      where: { deletedAt: null },
      select: { id: true, username: true, name: true, phone: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    const users = await prisma.user.findMany({
      where: { role: 'BUSINESS_OWNER', agentId: { not: null }, deletedAt: null },
      select: { id: true, agentId: true, isActive: true, ownedShops: { select: { id: true } } },
    });

    // Spec 15.1 — agent performance is referral-based (onboarded owners/shops),
    // never shop sales revenue.
    return {
      summary: {
        totalAgents: agents.length,
        totalOnboarded: users.length,
      },
      data: agents.map((agent) => {
        const agentUsers = users.filter((u) => u.agentId === agent.id);
        const shops = agentUsers.reduce((s, u) => s + u.ownedShops.length, 0);
        return {
          agentId: agent.id,
          username: agent.username,
          name: agent.name,
          phone: agent.phone,
          isActive: agent.isActive,
          onboarded: agentUsers.length,
          activeOwners: agentUsers.filter((u) => u.isActive).length,
          shops,
          createdAt: agent.createdAt,
        };
      }),
    };
  }

  async ownersReport(_query: AdminListQuery = {}) {
    const owners = await prisma.user.findMany({
      where: { role: 'BUSINESS_OWNER', deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        agent: { select: { name: true } },
        ownedShops: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ownerIds = owners.map((o) => o.id);
    const [salesAgg, shopCounts] = await Promise.all([
      ownerIds.length
        ? prisma.sale.groupBy({
            by: ['userId'],
            where: { userId: { in: ownerIds }, status: 'COMPLETED', deletedAt: null },
            _count: { _all: true },
            _sum: { grandTotal: true },
          })
        : Promise.resolve([]),
      prisma.shop.groupBy({ by: ['ownerId'], where: { ownerId: { in: ownerIds } }, _count: { _all: true } }),
    ]);

    const salesByUser = new Map(salesAgg.map((r) => [r.userId, r]));
    const shopMap = new Map(shopCounts.map((r) => [r.ownerId, r._count._all]));

    return {
      summary: {
        totalOwners: owners.length,
        activeOwners: owners.filter((o) => o.isActive).length,
        totalRevenue: salesAgg.reduce((s, r) => s + (r._sum.grandTotal || 0), 0),
        totalTransactions: salesAgg.reduce((s, r) => s + (r._count._all || 0), 0),
      },
      data: owners.map((o) => ({
        ownerId: o.id,
        name: o.name,
        phone: o.phone,
        email: o.email,
        isActive: o.isActive,
        agentName: o.agent?.name || null,
        shops: shopMap.get(o.id) || 0,
        transactions: salesByUser.get(o.id)?._count._all || 0,
        revenue: salesByUser.get(o.id)?._sum.grandTotal || 0,
        lastLoginAt: o.lastLoginAt,
        createdAt: o.createdAt,
      })),
    };
  }

  async employeesReport(query: AdminListQuery = {}) {
    const { fromDate, toDate } = getDateRange(query.from, query.to);

    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { id: true, name: true } },
        shop: { select: { id: true, name: true } },
      },
    });

    const employeeUserIds = employees.map((e) => e.user.id);
    const sales = employeeUserIds.length
      ? await prisma.sale.findMany({
          where: { userId: { in: employeeUserIds }, status: 'COMPLETED', deletedAt: null, saleDate: { gte: fromDate, lte: toDate } },
          select: { userId: true, grandTotal: true },
        })
      : [];

    const stats = new Map<string, { transactions: number; revenue: number }>();
    for (const sale of sales) {
      const entry = stats.get(sale.userId) || { transactions: 0, revenue: 0 };
      entry.transactions += 1;
      entry.revenue += sale.grandTotal;
      stats.set(sale.userId, entry);
    }

    const data = employees.map((e) => ({
      employeeId: e.id,
      name: e.user.name,
      role: e.role,
      shopId: e.shop.id,
      shopName: e.shop.name,
      isActive: e.isActive,
      transactions: stats.get(e.user.id)?.transactions || 0,
      revenue: stats.get(e.user.id)?.revenue || 0,
    }));

    return {
      summary: {
        totalEmployees: employees.length,
        totalRevenue: sales.reduce((s, x) => s + x.grandTotal, 0),
        totalTransactions: sales.length,
      },
      data,
    };
  }

  // ---------------- Activity Logs ----------------

  async listActivityLogs(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = {};

    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;
    if (query.shopId) where.shopId = query.shopId;
    if (query.from || query.to) {
      const { fromDate, toDate } = getDateRange(query.from, query.to);
      where.createdAt = { gte: fromDate, lte: toDate };
    }
    if (query.search) {
      where.OR = [
        { action: { contains: query.search, ...INSENSITIVE } },
        { user: { name: { contains: query.search, ...INSENSITIVE } } },
        { shop: { name: { contains: query.search, ...INSENSITIVE } } },
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, username: true, role: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { logs, total, page, limit };
  }

  // ---------------- Notifications ----------------

  async listAdminNotifications(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = {};

    if (query.shopId) where.shopId = query.shopId;
    if (query.isRead === 'true') where.isRead = true;
    else if (query.isRead === 'false') where.isRead = false;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, ...INSENSITIVE } },
        { body: { contains: query.search, ...INSENSITIVE } },
      ];
    }

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { notifications, total, page, limit };
  }

  async createAdminNotification(
    data: { title: string; body: string; type?: string; target?: 'all_owners' | 'all_agents' | 'shop' | 'user'; shopId?: string; userId?: string },
    actorId: string,
    ctx: AuditContext = {}
  ) {
    const { title, body, type = 'ADMIN', target = 'all_owners', shopId, userId } = data;

    let count = 0;
    if (target === 'user' && userId) {
      await prisma.notification.create({ data: { userId, shopId, title, body, type, isSent: false } });
      count = 1;
    } else if (target === 'shop' && shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { ownerId: true } });
      if (!shop) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Shop not found' };
      }
      await prisma.notification.create({ data: { userId: shop.ownerId, shopId, title, body, type, isSent: false } });
      count = 1;
    } else if (target === 'all_agents') {
      const agents = await prisma.user.findMany({
        where: { role: 'AGENT', isActive: true, deletedAt: null },
        select: { id: true },
      });
      if (agents.length) {
        await prisma.notification.createMany({
          data: agents.map((a) => ({ userId: a.id, title, body, type, isSent: false })),
        });
      }
      count = agents.length;
    } else {
      const owners = await prisma.user.findMany({
        where: { role: 'BUSINESS_OWNER', isActive: true, deletedAt: null },
        select: { id: true },
      });
      if (owners.length) {
        await prisma.notification.createMany({
          data: owners.map((o) => ({ userId: o.id, title, body, type, isSent: false })),
        });
      }
      count = owners.length;
    }

    await auditService.log(actorId, 'NOTIFICATION_CREATED', {
      title,
      target,
      recipients: count,
    }, ctx);

    return { message: 'Notification created', recipients: count };
  }

  // ---------------- Support Center ----------------

  async listSupportTickets(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.shopId) where.shopId = query.shopId;
    if (query.search) {
      where.OR = [
        { subject: { contains: query.search, ...INSENSITIVE } },
        { message: { contains: query.search, ...INSENSITIVE } },
        { user: { name: { contains: query.search, ...INSENSITIVE } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, phone: true, role: true } },
          shop: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    const assignedIds = [...new Set(tickets.map((t) => t.assignedTo).filter(Boolean))] as string[];
    const assignees = assignedIds.length
      ? await prisma.agent.findMany({ where: { id: { in: assignedIds } }, select: { id: true, name: true, username: true } })
      : [];
    const assigneeMap = new Map(assignees.map((a) => [a.id, a]));

    const enriched = tickets.map((t) => ({
      ...t,
      assignee: t.assignedTo ? (assigneeMap.get(t.assignedTo) ?? null) : null,
    }));

    return { tickets: enriched, total, page, limit };
  }

  async createSupportTicket(
    data: { subject: string; message: string; priority?: string; userId?: string; shopId?: string },
    actorId: string,
    ctx: AuditContext = {}
  ) {
    const ticket = await prisma.supportTicket.create({
      data: {
        subject: data.subject,
        message: data.message,
        priority: data.priority || 'MEDIUM',
        userId: data.userId,
        shopId: data.shopId,
        createdBy: actorId,
        messages: {
          create: [{ senderId: actorId, content: data.message }],
        },
      },
    });

    await auditService.log(actorId, 'SUPPORT_TICKET_CREATED', {
      ticketId: ticket.id,
      subject: ticket.subject,
    }, ctx);

    return ticket;
  }

  async updateSupportTicketStatus(ticketId: string, status: string, actorId: string, ctx: AuditContext = {}) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Support ticket not found' };
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        resolvedBy: status === 'RESOLVED' || status === 'CLOSED' ? actorId : null,
        resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null,
      },
    });

    if (ticket.userId && ticket.userId !== actorId) {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          title: 'Support ticket update',
          body: `Your ticket "${ticket.subject}" is now ${status.toLowerCase()}.`,
          type: 'SUPPORT',
          isSent: false,
        },
      });
    }

    await auditService.log(actorId, 'SUPPORT_TICKET_STATUS_CHANGED', {
      ticketId,
      before: ticket.status,
      after: status,
    }, ctx);

    return updated;
  }

  async getSupportTicket(ticketId: string) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, name: true, phone: true, role: true } },
        shop: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    if (!ticket) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Support ticket not found' };
    }

    let assignee = null;
    if (ticket.assignedTo) {
      assignee = await prisma.agent.findUnique({
        where: { id: ticket.assignedTo },
        select: { id: true, name: true, username: true },
      });
    }

    return { ...ticket, assignee };
  }

  async addTicketMessage(ticketId: string, actorId: string, content: string, ctx: AuditContext = {}) {
    if (!content?.trim()) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Message cannot be empty' };
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true, subject: true, status: true },
    });
    if (!ticket) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Support ticket not found' };
    }
    if (ticket.status === 'CLOSED') {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Cannot reply to a closed ticket' };
    }

    const message = await prisma.supportMessage.create({
      data: { ticketId, senderId: actorId, content: content.trim() },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    if (ticket.userId && ticket.userId !== actorId) {
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          title: 'Support reply',
          body: `New reply on your ticket "${ticket.subject}".`,
          type: 'SUPPORT',
          isSent: false,
        },
      });
    }

    await auditService.log(actorId, 'SUPPORT_TICKET_MESSAGE_ADDED', { ticketId, messageId: message.id }, ctx);

    return message;
  }

  async assignTicket(ticketId: string, assignedTo: string, actorId: string, ctx: AuditContext = {}) {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Support ticket not found' };
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedTo },
    });

    await auditService.log(actorId, 'SUPPORT_TICKET_ASSIGNED', {
      ticketId,
      before: ticket.assignedTo,
      after: assignedTo,
    }, ctx);

    return updated;
  }

  // ---------------- Subscription Plans ----------------

  async listPlans() {
    return prisma.subscriptionPlan.findMany({
      where: { deletedAt: null },
      orderBy: [{ displayOrder: 'asc' }, { price: 'asc' }],
    });
  }

  async createPlan(data: { name: string; description?: string; price?: number; billingCycle?: string; features?: string[]; limits?: Record<string, unknown>; isActive?: boolean; isDefault?: boolean; displayOrder?: number }, actorId: string, ctx: AuditContext = {}) {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price || 0,
        billingCycle: data.billingCycle || 'MONTHLY',
        features: (data.features || []) as Prisma.InputJsonValue,
        limits: (data.limits || {}) as Prisma.InputJsonValue,
        isActive: data.isActive ?? true,
        isDefault: data.isDefault ?? false,
        displayOrder: data.displayOrder ?? 0,
        createdBy: actorId,
      },
    });

    await auditService.log(actorId, 'SUBSCRIPTION_PLAN_CREATED', {
      plan: { id: plan.id, name: plan.name, price: plan.price },
    }, ctx);

    return plan;
  }

  async updatePlan(planId: string, data: { name?: string; description?: string; price?: number; billingCycle?: string; features?: string[]; limits?: Record<string, unknown>; isActive?: boolean; isDefault?: boolean; displayOrder?: number }, actorId: string, ctx: AuditContext = {}) {
    const before = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!before) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Plan not found' };
    }

    const plan = await prisma.subscriptionPlan.update({ where: { id: planId }, data: { ...data, features: (data.features as Prisma.InputJsonValue) ?? undefined, limits: (data.limits as Prisma.InputJsonValue) ?? undefined } });

    await auditService.log(actorId, 'SUBSCRIPTION_PLAN_UPDATED', {
      planId,
      before: pick(before as unknown as Record<string, unknown>, ['name', 'description', 'price', 'billingCycle', 'isActive']),
      after: pick(plan as unknown as Record<string, unknown>, ['name', 'description', 'price', 'billingCycle', 'isActive']),
    }, ctx);

    return plan;
  }

  async deletePlan(planId: string, actorId: string, ctx: AuditContext = {}) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Plan not found' };
    }

    const updated = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: { deletedAt: new Date(), isActive: false, isDefault: false, name: `${plan.name} (deleted ${Date.now()})` },
    });

    await auditService.log(actorId, 'SUBSCRIPTION_PLAN_DELETED', {
      plan: { id: planId, name: plan.name },
    }, ctx);

    return updated;
  }

  // ---------------- Subscriptions ----------------

  async listSubscriptions(query: AdminListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.plan) where.plan = query.plan;
    if (query.search) {
      where.OR = [
        { shop: { name: { contains: query.search, ...INSENSITIVE } } },
        { shop: { owner: { name: { contains: query.search, ...INSENSITIVE } } } },
      ];
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              isArchived: true,
              owner: { select: { id: true, name: true, phone: true } },
            },
          },
          planConfig: true,
          payments: { orderBy: { paidAt: 'desc' } },
        },
      }),
    ]);

    return { subscriptions, total, page, limit };
  }

  async updateSubscription(subscriptionId: string, data: { plan?: string; planId?: string; status?: string; endDate?: string; isActive?: boolean; billingCycle?: string; autoRenew?: boolean }, actorId: string, ctx: AuditContext = {}) {
    const before = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!before) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Subscription not found' };
    }

    const updateData: Record<string, unknown> = {
      plan: data.plan,
      planId: data.planId,
      status: data.status,
      isActive: data.isActive,
      billingCycle: data.billingCycle,
      autoRenew: data.autoRenew,
    };
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const subscription = await prisma.subscription.update({ where: { id: subscriptionId }, data: updateData as Prisma.SubscriptionUncheckedUpdateInput, include: { planConfig: true, shop: { select: { id: true, name: true } } } });

    await auditService.log(actorId, 'SUBSCRIPTION_UPDATED', {
      subscriptionId,
      before: pick(before as unknown as Record<string, unknown>, ['plan', 'status', 'isActive', 'endDate']),
      after: pick(subscription as unknown as Record<string, unknown>, ['plan', 'status', 'isActive', 'endDate']),
    }, ctx);

    return subscription;
  }

  async getSubscriptionStats() {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [subscriptions, payments] = await Promise.all([
      prisma.subscription.findMany({
        include: { planConfig: { select: { name: true } } },
      }),
      prisma.subscriptionPayment.findMany({
        select: {
          amount: true,
          paidAt: true,
          subscription: { select: { billingCycle: true, planConfig: { select: { name: true } } } },
        },
      }),
    ]);

    const active = subscriptions.filter((s) => s.isActive && (!s.endDate || s.endDate >= now));
    const lapsed = subscriptions.filter((s) => !s.isActive || (s.endDate && s.endDate < now));
    const expiringSoon = subscriptions.filter(
      (s) => s.isActive && s.endDate && s.endDate >= now && s.endDate <= in7Days
    );

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

    const byPlanMap = new Map<string, number>();
    const byCycleMap = new Map<string, number>();
    for (const p of payments) {
      const planName = p.subscription?.planConfig?.name || 'Unknown';
      const cycle = p.subscription?.billingCycle || 'MONTHLY';
      byPlanMap.set(planName, (byPlanMap.get(planName) || 0) + p.amount);
      byCycleMap.set(cycle, (byCycleMap.get(cycle) || 0) + p.amount);
    }

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: active.length,
      lapsedSubscriptions: lapsed.length,
      expiringSoon: expiringSoon.length,
      totalRevenue,
      byPlan: Array.from(byPlanMap.entries()).map(([plan, revenue]) => ({ plan, revenue })),
      byBillingCycle: Array.from(byCycleMap.entries()).map(([cycle, revenue]) => ({ cycle, revenue })),
    };
  }

  // ---------------- Demo Accounts ----------------

  async listDemoAccounts() {
    const [owners, employees, agents] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'BUSINESS_OWNER', deletedAt: null },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          isActive: true,
          isPinSet: true,
          agent: { select: { name: true } },
          ownedShops: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.employee.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          role: true,
          permissions: true,
          isActive: true,
          user: { select: { id: true, name: true, phone: true } },
          shop: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.agent.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          username: true,
          name: true,
          phone: true,
          isActive: true,
          _count: { select: { onboardedUsers: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // SECURITY: never expose passwords or PINs (even placeholder demo values)
    // from an API response.
    return {
      agents: agents.map((a) => ({
        ...a,
        role: 'AGENT',
        username: a.username,
      })),
      owners: owners.map((o) => ({
        id: o.id,
        name: o.name,
        phone: o.phone,
        email: o.email,
        isActive: o.isActive,
        isPinSet: o.isPinSet,
        agentName: o.agent?.name || null,
        shops: o.ownedShops,
        role: 'BUSINESS_OWNER',
      })),
      employees: employees.map((e) => ({
        id: e.id,
        name: e.user.name,
        phone: e.user.phone,
        role: e.role,
        shopName: e.shop.name,
        isActive: e.isActive,
        permissions: (e.permissions as string[]) || [],
        roleType: 'EMPLOYEE',
      })),
    };
  }

  // ---------------- System Settings ----------------

  async getAllSettings() {
    await settingsService.ensureDefaults();
    const settings = await settingsService.load();
    return { settings };
  }

  async updateSettings(updates: Record<string, unknown>, actorId: string, ctx: AuditContext = {}) {
    await settingsService.ensureDefaults();
    const before = await prisma.systemSetting.findMany({ where: { key: { in: Object.keys(updates) } } });
    const beforeMap: Record<string, unknown> = {};
    for (const s of before) beforeMap[s.key] = s.value;

    const afterMap: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: value as Prisma.InputJsonValue, updatedBy: actorId },
        create: { key, value: value as Prisma.InputJsonValue, updatedBy: actorId },
      });
      afterMap[key] = value;
    }

    await auditService.log(actorId, 'SYSTEM_SETTINGS_UPDATED', { before: beforeMap, after: afterMap }, ctx);

    settingsService.invalidate();
    const all = await settingsService.load();
    return { settings: all };
  }

  // ---------------- Platform Stats (Dashboard) ----------------

  /**
   * Platform-level stats for the System Owner. Deliberately excludes shop sales,
   * inventory, customers and employees — those are private to the Business Owner
   * (Spec 15.1). Only AGAC/subscription metrics are returned.
   */
  async getPlatformStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalBusinesses, totalAgents, activeAgents, deactivatedAgents, totalShops,
      totalSubscriptions, activeSubscriptions,
      totalRevenueAgg, monthlyRevenueAgg, pendingTickets,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'BUSINESS_OWNER', deletedAt: null } }),
      prisma.agent.count({ where: { deletedAt: null } }),
      prisma.agent.count({ where: { deletedAt: null, isActive: true } }),
      prisma.agent.count({ where: { OR: [{ isActive: false }, { deletedAt: { not: null } }] } }),
      prisma.shop.count({ where: { isArchived: false } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { isActive: true } }),
      prisma.subscriptionPayment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.subscriptionPayment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      totalBusinesses,
      totalAgents,
      activeAgents,
      deactivatedAgents,
      totalShops,
      totalSubscriptions,
      activeSubscriptions,
      totalSubscriptionRevenue: totalRevenueAgg._sum.amount || 0,
      monthlySubscriptionRevenue: monthlyRevenueAgg._sum.amount || 0,
      pendingTickets,
    };
  }

  /**
   * Comprehensive System Owner dashboard (Spec 15.1). Subscription revenue only —
   * never shop sales. Cached for 60 seconds per granularity.
   */
  async getDashboard(granularity: Granularity = 'daily') {
    const CACHE_MS = 60 * 1000;
    const startedAt = Date.now();
    if (dashboardCache.at && startedAt - dashboardCache.at < CACHE_MS && dashboardCache.byGranularity[granularity]) {
      return dashboardCache.byGranularity[granularity];
    }

    const now = new Date();
    const nowMs = now.getTime();
    const DAY = 24 * 60 * 60 * 1000;
    const GRACE_DAYS = 5;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const since = new Date(nowMs - 365 * DAY);

    const [stats, totalRevAgg, monthlyRevAgg, subs, paymentsByDay, referredPaidRows, failedPayments, recentLogs, recentPayments] = await Promise.all([
      this.getPlatformStats(),
      prisma.subscriptionPayment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.subscriptionPayment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.subscription.findMany({ select: { id: true, plan: true, billingCycle: true, isActive: true, endDate: true } }),
      prisma.$queryRaw`
        SELECT date_trunc('day', "paidAt")::date AS day,
               COALESCE(SUM("amount"), 0)::float8 AS revenue
        FROM "SubscriptionPayment"
        WHERE "status" = 'COMPLETED' AND "paidAt" >= ${since}
        GROUP BY 1 ORDER BY 1 ASC
      `,
      prisma.$queryRaw`
        SELECT COUNT(DISTINCT u.id)::int AS count
        FROM "User" u
        JOIN "Shop" s ON s."ownerId" = u.id
        JOIN "Subscription" sub ON sub."shopId" = s.id
        JOIN "SubscriptionPayment" p ON p."subscriptionId" = sub.id
        WHERE u."role" = 'BUSINESS_OWNER' AND u."agentId" IS NOT NULL
          AND u."deletedAt" IS NULL AND p."status" = 'COMPLETED'
      `,
      prisma.subscriptionPayment.count({ where: { status: { not: 'COMPLETED' } } }),
      prisma.activityLog.findMany({
        where: { action: { in: Object.keys(BUSINESS_EVENT_ACTIONS) } },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, action: true, createdAt: true, user: { select: { name: true } }, shop: { select: { name: true } } },
      }),
      prisma.subscriptionPayment.findMany({
        orderBy: { paidAt: 'desc' },
        take: 8,
        select: { id: true, amount: true, method: true, paidAt: true, subscription: { select: { plan: true, shop: { select: { name: true } } } } },
      }),
    ]);

    const health = { active: 0, grace: 0, lapsed: 0 };
    const breakdown = { basic: 0, premium: 0, monthly: 0, weekly: 0, daily: 0, yearly: 0 };
    for (const s of subs) {
      const end = s.endDate ? new Date(s.endDate).getTime() : null;
      if (!s.isActive) health.lapsed += 1;
      else if (end == null || end >= nowMs) health.active += 1;
      else if (nowMs <= end + GRACE_DAYS * DAY) health.grace += 1;
      else health.lapsed += 1;

      const plan = (s.plan || '').toLowerCase();
      if (plan.includes('premium')) breakdown.premium += 1;
      else breakdown.basic += 1;

      const cycle = (s.billingCycle || 'MONTHLY').toUpperCase();
      if (cycle === 'DAILY') breakdown.daily += 1;
      else if (cycle === 'WEEKLY') breakdown.weekly += 1;
      else if (cycle === 'YEARLY') breakdown.yearly += 1;
      else breakdown.monthly += 1;
    }

    const totalHealth = health.active + health.grace + health.lapsed;
    const churnRate = totalHealth ? Math.round((health.lapsed / totalHealth) * 1000) / 10 : 0;

    const [paidCommissionAgg, pendingCommissionAgg] = await Promise.all([
      prisma.commission.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.commission.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    ]);
    const commissionsPaid = Math.round((paidCommissionAgg._sum.amount || 0) * 100) / 100;
    const pendingPayouts = Math.round((pendingCommissionAgg._sum.amount || 0) * 100) / 100;
    void referredPaidRows;

    const totalRevenue = totalRevAgg._sum.amount || 0;
    const monthlyRevenue = monthlyRevAgg._sum.amount || 0;

    const threeDays = nowMs + 3 * DAY;
    const expiringSoon = subs.filter(
      (s) => s.isActive && s.endDate && new Date(s.endDate).getTime() >= nowMs && new Date(s.endDate).getTime() <= threeDays
    ).length;

    const trendPoints = bucketRevenueTrend(
      (paymentsByDay as Array<{ day: Date; revenue: number }>) || [],
      granularity
    );

    const activity = [
      ...recentPayments.map((p) => ({
        id: `pay-${p.id}`,
        type: 'payment' as const,
        title: 'Payment received',
        subtitle: `${p.subscription?.shop?.name || 'Shop'} · ${p.method} · ${Math.round(p.amount).toLocaleString()} TZS`,
        at: p.paidAt,
      })),
      ...recentLogs.map((l) => ({
        id: `log-${l.id}`,
        type: 'event' as const,
        title: BUSINESS_EVENT_ACTIONS[l.action] || l.action.replace(/_/g, ' '),
        subtitle: l.shop?.name || l.user?.name || 'Platform',
        at: l.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8);

    const data = {
      platform: {
        totalBusinessOwners: stats.totalBusinesses,
        totalAgents: stats.totalAgents,
        activeAgents: stats.activeAgents,
        deactivatedAgents: stats.deactivatedAgents,
        totalShops: stats.totalShops,
        activeSubscriptions: stats.activeSubscriptions,
        totalSubscriptions: stats.totalSubscriptions,
      },
      money: {
        totalRevenue,
        monthlyRevenue,
        commissionsPaid,
        netIncome: Math.max(0, Math.round(totalRevenue - commissionsPaid)),
      },
      revenueTrend: { granularity, points: trendPoints },
      actionRequired: {
        expiringSoon,
        gracePeriod: health.grace,
        pendingPayouts,
        failedPayments,
      },
      breakdown,
      health: { ...health, total: totalHealth, churnRate },
      recentActivity: activity,
      generatedAt: new Date().toISOString(),
    };

    dashboardCache = { at: startedAt, byGranularity: { ...dashboardCache.byGranularity, [granularity]: data } };
    return data;
  }

  // Legacy (kept for compatibility)
  async onboardBusinessOwner(
    data: { phone: string; name: string; email?: string; shopName: string; shopAddress?: string; region?: string; district?: string; ward?: string; street?: string; businessCategory?: string },
    agentId: string
  ) {
    const existingUser = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existingUser) {
      throw { status: 409, code: 'CONFLICT', message: 'A user with this phone already exists' };
    }

    const user = await prisma.user.create({
      data: {
        phone: data.phone,
        name: data.name,
        email: data.email,
        role: 'BUSINESS_OWNER',
        isPinSet: false,
        isPhoneVerified: false,
        agentId,
      },
    });

    const shop = await prisma.shop.create({
      data: {
        ownerId: user.id,
        name: data.shopName,
        address: data.shopAddress,
        region: data.region,
        district: data.district,
        ward: data.ward,
        street: data.street,
        businessCategory: data.businessCategory,
        currency: 'TZS',
      },
    });

    await prisma.subscription.create({
      data: { shopId: shop.id, plan: 'basic', status: 'active' },
    });

    const defaultCategories = [
      'Grocery', 'Drinks', 'Food', 'Cosmetics', 'Electronics',
      'Hardware', 'Pharmacy', 'Agriculture', 'Stationery',
    ];

    await prisma.category.createMany({
      data: defaultCategories.map((name) => ({
        shopId: shop.id,
        name,
        isDefault: true,
      })),
    });

    // Spec 4.7 — activation OTP on agent-led registration.
    const onboardCode = generateOtp();
    const onboardMinutes = await settingsService.get('otpLifetimeMinutes');
    const onboardAppName = await settingsService.get('appName');
    await prisma.otp.create({
      data: {
        phone: data.phone,
        code: onboardCode,
        purpose: 'OWNER_ACTIVATION',
        expiresAt: new Date(Date.now() + onboardMinutes * 60 * 1000),
        userId: user.id,
      },
    });
    await smsService.send(
      data.phone,
      `${onboardAppName}: Your "${data.shopName}" activation code is ${onboardCode}. Valid for ${onboardMinutes} minutes. Enter it in the app to activate your account.`,
      { purpose: 'OWNER_ACTIVATION', userId: user.id, shopId: shop.id }
    );

    return { user, shop };
  }

  async listAgentBusinesses(agentId: string) {
    const users = await prisma.user.findMany({
      where: { agentId, role: 'BUSINESS_OWNER' },
      include: {
        ownedShops: { select: { id: true, name: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }
}

export const adminService = new AdminService();