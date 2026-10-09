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
import { adminService } from '../services/admin.service';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { toCsv, downloadHeaders } from '../utils/csv.util';
import prisma from '../config/database';
import { asQuery } from '../utils/query.util';

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
      const sale = await saleService.createSale(req.params.shopId, req.user!.userId, req.body, {
        requireOpenShift: req.user!.role === 'EMPLOYEE',
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

  async resetPin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await employeeService.resetPin(req.params.id);
      res.json({ success: true, data: result, message: 'PIN reset', timestamp: new Date().toISOString() });
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
      const result = await syncService.pushChanges(shopId, deviceId, changes);
      res.json({ success: true, data: result, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async pull(req: Request, res: Response, next: NextFunction) {
    try {
      const { shopId, since, limit } = req.query;
      const result = await syncService.pullChanges(shopId as string, since as string, parseInt(limit as string) || 500);
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
      await prisma.notification.update({
        where: { id: req.params.id },
        data: { isRead: true },
      });
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
      res.json({ success: true, data: result, message: 'Agent password reset', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async createBusinessOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await adminService.createBusinessOwner(req.body, req.user!.userId, this.ctx(req));
      res.status(201).json({ success: true, data: result, message: 'Business owner created. SMS sent.', timestamp: new Date().toISOString() });
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
      res.json({ success: true, data: result, message: 'Password reset code sent to the owner phone', timestamp: new Date().toISOString() });
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
      res.json({ success: true, data: result.subscriptions, pagination: { page: result.page, limit: result.limit, total: result.total }, timestamp: new Date().toISOString() });
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

      res.status(201).json({ success: true, data: result, message: 'Business owner created. SMS sent.', timestamp: new Date().toISOString() });
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
export const adminController = new AdminController();
