import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { toCsv, downloadHeaders } from '../utils/csv.util';
import { asQuery } from '../utils/query.util';
import prisma from '../config/database';

export class AdminController {
  private ctx(req: Request) {
    return {
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || undefined,
      userAgent: req.headers['user-agent'],
    };
  }

  private sendCsv(res: Response, filename: string, rows: Record<string, unknown>[]) {
    res.set(downloadHeaders(filename));
    res.send(toCsv(rows));
  }

  async createAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const agent = await adminService.createAgent(req.body, req.user!.userId, this.ctx(req));
      res.status(201).json({ success: true, data: agent, message: 'Agent created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listAgents(asQuery(req.query));
      res.json({ success: true, data: result.agents, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const agent = await adminService.getAgent(req.params.id);
      res.json({ success: true, data: agent, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updateAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const agent = await adminService.updateAgent(req.params.id, req.body, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: agent, message: 'Agent updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async toggleAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const agent = await adminService.toggleAgentStatus(req.params.id, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: agent, message: 'Agent status updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async deleteAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const agent = await adminService.deleteAgent(req.params.id, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: agent, message: 'Agent deleted', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async resetAgentPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.resetAgentPassword(req.params.id, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: result, message: 'Agent password reset. Email sent.', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async createBusinessOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.createBusinessOwner(req.body, req.user!.userId, this.ctx(req));
      res.status(201).json({ success: true, data: result, message: 'Business owner created. Welcome email sent.', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listBusinessOwners(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listBusinessOwners(asQuery(req.query));
      res.json({ success: true, data: result.users, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getBusinessOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const owner = await adminService.getBusinessOwner(req.params.id);
      res.json({ success: true, data: owner, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updateBusinessOwnerStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await adminService.updateBusinessOwnerStatus(req.params.id, req.body.isActive === true, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: user, message: 'Business owner status updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async resetBusinessOwnerPin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.resetBusinessOwnerPin(req.params.id, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: result, message: result.message, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  // Reset a business owner's access credential (sends a PIN-reset OTP).
  async resetBusinessOwnerPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.resetBusinessOwnerPin(req.params.id, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: result, message: 'Password reset. Welcome email sent to the owner.', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async deleteBusinessOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.deleteBusinessOwner(req.params.id, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: result, message: 'Business owner removed', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listBusinesses(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listBusinesses(asQuery(req.query));
      res.json({ success: true, data: result.businesses, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const business = await adminService.getBusiness(req.params.id);
      res.json({ success: true, data: business, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listShops(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listShopsAdmin(asQuery(req.query));
      res.json({ success: true, data: result.shops, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getShop(req: Request, res: Response, next: NextFunction) {
    try {
      const shop = await adminService.getShopAdmin(req.params.id);
      res.json({ success: true, data: shop, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async archiveShop(req: Request, res: Response, next: NextFunction) {
    try {
      const shop = await adminService.setShopArchived(req.params.id, true, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: shop, message: 'Shop archived', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async unarchiveShop(req: Request, res: Response, next: NextFunction) {
    try {
      const shop = await adminService.setShopArchived(req.params.id, false, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: shop, message: 'Shop restored', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listEmployeesAdmin(asQuery(req.query));
      res.json({ success: true, data: result.employees, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await adminService.getEmployeeAdmin(req.params.id);
      res.json({ success: true, data: employee, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updateEmployeeStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await adminService.updateEmployeeStatus(req.params.id, req.body.isActive === true, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: employee, message: 'Employee status updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async resetEmployeePin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.resetEmployeePin(req.params.id, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: result, message: result.message, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listSales(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listSalesAdmin(asQuery(req.query));
      res.json({ success: true, data: result.sales, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getSale(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await adminService.getSaleAdmin(req.params.id);
      res.json({ success: true, data: sale, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async exportSalesCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listSalesAdmin({ ...asQuery(req.query), limit: '10000' });
      const rows = result.sales.map((s) => ({
        receiptNumber: s.receiptNumber || '',
        date: new Date(s.saleDate).toISOString(),
        shop: s.shop?.name || '',
        cashier: s.user?.name || '',
        customer: s.customer?.name || '',
        totalAmount: s.totalAmount,
        discount: s.discount,
        tax: s.taxAmount,
        grandTotal: s.grandTotal,
        paymentMethod: s.paymentMethod || '',
        status: s.status,
      }));
      this.sendCsv(res, `sales_${Date.now()}.csv`, rows);
    } catch (error) { next(error); }
  }

  async getRevenue(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getRevenue(asQuery(req.query));
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async salesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.salesReport(asQuery(req.query));
      if (req.query.format === 'csv') {
        this.sendCsv(res, `sales_report_${Date.now()}.csv`, data.daily);
        return;
      }
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async agentsReport(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.agentsReport();
      if (req.query.format === 'csv') {
        this.sendCsv(res, `agents_report_${Date.now()}.csv`, data.data);
        return;
      }
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async ownersReport(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.ownersReport(asQuery(req.query));
      if (req.query.format === 'csv') {
        this.sendCsv(res, `owners_report_${Date.now()}.csv`, data.data);
        return;
      }
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async employeesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.employeesReport(asQuery(req.query));
      if (req.query.format === 'csv') {
        this.sendCsv(res, `employees_report_${Date.now()}.csv`, data.data);
        return;
      }
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listActivityLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listActivityLogs(asQuery(req.query));
      if (req.query.format === 'csv') {
        const rows = result.logs.map((l) => ({
          createdAt: new Date(l.createdAt).toISOString(),
          action: l.action,
          actor: l.user?.name || '',
          role: l.user?.role || '',
          shop: l.shop?.name || '',
          details: JSON.stringify(l.details || {}),
          ipAddress: l.ipAddress || '',
        }));
        this.sendCsv(res, `activity_logs_${Date.now()}.csv`, rows);
        return;
      }
      res.json({ success: true, data: result.logs, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listAdminNotifications(asQuery(req.query));
      res.json({ success: true, data: result.notifications, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listPlatformNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listPlatformNotifications(asQuery(req.query));
      res.json({ success: true, data: result.notifications, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async createNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.createAdminNotification(req.body, req.user!.userId, this.ctx(req));
      res.status(201).json({ success: true, data: result, message: result.message, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listSupportTickets(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listSupportTickets(asQuery(req.query));
      res.json({ success: true, data: result.tickets, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async createSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await adminService.createSupportTicket(req.body, req.user!.userId, this.ctx(req));
      res.status(201).json({ success: true, data: ticket, message: 'Support ticket created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updateSupportTicketStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await adminService.updateSupportTicketStatus(req.params.id, req.body.status, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: ticket, message: 'Support ticket updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getSupportTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await adminService.getSupportTicket(req.params.id);
      res.json({ success: true, data: ticket, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async addTicketMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await adminService.addTicketMessage(req.params.id, req.user!.userId, req.body.content, this.ctx(req));
      res.status(201).json({ success: true, data: message, message: 'Reply sent', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async assignTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const ticket = await adminService.assignTicket(req.params.id, req.body.assignedTo, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: ticket, message: 'Ticket assigned', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await adminService.listPlans();
      res.json({ success: true, data: plans, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await adminService.createPlan(req.body, req.user!.userId, this.ctx(req));
      res.status(201).json({ success: true, data: plan, message: 'Plan created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await adminService.updatePlan(req.params.id, req.body, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: plan, message: 'Plan updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async deletePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await adminService.deletePlan(req.params.id, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: plan, message: 'Plan deleted', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listSubscriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listSubscriptions(asQuery(req.query));
      res.json({
        success: true,
        data: result.subscriptions,
        pagination: { page: result.page, limit: result.limit, total: result.total, activeCount: result.activeCount },
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  }

  async updateSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const subscription = await adminService.updateSubscription(req.params.id, req.body, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: subscription, message: 'Subscription updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listDemoAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.listDemoAccounts();
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getAllSettings();
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await adminService.updateSettings(req.body, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: settings, message: 'Settings updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async onboardBusiness(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { agent: { select: { id: true } } },
      });

      if (!user?.agent?.id) {
        res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Agent profile not found' }, timestamp: new Date().toISOString() });
        return;
      }

      const result = await adminService.onboardBusinessOwner(req.body, user.agent.id);

      await auditService.log(req.user!.userId, 'BUSINESS_ONBOARDED', {
        businessOwnerId: result.user.id,
        businessOwnerName: result.user.name,
        businessOwnerPhone: result.user.phone,
        shopId: result.shop.id,
        shopName: result.shop.name,
      }, this.ctx(req));

      res.status(201).json({ success: true, data: result, message: 'Business owner created. Welcome email sent.', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listBusinessesAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { agent: { select: { id: true } } },
      });

      if (!user?.agent?.id) {
        res.json({ success: true, data: [], timestamp: new Date().toISOString() });
        return;
      }

      const businesses = await adminService.listAgentBusinesses(user.agent.id);
      res.json({ success: true, data: businesses, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async platformStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getPlatformStats();
      res.json({ success: true, data: stats, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listCommissions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listCommissions(asQuery(req.query));
      res.json({ success: true, data: result.commissions, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.listPayouts(asQuery(req.query));
      res.json({ success: true, data: result.payouts, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async payoutAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const payout = await adminService.payoutAgent(req.params.id, req.body || {}, req.user!.userId, this.ctx(req));
      res.status(201).json({ success: true, data: payout, message: 'Agent paid out', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async ownerOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.generateOwnerOtp(req.params.id, req.user!.userId, this.ctx(req));
      res.json({ success: true, data: result, message: 'Fresh OTP generated and sent by SMS', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  // Spec 15.1 — comprehensive System Owner dashboard (subscription revenue only).
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const requested = String(req.query.granularity || 'daily').toLowerCase();
      const allowed = ['daily', 'weekly', 'monthly', 'yearly'] as const;
      const granularity = (allowed as readonly string[]).includes(requested)
        ? (requested as (typeof allowed)[number])
        : 'daily';
      const data = await adminService.getDashboard(granularity);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  // Spec 4.3 — active sessions for the AGAC Owner (limit 2).
  async sessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await prisma.refreshToken.findMany({
        where: { userId: req.user!.userId, isRevoked: false, expiresAt: { gt: new Date() } },
        select: { id: true, deviceId: true, ipAddress: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' },
      });
      res.json({
        success: true,
        data: { count: sessions.length, max: 2, sessions },
        timestamp: new Date().toISOString(),
      });
    } catch (error) { next(error); }
  }

  // Change the System Owner's own password (username/password account).
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.changeAdminPassword(
        req.user!.userId,
        req.body.currentPassword,
        req.body.newPassword
      );
      await auditService.log(req.user!.userId, 'PASSWORD_CHANGED', {}, this.ctx(req));
      res.json({ success: true, data: result, message: result.message, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}


export const adminController = new AdminController();
