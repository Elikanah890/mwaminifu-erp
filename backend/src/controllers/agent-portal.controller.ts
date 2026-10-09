import { Request, Response, NextFunction } from 'express';
import { agentPortalService } from '../services/agent-portal.service';
import prisma from '../config/database';
import { asQuery } from '../utils/query.util';

export class AgentPortalController {
  private ctx(req: Request) {
    return {
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || undefined,
      userAgent: req.headers['user-agent'],
    };
  }

  private async getAgentIds(req: Request): Promise<{ userId: string; agentId: string }> {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { agent: { select: { id: true } } },
    });
    const agentId = user?.agent?.id;
    if (!agentId) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Agent profile not found' };
    }
    return { userId, agentId };
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = await this.getAgentIds(req);
      const stats = await agentPortalService.getDashboardStats(agentId);
      res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listBusinesses(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = await this.getAgentIds(req);
      const result = await agentPortalService.listAgentBusinesses(agentId, asQuery(req.query));
      res.json({ success: true, data: result.businesses, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = await this.getAgentIds(req);
      const business = await agentPortalService.getBusinessDetail(agentId, req.params.id);
      res.json({ success: true, data: business, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getBusinessShops(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = await this.getAgentIds(req);
      const shops = await agentPortalService.getBusinessShops(agentId, req.params.id);
      res.json({ success: true, data: shops, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getBusinessActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = await this.getAgentIds(req);
      const result = await agentPortalService.getBusinessActivity(agentId, req.params.id, asQuery(req.query));
      res.json({ success: true, data: result.activities, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listCommissions(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = await this.getAgentIds(req);
      const result = await agentPortalService.listAgentCommissions(agentId, asQuery(req.query));
      res.json({ success: true, data: result.commissions, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = await this.getAgentIds(req);
      const result = await agentPortalService.listAgentPayouts(agentId, asQuery(req.query));
      res.json({ success: true, data: result.payouts, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getAgentProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = await this.getAgentIds(req);
      const profile = await agentPortalService.getAgentProfile(agentId);
      res.json({ success: true, data: profile, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updateAgentProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId, userId } = await this.getAgentIds(req);
      const agent = await agentPortalService.updateAgentProfile(agentId, req.body, userId, this.ctx(req));
      res.json({ success: true, data: agent, message: 'Profile updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const { currentPassword, newPassword } = req.body;
      const result = await agentPortalService.changePassword(userId, currentPassword, newPassword, this.ctx(req));
      res.json({ success: true, data: result, message: 'Password changed', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listAgentActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { agentId } = await this.getAgentIds(req);
      const result = await agentPortalService.listAgentActivity(agentId, asQuery(req.query));
      res.json({ success: true, data: result.activities, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const result = await agentPortalService.getAgentNotifications(userId, asQuery(req.query));
      res.json({ success: true, data: result.notifications, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async markNotificationRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const result = await agentPortalService.markNotificationRead(userId, req.params.id);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async markAllNotificationsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const result = await agentPortalService.markAllNotificationsRead(userId);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async createSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const ticket = await agentPortalService.createSupportTicket(userId, req.body, this.ctx(req));
      res.status(201).json({ success: true, data: ticket, message: 'Support ticket created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listSupportTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const result = await agentPortalService.listSupportTickets(userId, asQuery(req.query));
      res.json({ success: true, data: result.tickets, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const ticket = await agentPortalService.getSupportTicket(userId, req.params.id);
      res.json({ success: true, data: ticket, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updateSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const ticket = await agentPortalService.updateSupportTicket(userId, req.params.id, req.body);
      res.json({ success: true, data: ticket, message: 'Support ticket updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listTicketMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const result = await agentPortalService.listTicketMessages(userId, req.params.id);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async addTicketMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = await this.getAgentIds(req);
      const message = await agentPortalService.addTicketMessage(userId, req.params.id, req.body.content, this.ctx(req));
      res.status(201).json({ success: true, data: message, message: 'Reply sent', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export const agentPortalController = new AgentPortalController();