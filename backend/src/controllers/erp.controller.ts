import { Request, Response, NextFunction } from 'express';
import { supplierService } from '../services/supplier.service';
import { purchaseService } from '../services/purchase.service';
import { stockService } from '../services/stock.service';
import { cashService } from '../services/cash.service';
import { creditService } from '../services/credit.service';
import { shopService } from '../services/shop.service';
import { analyticsService, Period } from '../services/analytics.service';
import { optimizeImage } from '../services/image.service';
import { toCsv, downloadHeaders } from '../utils/csv.util';
import { asQuery } from '../utils/query.util';
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export class SupplierController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supplierService.listSuppliers(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.suppliers, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.getSupplier(req.params.id);
      res.json({ success: true, data: supplier, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.createSupplier(req.params.shopId, req.body);
      res.status(201).json({ success: true, data: supplier, message: 'Supplier created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.updateSupplier(req.params.id, req.body);
      res.json({ success: true, data: supplier, message: 'Supplier updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.deleteSupplier(req.params.id);
      res.json({ success: true, data: supplier, message: 'Supplier archived', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class PurchaseController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await purchaseService.listPurchases(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.purchases, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await purchaseService.getPurchase(req.params.id);
      res.json({ success: true, data: purchase, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await purchaseService.createPurchase(req.params.shopId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data: purchase, message: 'Purchase created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await purchaseService.updatePurchase(req.params.id, req.body);
      res.json({ success: true, data: purchase, message: 'Purchase updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async receive(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await purchaseService.receivePurchase(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data: purchase, message: 'Stock received', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async pay(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await purchaseService.payPurchase(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data: purchase, message: 'Payment recorded', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const purchase = await purchaseService.cancelPurchase(req.params.id, req.user!.userId);
      res.json({ success: true, data: purchase, message: 'Purchase cancelled', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async payables(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await purchaseService.getPayables(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class StockController {
  async movements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await stockService.listMovements(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.movements, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async fastMovers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await stockService.fastMovers(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async byCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await stockService.stockByCategory(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async lowOut(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await stockService.lowAndOutOfStock(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async valuation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await stockService.stockValuation(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class CashController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await cashService.listTransactions(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.transactions, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cashService.getSummary(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async record(req: Request, res: Response, next: NextFunction) {
    try {
      const tx = await cashService.recordTransaction(req.params.shopId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data: tx, message: 'Cash transaction recorded', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async reverse(req: Request, res: Response, next: NextFunction) {
    try {
      const tx = await cashService.reverseTransaction(req.params.shopId, req.user!.userId, req.params.id, req.body);
      res.status(201).json({ success: true, data: tx, message: 'Cash transaction reversed', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class CreditController {
  async aging(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await creditService.aging(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async statement(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await creditService.statement(req.params.id);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async writeOff(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await creditService.writeOff(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data, message: 'Debt written off', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class AuditLogController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const skip = (page - 1) * limit;

      const where: Prisma.AuditLogWhereInput = { shopId: req.params.shopId, deletedAt: null };
      if (req.query.action) where.action = req.query.action as string;
      if (req.query.entity) where.entity = req.query.entity as string;
      if (req.query.userId) where.userId = req.query.userId as string;
      if (req.query.search) {
        const search = req.query.search as string;
        where.OR = [
          { action: { contains: search, mode: 'insensitive' } },
          { entity: { contains: search, mode: 'insensitive' } },
          { entityId: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (req.query.from || req.query.to) {
        const createdAt: Prisma.DateTimeFilter = {};
        if (req.query.from) createdAt.gte = new Date(req.query.from as string);
        if (req.query.to) createdAt.lte = new Date(req.query.to as string);
        where.createdAt = createdAt;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: { user: { select: { name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      res.json({ success: true, data: logs, pagination: { page, limit, total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async softDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body || {};
      if (!reason || !String(reason).trim()) {
        res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A deletion reason is required' }, timestamp: new Date().toISOString() });
        return;
      }

      const log = await prisma.auditLog.findFirst({ where: { id: req.params.id, shopId: req.params.shopId } });
      if (!log) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Audit log entry not found' }, timestamp: new Date().toISOString() });
        return;
      }
      if (log.deletedAt) {
        res.status(422).json({ success: false, error: { code: 'BUSINESS_RULE_VIOLATION', message: 'Audit log entry is already archived' }, timestamp: new Date().toISOString() });
        return;
      }

      await prisma.auditLog.update({
        where: { id: log.id },
        data: { deletedAt: new Date(), deletionReason: String(reason).trim(), deletedBy: req.user!.userId },
      });

      res.json({ success: true, data: { id: log.id }, message: 'Audit log entry archived', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async bulkSoftDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids, reason } = req.body || {};
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No audit log entries selected' }, timestamp: new Date().toISOString() });
        return;
      }
      if (!reason || !String(reason).trim()) {
        res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A deletion reason is required' }, timestamp: new Date().toISOString() });
        return;
      }

      const result = await prisma.auditLog.updateMany({
        where: { id: { in: ids as string[] }, shopId: req.params.shopId, deletedAt: null },
        data: { deletedAt: new Date(), deletionReason: String(reason).trim(), deletedBy: req.user!.userId },
      });

      res.json({ success: true, data: { count: result.count }, message: `${result.count} audit log entries archived`, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async export(req: Request, res: Response, next: NextFunction) {
    try {
      const where: Prisma.AuditLogWhereInput = { shopId: req.params.shopId, deletedAt: null };
      if (req.query.action) where.action = req.query.action as string;
      if (req.query.entity) where.entity = req.query.entity as string;
      if (req.query.userId) where.userId = req.query.userId as string;
      if (req.query.from || req.query.to) {
        const createdAt: Prisma.DateTimeFilter = {};
        if (req.query.from) createdAt.gte = new Date(req.query.from as string);
        if (req.query.to) createdAt.lte = new Date(req.query.to as string);
        where.createdAt = createdAt;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10000,
      });

      const rows = logs.map((l) => ({
        createdAt: new Date(l.createdAt).toISOString(),
        action: l.action,
        entity: l.entity || '',
        entityId: l.entityId || '',
        user: l.user?.name || '',
        role: l.user?.role || '',
        details: JSON.stringify(l.newValue ?? l.oldValue ?? {}),
        ipAddress: l.ipAddress || '',
        userAgent: l.userAgent || '',
      }));

      res.set(downloadHeaders(`audit_log_${Date.now()}.csv`));
      res.send(toCsv(rows));
    } catch (error) { next(error); }
  }
}

export class AnalyticsController {
  async sales(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.sales(req.params.shopId, (req.query.period as Period) || 'month', req.query.from as string, req.query.to as string);
      if (req.query.format === 'csv') {
        const rows = data.perProduct.map((p) => ({
          Product: p.name,
          Category: p.category,
          Quantity: p.quantity,
          Revenue: p.revenue,
          COGS: p.cogs,
          Profit: p.profit,
          Margin: `${p.margin.toFixed(1)}%`,
          Share: `${p.share.toFixed(1)}%`,
        }));
        res.set(downloadHeaders(`sales_analysis_${Date.now()}.csv`));
        res.send(toCsv(rows));
        return;
      }
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async inventory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.inventory(req.params.shopId);
      if (req.query.format === 'csv') {
        const rows = data.perProduct.map((p) => ({
          Product: p.name,
          SKU: p.sku ?? '',
          Category: p.category,
          Stock: p.stock,
          'Cost Price': p.costPrice,
          'Selling Price': p.sellingPrice,
          'Reorder Level': p.reorderLevel,
          Value: p.value,
          Status: p.status,
        }));
        res.set(downloadHeaders(`inventory_analysis_${Date.now()}.csv`));
        res.send(toCsv(rows));
        return;
      }
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async profit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.profit(req.params.shopId, (req.query.period as Period) || 'month', req.query.from as string, req.query.to as string);
      if (req.query.format === 'csv') {
        const rows = data.perProduct.map((p) => ({
          Product: p.name,
          Category: p.category,
          Quantity: p.quantity,
          Revenue: p.revenue,
          COGS: p.cogs,
          Profit: p.profit,
          Margin: `${p.margin.toFixed(1)}%`,
        }));
        res.set(downloadHeaders(`profit_analysis_${Date.now()}.csv`));
        res.send(toCsv(rows));
        return;
      }
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async valuation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.valuation(req.params.shopId);
      if (req.query.format === 'csv') {
        const rows = [
          ...data.assets.map((a) => ({ Category: 'Asset', Item: a.label, Amount: a.amount })),
          ...data.liabilities.map((l) => ({ Category: 'Liability', Item: l.label, Amount: l.amount })),
          { Category: 'Net Value', Item: 'Net Business Value', Amount: data.summary.net },
        ];
        res.set(downloadHeaders(`valuation_${Date.now()}.csv`));
        res.send(toCsv(rows));
        return;
      }
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async financeOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.financeOverview(
        req.params.shopId,
        (req.query.period as Period) || 'month',
        req.query.from as string,
        req.query.to as string,
      );
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class ImageController {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const dataUrl = req.body?.dataUrl;
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A base64 image data URL is required' }, timestamp: new Date().toISOString() });
        return;
      }
      const optimized = await optimizeImage(dataUrl);
      res.json({ success: true, data: { url: optimized }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class EmployeeDashboardController {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.user!.shopId || req.params.shopId;
      if (!shopId) {
        res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Shop context required' }, timestamp: new Date().toISOString() });
        return;
      }
      const data = await shopService.getEmployeeDashboard(req.user!.userId, shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async activity(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.user!.shopId || req.params.shopId;
      const userId = req.user!.userId;
      const [sales, shifts] = await Promise.all([
        prisma.sale.findMany({
          where: { userId, shopId },
          orderBy: { saleDate: 'desc' },
          take: 50,
          include: { customer: { select: { name: true } } },
        }),
        prisma.shift.findMany({
          where: { userId, shopId },
          orderBy: { startedAt: 'desc' },
          take: 20,
        }),
      ]);
      res.json({ success: true, data: { sales, shifts }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export const supplierController = new SupplierController();
export const purchaseController = new PurchaseController();
export const stockController = new StockController();
export const cashController = new CashController();
export const creditController = new CreditController();
export const auditLogController = new AuditLogController();
export const employeeDashboardController = new EmployeeDashboardController();
export const analyticsController = new AnalyticsController();
export const imageController = new ImageController();
