import prisma from '../config/database';
import { auditService, AuditContext } from './audit.service';
import { getPagination, getSort } from '../utils/pagination.util';
import { hashPassword, comparePassword } from '../utils/bcrypt.util';

const INSENSITIVE = { mode: 'insensitive' as const };

export interface AgentPortalListQuery {
  [key: string]: string | undefined;
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  from?: string;
  to?: string;
}

export interface AgentBusiness {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isActive: boolean;
  isPinSet: boolean;
  createdAt: string;
  agentId: string;
  ownedShops: Array<{
    id: string;
    name: string;
    address: string | null;
    isArchived: boolean;
    createdAt: string;
    _count: { employees: number; products: number };
  }>;
  _count: {
    ownedShops: number;
    sales: number;
  };
  lastActivity?: string | null;
}

export interface AgentStats {
  totalBusinesses: number;
  activeBusinesses: number;
  inactiveBusinesses: number;
  pendingBusinesses: number;
  totalShops: number;
  businessesThisMonth: number;
  businessesThisYear: number;
  shopsThisMonth: number;
  shopsThisYear: number;
}

export class AgentPortalService {
  async getDashboardStats(agentId: string): Promise<AgentStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalBusinesses,
      activeBusinesses,
      inactiveBusinesses,
      pendingBusinesses,
      totalShops,
      businessesThisMonth,
      businessesThisYear,
      shopsThisMonth,
      shopsThisYear,
    ] = await Promise.all([
      prisma.user.count({ where: { agentId, role: 'BUSINESS_OWNER', deletedAt: null } }),
      prisma.user.count({ where: { agentId, role: 'BUSINESS_OWNER', isActive: true, deletedAt: null } }),
      prisma.user.count({ where: { agentId, role: 'BUSINESS_OWNER', isActive: false, deletedAt: null } }),
      prisma.user.count({
        where: { agentId, role: 'BUSINESS_OWNER', isActive: true, isPinSet: false, deletedAt: null },
      }),
      prisma.shop.count({
        where: { owner: { agentId, role: 'BUSINESS_OWNER' }, isArchived: false, deletedAt: null },
      }),
      prisma.user.count({
        where: { agentId, role: 'BUSINESS_OWNER', deletedAt: null, createdAt: { gte: startOfMonth } },
      }),
      prisma.user.count({
        where: { agentId, role: 'BUSINESS_OWNER', deletedAt: null, createdAt: { gte: startOfYear } },
      }),
      prisma.shop.count({
        where: { owner: { agentId, role: 'BUSINESS_OWNER' }, isArchived: false, deletedAt: null, createdAt: { gte: startOfMonth } },
      }),
      prisma.shop.count({
        where: { owner: { agentId, role: 'BUSINESS_OWNER' }, isArchived: false, deletedAt: null, createdAt: { gte: startOfYear } },
      }),
    ]);

    return {
      totalBusinesses,
      activeBusinesses,
      inactiveBusinesses,
      pendingBusinesses,
      totalShops,
      businessesThisMonth,
      businessesThisYear,
      shopsThisMonth,
      shopsThisYear,
    };
  }

  async listAgentBusinesses(agentId: string, query: AgentPortalListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const { field, order } = getSort(query, 'createdAt', 'desc');

    const where: Record<string, unknown> = {
      agentId,
      role: 'BUSINESS_OWNER',
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, ...INSENSITIVE } },
        { phone: { contains: query.search, ...INSENSITIVE } },
        { email: { contains: query.search, ...INSENSITIVE } },
      ];
    }

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;
    else if (query.status === 'pending') {
      where.isActive = true;
      where.isPinSet = false;
    }

    const [total, businesses] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [field]: order } as Record<string, 'asc' | 'desc'>,
        include: {
          ownedShops: {
            where: { isArchived: false, deletedAt: null },
            select: {
              id: true,
              name: true,
              address: true,
              isArchived: true,
              createdAt: true,
              _count: { select: { employees: true, products: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { ownedShops: true, sales: true } },
        },
      }),
    ]);

    const businessesWithActivity = await Promise.all(
      businesses.map(async (b) => {
        const lastActivity = await prisma.activityLog.findFirst({
          where: { userId: b.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });
        const shopData = b.ownedShops.map(s => ({
          id: s.id,
          name: s.name,
          address: s.address,
          isArchived: s.isArchived,
          createdAt: s.createdAt.toISOString(),
          _count: s._count,
        }));
        return {
          id: b.id,
          name: b.name,
          phone: b.phone,
          email: b.email,
          isActive: b.isActive,
          isPinSet: b.isPinSet,
          createdAt: b.createdAt.toISOString(),
          agentId: b.agentId,
          ownedShops: shopData,
          _count: b._count,
          lastActivity: lastActivity?.createdAt?.toISOString() ?? null,
        } as AgentBusiness;
      })
    );

    return { businesses: businessesWithActivity, total, page, limit };
  }

  async getBusinessDetail(agentId: string, businessId: string) {
    const business = await prisma.user.findFirst({
      where: { id: businessId, agentId, role: 'BUSINESS_OWNER', deletedAt: null },
      include: {
        agent: { select: { id: true, name: true, username: true } },
        ownedShops: {
          where: { isArchived: false, deletedAt: null },
          select: {
            id: true,
            name: true,
            address: true,
            currency: true,
            isArchived: true,
            createdAt: true,
            _count: { select: { employees: true, products: true, sales: true } },
            subscriptions: { select: { plan: true, status: true, isActive: true, endDate: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { ownedShops: true, sales: true } },
      },
    });

    if (!business) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Business not found' };
    }

    const onboardingActivity = await prisma.activityLog.findFirst({
      where: { userId: businessId, action: { startsWith: 'BUSINESS_' } },
      orderBy: { createdAt: 'asc' },
      select: { action: true, details: true, createdAt: true },
    });

    const recentActivity = await prisma.activityLog.findMany({
      where: { userId: businessId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, action: true, details: true, createdAt: true, shopId: true },
    });

    const stats = await prisma.shop.aggregate({
      where: { ownerId: businessId, isArchived: false, deletedAt: null },
      _count: { id: true },
    });

    const totalEmployees = await prisma.employee.count({
      where: { shop: { ownerId: businessId, isArchived: false, deletedAt: null }, isActive: true, deletedAt: null },
    });

    return {
      id: business.id,
      name: business.name,
      phone: business.phone,
      email: business.email,
      isActive: business.isActive,
      isPinSet: business.isPinSet,
      createdAt: business.createdAt,
      agentId: business.agentId,
      ownedShops: business.ownedShops,
      _count: business._count,
      onboardingInfo: {
        onboardedBy: business.agent?.name ?? 'Unknown',
        onboardedAt: business.createdAt,
        onboardingAction: onboardingActivity?.action ?? null,
        onboardingDetails: onboardingActivity?.details ?? null,
      },
      recentActivity,
      stats: {
        totalShops: stats._count.id,
        totalEmployees,
        totalSales: business._count?.sales ?? 0,
      },
    };
  }

  async getAgentProfile(agentId: string) {
    const [agent, stats] = await Promise.all([
      prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          id: true,
          username: true,
          name: true,
          phone: true,
          email: true,
          isActive: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { onboardedUsers: true } },
        },
      }),
      prisma.user.count({ where: { agentId, role: 'BUSINESS_OWNER', deletedAt: null } }),
    ]);

    if (!agent) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Agent not found' };
    }

    const totalShops = await prisma.shop.count({
      where: { owner: { agentId, role: 'BUSINESS_OWNER' }, isArchived: false, deletedAt: null },
    });

    return {
      ...agent,
      stats: { onboardedBusinesses: stats, totalShops },
    };
  }

  async updateAgentProfile(
    agentId: string,
    data: { name?: string; phone?: string; email?: string },
    actorId: string,
    ctx: AuditContext = {}
  ) {
    const before = await prisma.agent.findUnique({ where: { id: agentId }, select: { name: true, phone: true, email: true } });
    if (!before) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Agent not found' };
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data,
    });

    await prisma.user.updateMany({
      where: { agentId },
      data,
    });

    await auditService.log(actorId, 'AGENT_PROFILE_UPDATED', { before, after: data }, ctx);

    return agent;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, ctx: AuditContext = {}) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Account not found' };
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Current password is incorrect' };
    }

    const hashed = await hashPassword(newPassword);

    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });
    if (user.agentId) {
      await prisma.agent.update({ where: { id: user.agentId }, data: { passwordHash: hashed } });
    }

    await auditService.log(userId, 'PASSWORD_CHANGED', {}, ctx);

    return { message: 'Password changed successfully' };
  }

  async listAgentActivity(agentId: string, query: AgentPortalListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const { field, order } = getSort(query, 'createdAt', 'desc');

    const { fromDate, toDate } = getDateRange(query.from, query.to);

    const where: Record<string, unknown> = {
      user: { agentId },
      createdAt: { gte: fromDate, lte: toDate },
    };

    if (query.search) {
      where.action = { contains: query.search, ...INSENSITIVE };
    }
    if (query.action) {
      where.action = { contains: query.action, ...INSENSITIVE };
    }

    const [total, activities] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [field]: order } as Record<string, 'asc' | 'desc'>,
        select: {
          id: true,
          action: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          shopId: true,
          saleId: true,
          createdAt: true,
          user: { select: { id: true, name: true, phone: true, role: true } },
          shop: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { activities, total, page, limit };
  }

  async getAgentNotifications(agentUserId: string, query: AgentPortalListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = { userId: agentUserId };

    if (query.isRead === 'true') where.isRead = true;
    else if (query.isRead === 'false') where.isRead = false;

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { notifications, total, page, limit };
  }

  async markNotificationRead(agentUserId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId: agentUserId },
    });
    if (!notification) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Notification not found' };
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { success: true };
  }

  async markAllNotificationsRead(agentUserId: string) {
    await prisma.notification.updateMany({
      where: { userId: agentUserId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async createSupportTicket(
    agentUserId: string,
    data: { subject: string; message: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' },
    ctx: AuditContext = {}
  ) {
    if (!data.subject?.trim() || !data.message?.trim()) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Subject and description are required' };
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: agentUserId,
        subject: data.subject.trim(),
        message: data.message.trim(),
        priority: data.priority ?? 'MEDIUM',
        status: 'OPEN',
        createdBy: agentUserId,
        messages: {
          create: [{ senderId: agentUserId, content: data.message.trim() }],
        },
      },
      include: { user: { select: { id: true, name: true, phone: true } } },
    });

    await auditService.log(agentUserId, 'SUPPORT_TICKET_CREATED', { ticketId: ticket.id, subject: data.subject }, ctx);

    return ticket;
  }

  async listTicketMessages(agentUserId: string, ticketId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId: agentUserId },
      select: { id: true, subject: true, status: true, priority: true, createdAt: true },
    });
    if (!ticket) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Support ticket not found' };
    }

    const messages = await prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        senderId: true,
        content: true,
        createdAt: true,
      },
    });

    return { ...ticket, messages };
  }

  async addTicketMessage(
    agentUserId: string,
    ticketId: string,
    content: string,
    ctx: AuditContext = {}
  ) {
    if (!content?.trim()) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Message cannot be empty' };
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId: agentUserId },
      select: { id: true, status: true },
    });
    if (!ticket) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Support ticket not found' };
    }
    if (ticket.status === 'CLOSED') {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Cannot reply to a closed ticket' };
    }

    const message = await prisma.supportMessage.create({
      data: { ticketId, senderId: agentUserId, content: content.trim() },
    });

    await auditService.log(agentUserId, 'SUPPORT_TICKET_MESSAGE_ADDED', { ticketId, messageId: message.id }, ctx);

    return message;
  }

  async listSupportTickets(agentUserId: string, query: AgentPortalListQuery = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Record<string, unknown> = { userId: agentUserId };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
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

    return { tickets, total, page, limit };
  }

  async getSupportTicket(agentUserId: string, ticketId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId: agentUserId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        shop: { select: { id: true, name: true } },
      },
    });
    if (!ticket) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Support ticket not found' };
    }
    return ticket;
  }

  async updateSupportTicket(
    agentUserId: string,
    ticketId: string,
    data: { subject?: string; message?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }
  ) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, userId: agentUserId },
    });
    if (!ticket) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Support ticket not found' };
    }
    if (ticket.status === 'CLOSED') {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Cannot update a closed ticket' };
    }

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        shop: { select: { id: true, name: true } },
      },
    });
  }

  async getBusinessShops(agentId: string, businessId: string) {
    const business = await prisma.user.findFirst({
      where: { id: businessId, agentId, role: 'BUSINESS_OWNER', deletedAt: null },
      select: { id: true },
    });
    if (!business) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Business not found' };
    }

    const shops = await prisma.shop.findMany({
      where: { ownerId: businessId, isArchived: false, deletedAt: null },
      select: {
        id: true,
        name: true,
        address: true,
        currency: true,
        isArchived: true,
        createdAt: true,
        _count: { select: { employees: true, products: true, sales: true } },
        subscriptions: { select: { plan: true, status: true, isActive: true, endDate: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'asc' },
    });

    return shops;
  }

  async getBusinessActivity(agentId: string, businessId: string, query: AgentPortalListQuery = {}) {
    const business = await prisma.user.findFirst({
      where: { id: businessId, agentId, role: 'BUSINESS_OWNER', deletedAt: null },
      select: { id: true },
    });
    if (!business) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Business not found' };
    }

    const { page, limit, skip } = getPagination(query);
    const { field, order } = getSort(query, 'createdAt', 'desc');

    const { fromDate, toDate } = getDateRange(query.from, query.to);

    const where: Record<string, unknown> = {
      userId: businessId,
      createdAt: { gte: fromDate, lte: toDate },
    };

    if (query.search) {
      where.action = { contains: query.search, ...INSENSITIVE };
    }
    if (query.action) {
      where.action = { contains: query.action, ...INSENSITIVE };
    }

    const [total, activities] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [field]: order } as Record<string, 'asc' | 'desc'>,
        select: {
          id: true,
          action: true,
          details: true,
          ipAddress: true,
          userAgent: true,
          shopId: true,
          saleId: true,
          createdAt: true,
          shop: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { activities, total, page, limit };
  }
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

export const agentPortalService = new AgentPortalService();