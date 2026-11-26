import { Request, Response, NextFunction } from 'express';
import { shopService } from '../services/shop.service';
import { saleService } from '../services/sale.service';
import { inventoryService } from '../services/inventory.service';
import { employeeService } from '../services/employee.service';
import { customerService } from '../services/customer.service';
import { expenseService } from '../services/expense.service';
import { loanService } from '../services/loan.service';
import { reportService } from '../services/report.service';
import { reportExportService } from '../services/report-export.service';
import { syncService } from '../services/sync.service';
import { auditService } from '../services/audit.service';
import prisma from '../config/database';
import { asQuery } from '../utils/query.util';
import { expandPermissions } from '../config/permissions';
import { adminController } from './admin.controller';

export class ShopController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const shops = await shopService.listShops(req.user!.userId);
      res.json({ success: true, data: shops, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const shop = await shopService.getShop(req.params.id, req.user!.userId);
      res.json({ success: true, data: shop, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const shop = await shopService.createShop(req.user!.userId, req.body);
      res.status(201).json({ success: true, data: shop, message: 'Shop created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const shop = await shopService.updateShop(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data: shop, message: 'Shop updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const shop = await shopService.archiveShop(req.params.id, req.user!.userId);
      res.json({ success: true, data: shop, message: 'Shop archived', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { range, from, to } = req.query as { range?: string; from?: string; to?: string };
      const data = await shopService.getDashboard(req.params.id, req.user!.userId, { range, from, to });
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async combinedDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await shopService.getCombinedDashboard(req.user!.userId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await prisma.shopSettings.findUnique({ where: { shopId: req.params.id } });
      res.json({ success: true, data: settings || {}, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await prisma.shopSettings.upsert({
        where: { shopId: req.params.id },
        update: req.body,
        create: { shopId: req.params.id, ...req.body },
      });
      res.json({ success: true, data: settings, message: 'Settings updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class SaleController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // Shift enforcement applies to employees who are actually authorised to
      // manage shifts. A sales-only cashier cannot open a shift, so requiring
      // one would make it impossible for them to sell.
      const permissions = expandPermissions(req.user!.permissions || []);
      const tracksShift = permissions.has('shift:view') || permissions.has('shift:open') || permissions.has('shift:close');
      const sale = await saleService.createSale(req.params.shopId, req.user!.userId, req.body, {
        requireOpenShift: req.user!.role === 'EMPLOYEE' && tracksShift,
      });
      res.status(201).json({ success: true, data: sale, message: 'Sale completed', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await saleService.listSales(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.sales, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await saleService.getSale(req.params.id);
      res.json({ success: true, data: sale, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async suspend(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.resolvedShopId || req.user!.shopId || '';
      const updated = await saleService.markSuspended(req.params.id, shopId, req.user!.userId);
      res.json({ success: true, data: updated, message: 'Sale suspended', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async resume(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await saleService.resumeSale(req.params.id, req.resolvedShopId || '');
      res.json({ success: true, data: sale, message: 'Sale resumed', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async refund(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.user!.role === 'BUSINESS_OWNER' || req.user!.role === 'SYSTEM_OWNER'
        ? undefined
        : 'PENDING';
      const sale = await saleService.refundSale(req.params.id, req.resolvedShopId || '', req.user!.userId, {
        reason: req.body.reason,
        items: req.body.items,
        notes: req.body.notes,
        status,
      });
      res.json({ success: true, data: sale, message: status === 'PENDING' ? 'Refund requested' : 'Sale refunded', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async void(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await saleService.voidSale(req.params.id, req.resolvedShopId || '', req.user!.userId, { reason: req.body.reason });
      res.json({ success: true, data: sale, message: 'Sale voided', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async receipt(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await saleService.getReceipt(req.params.receiptNumber);
      res.json({ success: true, data: sale, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listRefunds(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await saleService.listRefunds(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.refunds, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const refund = await saleService.getRefund(req.params.id);
      res.json({ success: true, data: refund, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async setRefundStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const refund = await saleService.setRefundStatus(req.params.id, req.resolvedShopId || '', req.user!.userId, req.body.status, req.body.note);
      res.json({ success: true, data: refund, message: `Refund ${req.body.status.toLowerCase()}`, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class InventoryController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.listProducts(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.products, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async lowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await inventoryService.getLowStock(req.params.shopId);
      res.json({ success: true, data: products, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await inventoryService.getProduct(req.params.id);
      res.json({ success: true, data: product, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async priceReview(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await inventoryService.listPriceReviewProducts(req.params.shopId);
      res.json({ success: true, data: products, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await inventoryService.createProduct(req.params.shopId, req.user!.userId, req.body, { isOwner: req.user!.role === 'BUSINESS_OWNER' });
      res.status(201).json({ success: true, data: product, message: 'Product created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await inventoryService.updateProduct(req.params.id, req.body, { isOwner: req.user!.role === 'BUSINESS_OWNER' });
      res.json({ success: true, data: product, message: 'Product updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await inventoryService.deleteProduct(req.params.id);
      res.json({ success: true, data: product, message: 'Product archived', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.adjustStock(req.params.id, req.resolvedShopId || '', req.user!.userId, req.body);
      res.json({ success: true, data: result, message: 'Stock adjusted', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async stockHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getStockHistory(req.params.id, parseInt(req.query.page as string) || 1);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async valuation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inventoryService.getValuation(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await inventoryService.listCategories(req.params.shopId);
      res.json({ success: true, data: categories, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await inventoryService.createCategory(req.params.shopId, req.body.name, req.body.description, req.body.parentId);
      res.status(201).json({ success: true, data: category, message: 'Category created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await inventoryService.updateCategory(req.params.id, req.body);
      res.json({ success: true, data: category, message: 'Category updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await inventoryService.deleteCategory(req.params.id);
      res.json({ success: true, data: category, message: 'Category archived', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async importProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : req.body;
      const result = await inventoryService.importProducts(req.params.shopId, req.user!.userId, rows);
      res.json({ success: true, data: result, message: `Imported: ${result.created} created, ${result.updated} updated`, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async bulkPrice(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.bulkPriceUpdate(req.params.shopId, req.body);
      res.json({ success: true, data: result, message: `Updated ${result.updated} products`, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async byBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await inventoryService.findByBarcode(req.params.shopId, req.params.barcode);
      if (!product) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found for this barcode' }, timestamp: new Date().toISOString() });
        return;
      }
      res.json({ success: true, data: product, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async generateBarcode(req: Request, res: Response, next: NextFunction) {
    try {
      const barcode = await inventoryService.generateBarcode(req.params.shopId);
      res.json({ success: true, data: { barcode }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class EmployeeController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const employees = await employeeService.listEmployees(req.params.shopId, req.user!.userId);
      res.json({ success: true, data: employees, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.addEmployee(req.params.shopId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data: employee, message: 'Employee added. SMS sent.', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getEmployee(req.params.id);
      res.json({ success: true, data: employee, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.updateEmployee(req.params.id, req.body);
      res.json({ success: true, data: employee, message: 'Employee updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async updatePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.updatePermissions(req.params.id, req.body.permissions);
      res.json({ success: true, data: employee, message: 'Permissions updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.toggleEmployee(req.params.id);
      res.json({ success: true, data: employee, message: 'Employee status updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await employeeService.resetPassword(req.params.id);
      res.json({ success: true, data: result, message: result.message, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.removeEmployee(req.params.id);
      res.json({ success: true, data: employee, message: 'Employee removed', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class CustomerController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerService.listCustomers(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.customers, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.createCustomer(req.params.shopId, req.body, req.user!.userId);
      res.status(201).json({ success: true, data: customer, message: 'Customer created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.getCustomer(req.params.id);
      res.json({ success: true, data: customer, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async profile(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.getCustomerProfile(req.params.id);
      res.json({ success: true, data: customer, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.updateCustomer(req.params.id, req.body);
      res.json({ success: true, data: customer, message: 'Customer updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.deleteCustomer(req.params.id);
      res.json({ success: true, data: customer, message: 'Customer archived', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async purchaseHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerService.getPurchaseHistory(req.params.id);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async creditPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await customerService.recordCreditPayment(req.params.id, req.body, req.user!.userId);
      res.json({ success: true, data: payment, message: 'Payment recorded', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async creditHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await customerService.getCreditHistory(req.params.id);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async outstandingCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const customers = await customerService.getOutstandingCredits(req.params.shopId);
      res.json({ success: true, data: customers, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class ExpenseController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await expenseService.listExpenses(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.expenses, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.getExpense(req.params.id);
      res.json({ success: true, data: expense, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.createExpense(req.params.shopId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data: expense, message: 'Expense recorded', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.updateExpense(req.params.id, req.body);
      res.json({ success: true, data: expense, message: 'Expense updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.deleteExpense(req.params.id, req.user!.userId);
      res.json({ success: true, data: expense, message: 'Expense deleted', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.setApprovalStatus(req.params.id, 'APPROVED', req.user!.userId);
      res.json({ success: true, data: expense, message: 'Expense approved', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const expense = await expenseService.setApprovalStatus(req.params.id, 'REJECTED', req.user!.userId);
      res.json({ success: true, data: expense, message: 'Expense rejected', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await expenseService.listExpenseCategories(req.params.shopId);
      res.json({ success: true, data: categories, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await expenseService.createExpenseCategory(req.params.shopId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data: category, message: 'Expense category created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class LoanController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await loanService.listLoans(req.params.shopId, asQuery(req.query));
      res.json({ success: true, data: result.loans, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.getLoan(req.params.id);
      res.json({ success: true, data: loan, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.createLoan(req.params.shopId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data: loan, message: 'Loan created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.updateLoan(req.params.id, req.body);
      res.json({ success: true, data: loan, message: 'Loan updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async repay(req: Request, res: Response, next: NextFunction) {
    try {
      const repayment = await loanService.repayLoan(req.params.id, req.user!.userId, req.body);
      res.json({ success: true, data: repayment, message: 'Repayment recorded', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async outstanding(req: Request, res: Response, next: NextFunction) {
    try {
      const loans = await loanService.getOutstandingLoans(req.params.shopId);
      res.json({ success: true, data: loans, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const loan = await loanService.deleteLoan(req.params.id, req.user!.userId);
      res.json({ success: true, data: loan, message: 'Loan deleted', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class ReportController {
  async sales(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.salesReport(req.params.shopId, req.query.from as string, req.query.to as string);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async inventory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.inventoryValuation(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async profit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.profitReport(req.params.shopId, req.query.from as string, req.query.to as string);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async expenses(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.expensesReport(req.params.shopId, req.query.from as string, req.query.to as string);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async credit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.creditReport(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async loans(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.loansReport(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async cashFlow(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.cashFlowReport(req.params.shopId, req.query.from as string, req.query.to as string);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async employees(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.employeeReport(req.params.shopId, req.query.from as string, req.query.to as string);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async paymentMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await reportService.paymentMethodsReport(req.params.shopId, req.query.from as string, req.query.to as string);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async export(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await reportExportService.export({
        shopId: req.params.shopId,
        type: req.params.type,
        format: (req.query.format as string) || 'csv',
        from: req.query.from as string,
        to: req.query.to as string,
      });

      if (!result) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid report type or format' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.send(result.buffer);
    } catch (error) { next(error); }
  }
}

export class SyncController {
  async push(req: Request, res: Response, next: NextFunction) {
    try {
      const { shopId, deviceId, changes } = req.body;
      const result = await syncService.pushChanges(shopId, deviceId, changes, { role: req.user!.role, permissions: req.user!.permissions });
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async pull(req: Request, res: Response, next: NextFunction) {
    try {
      const { shopId, since, limit } = req.query;
      const result = await syncService.pullChanges(shopId as string, since as string, parseInt(limit as string) || 500, { role: req.user!.role, permissions: req.user!.permissions });
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await syncService.getSyncStatus(req.query.shopId as string);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class NotificationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json({ success: true, data: notifications, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      // Scope by userId so one user cannot mutate another user's notification.
      const result = await prisma.notification.updateMany({
        where: { id: req.params.id, userId: req.user!.userId },
        data: { isRead: true },
      });
      if (result.count === 0) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' }, timestamp: new Date().toISOString() });
        return;
      }
      res.json({ success: true, message: 'Marked as read', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.userId, isRead: false },
        data: { isRead: true },
      });
      res.json({ success: true, message: 'All marked as read', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async sendSms(req: Request, res: Response, next: NextFunction) {
    try {
      const { SmsService } = await import('../services/sms.service');
      const smsService = new SmsService();
      // SmsService persists the SmsLog record (recipient, purpose, status).
      const ok = await smsService.send(req.body.phone, req.body.message, {
        purpose: 'PROMOTIONAL',
        userId: req.user?.userId,
        shopId: req.body.shopId,
      });
      if (!ok) {
        res.status(502).json({ success: false, error: { code: 'SMS_FAILED', message: 'SMS gateway rejected the message' }, timestamp: new Date().toISOString() });
        return;
      }
      await auditService.logDetailed({
        shopId: req.body.shopId || '',
        userId: req.user!.userId,
        action: 'SMS_SENT',
        entity: 'SmsLog',
        newValue: { phone: req.body.phone, purpose: 'PROMOTIONAL' },
      });
      res.json({ success: true, message: 'SMS sent', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}


export const shopController = new ShopController();
export const saleController = new SaleController();
export const inventoryController = new InventoryController();
export const employeeController = new EmployeeController();
export const customerController = new CustomerController();
export const expenseController = new ExpenseController();
export const loanController = new LoanController();
export const reportController = new ReportController();
export const syncController = new SyncController();
export const notificationController = new NotificationController();
export { adminController };
