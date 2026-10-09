import { Router } from 'express';
import {
  shopController, saleController, inventoryController, employeeController,
  customerController, expenseController, loanController, reportController,
  syncController, notificationController, adminController,
} from '../controllers/index';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRoles, requirePermission, requireAnyPermission, requireCreditCreateForCreditSale, requireShopAccess, requireEntityAccess, requireActiveSubscription, requireOwnerOnly, requireSelfOrOwner, requireBodyShopAccess, requireFeature } from '../middlewares/permission.middleware';
import { adminLimiter, writeLimiter } from '../middlewares/rateLimit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { agentPortalController } from '../controllers/agent-portal.controller';
import { authController } from '../controllers/auth.controller';
import { changeAdminPasswordSchema } from '../validators/auth.validator';
import { subscriptionController } from '../controllers/subscription.controller';
import { shiftController } from '../controllers/shift.controller';
import { capitalController, recurringController, deviceController, productUnitController } from '../controllers/owner-features.controller';
import {
  supplierController, purchaseController, stockController, cashController,
  creditController, auditLogController, employeeDashboardController, analyticsController, imageController,
} from '../controllers/erp.controller';
import { settingsService } from '../services/settings.service';
import prisma from '../config/database';
import {
  createShopSchema, updateShopSchema, createSaleSchema, createProductSchema,
  adjustStockSchema, createExpenseSchema, createCustomerSchema, creditPaymentSchema,
  createLoanSchema, loanRepaymentSchema, addEmployeeSchema, updatePermissionsSchema,
  onboardBusinessSchema, createBusinessOwnerSchema, createAgentSchema, sendSmsSchema, syncPushSchema, updateShopSettingsSchema,
  updateAgentSchema, statusUpdateSchema, createNotificationSchema, createSupportTicketSchema,
  updateSupportTicketSchema, addSupportMessageSchema, assignSupportTicketSchema, createPlanSchema, updatePlanSchema, updateSubscriptionSchema, updateSettingsSchema,
  createCapitalTransactionSchema, createRecurringExpenseSchema, registerDeviceSessionSchema, createProductUnitConfigSchema,
  createSupplierSchema, updateSupplierSchema, createPurchaseSchema, receivePurchaseSchema, purchasePaymentSchema, cashTransactionSchema, writeOffSchema,
  createCategorySchema, updateCategorySchema, bulkPriceSchema, importProductsSchema, uploadImageSchema, refundStatusSchema, cashReversalSchema, auditDeleteSchema, auditBulkDeleteSchema,
} from '../validators/shop.validator';

const router = Router();

// Public app config (no auth) — safe, non-sensitive settings for mobile/embeds.
router.get('/config', async (_req, res, next) => {
  try {
    const settings = await settingsService.getAll();
    res.json({
      success: true,
      data: {
        appName: settings.appName,
        currency: settings.currency,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        maintenanceMode: settings.maintenanceMode,
        otpLifetimeMinutes: settings.otpLifetimeMinutes,
        syncIntervalSeconds: settings.syncIntervalSeconds,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// Public active subscription plans (marketing site). No auth required.
router.get('/plans', subscriptionController.listPlans.bind(subscriptionController));

// Subscription status & owner self-service. These deliberately skip the
// subscription guard so an expired shop can always view status and renew.
router.get('/subscriptions/status', authMiddleware, subscriptionController.status.bind(subscriptionController));
router.get('/shops/:shopId/subscription', authMiddleware, requireShopAccess({ enforceSubscription: false }), subscriptionController.getShopSubscription.bind(subscriptionController));
router.post('/shops/:shopId/subscription', authMiddleware, requireShopAccess({ enforceSubscription: false }), requireRoles('BUSINESS_OWNER'), subscriptionController.subscribe.bind(subscriptionController));
router.put('/shops/:shopId/subscription', authMiddleware, requireShopAccess({ enforceSubscription: false }), requireRoles('BUSINESS_OWNER'), subscriptionController.upgrade.bind(subscriptionController));
router.post('/shops/:shopId/subscription/renew', authMiddleware, requireShopAccess({ enforceSubscription: false }), requireRoles('BUSINESS_OWNER'), subscriptionController.renew.bind(subscriptionController));
router.delete('/shops/:shopId/subscription', authMiddleware, requireShopAccess({ enforceSubscription: false }), requireRoles('BUSINESS_OWNER'), subscriptionController.cancel.bind(subscriptionController));

// User profile routes (mounted at /api/v1 so the mobile client can call /users/me)
router.get('/users/me', authMiddleware, authController.getMe.bind(authController));
router.put('/users/me', authMiddleware, authController.updateProfile.bind(authController));
router.get('/users/me/permissions', authMiddleware, authController.permissions.bind(authController));

// Shop routes
router.get('/shops', authMiddleware, shopController.list.bind(shopController));
router.get('/shops/combined-dashboard', authMiddleware, shopController.combinedDashboard.bind(shopController));
router.post('/shops', authMiddleware, requireRoles('BUSINESS_OWNER'), validate(createShopSchema), shopController.create.bind(shopController));
router.get('/shops/:id', authMiddleware, shopController.get.bind(shopController));
router.put('/shops/:id', authMiddleware, requireRoles('BUSINESS_OWNER'), validate(updateShopSchema), shopController.update.bind(shopController));
router.delete('/shops/:id', authMiddleware, requireRoles('BUSINESS_OWNER'), shopController.archive.bind(shopController));
router.get('/shops/:id/dashboard', authMiddleware, shopController.dashboard.bind(shopController));
router.get('/shops/:id/settings', authMiddleware, requireRoles('BUSINESS_OWNER'), shopController.getSettings.bind(shopController));
router.put('/shops/:id/settings', authMiddleware, requireRoles('BUSINESS_OWNER'), validate(updateShopSettingsSchema), shopController.updateSettings.bind(shopController));

// Sale routes
router.post('/shops/:shopId/sales', authMiddleware, writeLimiter, requireShopAccess(), requirePermission('sales:create'), requireCreditCreateForCreditSale(), validate(createSaleSchema), saleController.create.bind(saleController));
router.get('/shops/:shopId/sales', authMiddleware, requireShopAccess(), requirePermission('sales:view'), saleController.list.bind(saleController));
router.get('/sales/:id', authMiddleware, requireEntityAccess('sale'), saleController.get.bind(saleController));
router.put('/sales/:id/suspend', authMiddleware, requireEntityAccess('sale'), requirePermission('sales:create'), saleController.suspend.bind(saleController));
router.put('/sales/:id/resume', authMiddleware, requireEntityAccess('sale'), requirePermission('sales:create'), saleController.resume.bind(saleController));
router.put('/sales/:id/refund', authMiddleware, requireEntityAccess('sale'), requirePermission('sales:refund'), saleController.refund.bind(saleController));
router.put('/sales/:id/void', authMiddleware, requireEntityAccess('sale'), requirePermission('sales:cancel'), saleController.void.bind(saleController));
router.get('/sales/receipt/:receiptNumber', authMiddleware, requireEntityAccess('receipt'), saleController.receipt.bind(saleController));

// Returns & Refunds routes
router.get('/shops/:shopId/refunds', authMiddleware, requireShopAccess(), requirePermission('sales:refund'), saleController.listRefunds.bind(saleController));
router.get('/refunds/:id', authMiddleware, requireEntityAccess('refund'), saleController.getRefund.bind(saleController));
router.put('/refunds/:id/status', authMiddleware, requireEntityAccess('refund'), requireRoles('BUSINESS_OWNER'), validate(refundStatusSchema), saleController.setRefundStatus.bind(saleController));

// Employee shift routes
router.get('/shifts', authMiddleware, requireAnyPermission(['shift:view', 'shift:open', 'shift:close']), shiftController.list.bind(shiftController));
router.get('/shifts/active', authMiddleware, requireAnyPermission(['shift:view', 'shift:open', 'shift:close']), shiftController.active.bind(shiftController));
router.get('/shops/:shopId/shifts', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), shiftController.listByShop.bind(shiftController));
router.post('/shifts', authMiddleware, requireActiveSubscription(), requireBodyShopAccess(), requirePermission('shift:open'), shiftController.openShift.bind(shiftController));
router.put('/shifts/:id/close', authMiddleware, requireActiveSubscription(), requireBodyShopAccess(), requirePermission('shift:close'), shiftController.closeShift.bind(shiftController));

// ... rest of routes

// Inventory routes
router.get('/shops/:shopId/products', authMiddleware, requireShopAccess(), requireAnyPermission(['products:view', 'inventory:view', 'sales:create']), inventoryController.list.bind(inventoryController));
router.get('/shops/:shopId/products/low-stock', authMiddleware, requireShopAccess(), requireAnyPermission(['products:view', 'inventory:view', 'reports:inventory']), inventoryController.lowStock.bind(inventoryController));
router.get('/shops/:shopId/products/price-review', authMiddleware, requireShopAccess(), requireAnyPermission(['products:view', 'products:update']), inventoryController.priceReview.bind(inventoryController));
router.get('/shops/:shopId/products/by-barcode/:barcode', authMiddleware, requireShopAccess(), requireAnyPermission(['products:view', 'inventory:view', 'sales:create']), inventoryController.byBarcode.bind(inventoryController));
// Alias (Spec wording) — same handler as by-barcode.
router.get('/shops/:shopId/products/barcode/:barcode', authMiddleware, requireShopAccess(), requireAnyPermission(['products:view', 'inventory:view', 'sales:create']), inventoryController.byBarcode.bind(inventoryController));
router.get('/shops/:shopId/products/generate-barcode', authMiddleware, requireShopAccess(), requireAnyPermission(['products:view', 'products:create', 'inventory:view']), inventoryController.generateBarcode.bind(inventoryController));
router.post('/shops/:shopId/products', authMiddleware, requireShopAccess(), requirePermission('products:create'), validate(createProductSchema), inventoryController.create.bind(inventoryController));
router.get('/shops/:shopId/inventory/valuation', authMiddleware, requireShopAccess(), requirePermission('reports:valuation'), inventoryController.valuation.bind(inventoryController));
router.get('/shops/:shopId/categories', authMiddleware, requireShopAccess(), requireAnyPermission(['products:view', 'inventory:view', 'sales:create']), inventoryController.listCategories.bind(inventoryController));
router.post('/shops/:shopId/categories', authMiddleware, requireShopAccess(), requirePermission('products:create'), validate(createCategorySchema), inventoryController.createCategory.bind(inventoryController));
router.put('/categories/:id', authMiddleware, requireEntityAccess('category'), requireRoles('BUSINESS_OWNER'), validate(updateCategorySchema), inventoryController.updateCategory.bind(inventoryController));
router.delete('/categories/:id', authMiddleware, requireEntityAccess('category'), requireRoles('BUSINESS_OWNER'), inventoryController.deleteCategory.bind(inventoryController));
router.get('/products/:id', authMiddleware, requireEntityAccess('product'), requireAnyPermission(['products:view', 'inventory:view', 'sales:create']), inventoryController.get.bind(inventoryController));
router.put('/products/:id', authMiddleware, requireEntityAccess('product'), requirePermission('products:update'), inventoryController.update.bind(inventoryController));
router.delete('/products/:id', authMiddleware, requireEntityAccess('product'), requirePermission('products:delete'), inventoryController.delete.bind(inventoryController));
router.post('/products/:id/adjust-stock', authMiddleware, requireEntityAccess('product'), requirePermission('inventory:adjust'), validate(adjustStockSchema), inventoryController.adjustStock.bind(inventoryController));
router.get('/products/:id/stock-history', authMiddleware, requireEntityAccess('product'), requirePermission('inventory:view'), inventoryController.stockHistory.bind(inventoryController));
router.post('/shops/:shopId/products/import', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), validate(importProductsSchema), inventoryController.importProducts.bind(inventoryController));
router.post('/shops/:shopId/products/bulk-price', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), validate(bulkPriceSchema), inventoryController.bulkPrice.bind(inventoryController));
router.post('/shops/:shopId/upload-image', authMiddleware, requireShopAccess(), requirePermission('products:update'), validate(uploadImageSchema), imageController.upload.bind(imageController));

// Product unit configs (multi-unit selling)
router.get('/products/:productId/units', authMiddleware, requireEntityAccess('product'), requireAnyPermission(['products:view', 'inventory:view', 'sales:create']), productUnitController.list.bind(productUnitController));
router.post('/products/:productId/units', authMiddleware, requireEntityAccess('product'), requirePermission('products:update'), validate(createProductUnitConfigSchema), productUnitController.create.bind(productUnitController));
router.delete('/product-units/:id', authMiddleware, requireEntityAccess('product-unit'), requirePermission('products:update'), productUnitController.remove.bind(productUnitController));

// Supplier routes
router.get('/shops/:shopId/suppliers', authMiddleware, requireShopAccess(), supplierController.list.bind(supplierController));
router.post('/shops/:shopId/suppliers', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), validate(createSupplierSchema), supplierController.create.bind(supplierController));
router.get('/suppliers/:id', authMiddleware, requireEntityAccess('supplier'), supplierController.get.bind(supplierController));
router.put('/suppliers/:id', authMiddleware, requireEntityAccess('supplier'), requireRoles('BUSINESS_OWNER'), validate(updateSupplierSchema), supplierController.update.bind(supplierController));
router.delete('/suppliers/:id', authMiddleware, requireEntityAccess('supplier'), requireRoles('BUSINESS_OWNER'), supplierController.delete.bind(supplierController));

// Purchase routes
router.get('/shops/:shopId/purchases', authMiddleware, requireShopAccess(), requirePermission('purchases:view'), purchaseController.list.bind(purchaseController));
router.post('/shops/:shopId/purchases', authMiddleware, requireShopAccess(), requirePermission('purchases:create'), validate(createPurchaseSchema), purchaseController.create.bind(purchaseController));
router.get('/shops/:shopId/payables', authMiddleware, requireShopAccess(), requirePermission('finance:read'), purchaseController.payables.bind(purchaseController));
router.get('/purchases/:id', authMiddleware, requireEntityAccess('purchase'), requirePermission('purchases:view'), purchaseController.get.bind(purchaseController));
router.put('/purchases/:id', authMiddleware, requireEntityAccess('purchase'), requirePermission('purchases:create'), purchaseController.update.bind(purchaseController));
router.post('/purchases/:id/receive', authMiddleware, requireEntityAccess('purchase'), requirePermission('purchases:create'), validate(receivePurchaseSchema), purchaseController.receive.bind(purchaseController));
router.post('/purchases/:id/pay', authMiddleware, requireEntityAccess('purchase'), requirePermission('purchases:approve'), validate(purchasePaymentSchema), purchaseController.pay.bind(purchaseController));
router.put('/purchases/:id/cancel', authMiddleware, requireEntityAccess('purchase'), requirePermission('purchases:approve'), purchaseController.cancel.bind(purchaseController));

// Stock management routes
router.get('/shops/:shopId/stock-movements', authMiddleware, requireShopAccess(), stockController.movements.bind(stockController));
router.get('/shops/:shopId/stock/fast-movers', authMiddleware, requireShopAccess(), stockController.fastMovers.bind(stockController));
router.get('/shops/:shopId/stock/by-category', authMiddleware, requireShopAccess(), stockController.byCategory.bind(stockController));
router.get('/shops/:shopId/stock/low-out', authMiddleware, requireShopAccess(), stockController.lowOut.bind(stockController));
router.get('/shops/:shopId/stock/valuation', authMiddleware, requireShopAccess(), requirePermission('reports:valuation'), stockController.valuation.bind(stockController));

// Cash management routes
router.get('/shops/:shopId/cash', authMiddleware, requireShopAccess(), requirePermission('cash:read'), cashController.list.bind(cashController));
router.get('/shops/:shopId/cash/summary', authMiddleware, requireShopAccess(), requirePermission('cash:read'), cashController.summary.bind(cashController));
router.post('/shops/:shopId/cash', authMiddleware, requireShopAccess(), requirePermission('cash:write'), validate(cashTransactionSchema), cashController.record.bind(cashController));
router.post('/shops/:shopId/cash/:id/reverse', authMiddleware, requireShopAccess(), requirePermission('cash:write'), validate(cashReversalSchema), cashController.reverse.bind(cashController));

// Receivables routes
router.get('/shops/:shopId/receivables/aging', authMiddleware, requireShopAccess(), requirePermission('reports:credit'), creditController.aging.bind(creditController));
router.get('/customers/:id/statement', authMiddleware, requireEntityAccess('customer'), creditController.statement.bind(creditController));
router.post('/customers/:id/write-off', authMiddleware, requireEntityAccess('customer'), requirePermission('credit:writeoff'), validate(writeOffSchema), creditController.writeOff.bind(creditController));

// Audit log routes
router.get('/shops/:shopId/audit-logs', authMiddleware, requireShopAccess(), requirePermission('reports:activity_log'), auditLogController.list.bind(auditLogController));
router.get('/shops/:shopId/audit-logs/export', authMiddleware, requireShopAccess(), requirePermission('reports:activity_log'), auditLogController.export.bind(auditLogController));
router.put('/shops/:shopId/audit-logs/:id', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), validate(auditDeleteSchema), auditLogController.softDelete.bind(auditLogController));
router.post('/shops/:shopId/audit-logs/bulk-delete', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), validate(auditBulkDeleteSchema), auditLogController.bulkSoftDelete.bind(auditLogController));

// Analytics routes (period-based reporting with per-product analysis)
router.get('/shops/:shopId/analytics/sales', authMiddleware, requireShopAccess(), requirePermission('reports:sales'), analyticsController.sales.bind(analyticsController));
router.get('/shops/:shopId/analytics/inventory', authMiddleware, requireShopAccess(), requirePermission('reports:inventory'), analyticsController.inventory.bind(analyticsController));
router.get('/shops/:shopId/analytics/profit', authMiddleware, requireShopAccess(), requireOwnerOnly(), analyticsController.profit.bind(analyticsController));
router.get('/shops/:shopId/analytics/valuation', authMiddleware, requireShopAccess(), requirePermission('reports:valuation'), analyticsController.valuation.bind(analyticsController));
router.get('/shops/:shopId/finance/overview', authMiddleware, requireShopAccess(), requireOwnerOnly(), analyticsController.financeOverview.bind(analyticsController));

// Employee dashboard & activity routes
router.get('/employee/dashboard', authMiddleware, employeeDashboardController.dashboard.bind(employeeDashboardController));
router.get('/employee/activity', authMiddleware, employeeDashboardController.activity.bind(employeeDashboardController));

// Employee routes
router.get('/shops/:shopId/employees', authMiddleware, requireShopAccess(), requirePermission('employees:view'), employeeController.list.bind(employeeController));
router.post('/shops/:shopId/employees', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), validate(addEmployeeSchema), employeeController.create.bind(employeeController));
router.get('/employees/:id', authMiddleware, requireEntityAccess('employee'), requireSelfOrOwner('employee'), employeeController.get.bind(employeeController));
router.put('/employees/:id', authMiddleware, requireEntityAccess('employee'), requireRoles('BUSINESS_OWNER'), employeeController.update.bind(employeeController));
router.put('/employees/:id/permissions', authMiddleware, requireEntityAccess('employee'), requireRoles('BUSINESS_OWNER'), validate(updatePermissionsSchema), employeeController.updatePermissions.bind(employeeController));
router.put('/employees/:id/toggle', authMiddleware, requireEntityAccess('employee'), requireRoles('BUSINESS_OWNER'), employeeController.toggle.bind(employeeController));
router.post('/employees/:id/reset-pin', authMiddleware, requireEntityAccess('employee'), requireRoles('BUSINESS_OWNER'), employeeController.resetPin.bind(employeeController));
router.delete('/employees/:id', authMiddleware, requireEntityAccess('employee'), requireRoles('BUSINESS_OWNER'), employeeController.remove.bind(employeeController));

// Customer routes
router.get('/shops/:shopId/customers', authMiddleware, requireShopAccess(), requirePermission('customers:view'), customerController.list.bind(customerController));
router.post('/shops/:shopId/customers', authMiddleware, requireShopAccess(), requirePermission('customers:create'), validate(createCustomerSchema), customerController.create.bind(customerController));
router.get('/shops/:shopId/credit/outstanding', authMiddleware, requireShopAccess(), requirePermission('credit:read'), customerController.outstandingCredits.bind(customerController));
router.get('/customers/:id', authMiddleware, requireEntityAccess('customer'), customerController.get.bind(customerController));
router.get('/customers/:id/profile', authMiddleware, requireEntityAccess('customer'), customerController.profile.bind(customerController));
router.put('/customers/:id', authMiddleware, requireEntityAccess('customer'), requirePermission('customers:update'), customerController.update.bind(customerController));
router.delete('/customers/:id', authMiddleware, requireEntityAccess('customer'), requirePermission('customers:update'), customerController.delete.bind(customerController));
router.get('/customers/:id/purchase-history', authMiddleware, requireEntityAccess('customer'), customerController.purchaseHistory.bind(customerController));
router.post('/customers/:id/credit-payment', authMiddleware, requireEntityAccess('customer'), requirePermission('credit:collect'), validate(creditPaymentSchema), customerController.creditPayment.bind(customerController));
router.get('/customers/:id/credit-history', authMiddleware, requireEntityAccess('customer'), customerController.creditHistory.bind(customerController));

// Expense routes
router.post('/shops/:shopId/expenses', authMiddleware, requireShopAccess(), requirePermission('expenses:create'), validate(createExpenseSchema), expenseController.create.bind(expenseController));
router.get('/shops/:shopId/expenses', authMiddleware, requireShopAccess(), requirePermission('expenses:read'), expenseController.list.bind(expenseController));
router.get('/expenses/:id', authMiddleware, requireEntityAccess('expense'), expenseController.get.bind(expenseController));
router.put('/expenses/:id', authMiddleware, requireEntityAccess('expense'), requirePermission('expenses:create'), expenseController.update.bind(expenseController));
router.delete('/expenses/:id', authMiddleware, requireEntityAccess('expense'), requirePermission('expenses:create'), expenseController.delete.bind(expenseController));
router.put('/expenses/:id/approve', authMiddleware, requireEntityAccess('expense'), requirePermission('expenses:approve'), expenseController.approve.bind(expenseController));
router.put('/expenses/:id/reject', authMiddleware, requireEntityAccess('expense'), requirePermission('expenses:approve'), expenseController.reject.bind(expenseController));

// Loan routes
router.get('/shops/:shopId/loans', authMiddleware, requireShopAccess(), requirePermission('loans:read'), loanController.list.bind(loanController));
router.post('/shops/:shopId/loans', authMiddleware, requireShopAccess(), requirePermission('loans:write'), validate(createLoanSchema), loanController.create.bind(loanController));
router.get('/shops/:shopId/loans/outstanding', authMiddleware, requireShopAccess(), requirePermission('loans:read'), loanController.outstanding.bind(loanController));
router.get('/loans/:id', authMiddleware, requireEntityAccess('loan'), requirePermission('loans:read'), loanController.get.bind(loanController));
router.put('/loans/:id', authMiddleware, requireEntityAccess('loan'), requirePermission('loans:write'), loanController.update.bind(loanController));
router.post('/loans/:id/repay', authMiddleware, requireEntityAccess('loan'), requirePermission('loans:write'), validate(loanRepaymentSchema), loanController.repay.bind(loanController));
router.delete('/loans/:id', authMiddleware, requireEntityAccess('loan'), requirePermission('loans:write'), loanController.delete.bind(loanController));

// Owner capital transactions (drawings & injections)
router.get('/shops/:shopId/capital-transactions', authMiddleware, requireShopAccess(), requirePermission('finance:read'), capitalController.list.bind(capitalController));
router.get('/shops/:shopId/capital-transactions/summary', authMiddleware, requireShopAccess(), requirePermission('finance:read'), capitalController.summary.bind(capitalController));
router.post('/shops/:shopId/capital-transactions', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), validate(createCapitalTransactionSchema), capitalController.create.bind(capitalController));

// Recurring expenses
router.get('/shops/:shopId/recurring-expenses', authMiddleware, requireShopAccess(), requirePermission('expenses:read'), recurringController.list.bind(recurringController));
router.post('/shops/:shopId/recurring-expenses', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), validate(createRecurringExpenseSchema), recurringController.create.bind(recurringController));
router.post('/shops/:shopId/recurring-expenses/generate-due', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), recurringController.generateDue.bind(recurringController));
router.put('/shops/:shopId/recurring-expenses/:id/toggle', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), recurringController.toggle.bind(recurringController));
router.delete('/shops/:shopId/recurring-expenses/:id', authMiddleware, requireShopAccess(), requireRoles('BUSINESS_OWNER'), recurringController.remove.bind(recurringController));

// Report routes
router.get('/shops/:shopId/reports/sales', authMiddleware, requireShopAccess(), requirePermission('reports:sales'), reportController.sales.bind(reportController));
router.get('/shops/:shopId/reports/inventory', authMiddleware, requireShopAccess(), requirePermission('reports:inventory'), reportController.inventory.bind(reportController));
router.get('/shops/:shopId/reports/profit', authMiddleware, requireShopAccess(), requireOwnerOnly(), reportController.profit.bind(reportController));
router.get('/shops/:shopId/reports/expenses', authMiddleware, requireShopAccess(), requireOwnerOnly(), reportController.expenses.bind(reportController));
router.get('/shops/:shopId/reports/credit', authMiddleware, requireShopAccess(), requirePermission('reports:credit'), reportController.credit.bind(reportController));
router.get('/shops/:shopId/reports/loans', authMiddleware, requireShopAccess(), requirePermission('reports:loans'), reportController.loans.bind(reportController));
router.get('/shops/:shopId/reports/cashflow', authMiddleware, requireShopAccess(), requireOwnerOnly(), reportController.cashFlow.bind(reportController));
router.get('/shops/:shopId/reports/employees', authMiddleware, requireShopAccess(), requirePermission('reports:activity_log'), reportController.employees.bind(reportController));
router.get('/shops/:shopId/reports/payment-methods', authMiddleware, requireShopAccess(), requirePermission('reports:sales'), reportController.paymentMethods.bind(reportController));
// Export honours the same gating as the report itself (prevents an employee
// from exporting an owner-only report they cannot view).
const EXPORT_PERMISSIONS: Record<string, string> = {
  sales: 'reports:sales',
  inventory: 'reports:inventory',
  credit: 'reports:credit',
  loans: 'reports:loans',
  valuation: 'reports:valuation',
  employees: 'reports:activity_log',
  'activity-log': 'reports:activity_log',
};
const OWNER_ONLY_EXPORTS = new Set(['profit', 'expenses', 'cashflow', 'general', 'finance', 'finance-overview']);
router.get(
  '/shops/:shopId/reports/:type/export',
  authMiddleware,
  requireShopAccess(),
  (req, res, next) => {
    const type = String(req.params.type).toLowerCase();
    if (OWNER_ONLY_EXPORTS.has(type)) return requireOwnerOnly()(req, res, next);
    return requirePermission(EXPORT_PERMISSIONS[type] ?? 'reports:sales')(req, res, next);
  },
  reportController.export.bind(reportController)
);

// Sync routes
router.post('/sync/push', authMiddleware, validate(syncPushSchema), requireShopAccess(), syncController.push.bind(syncController));
router.get('/sync/pull', authMiddleware, requireShopAccess(), syncController.pull.bind(syncController));
router.get('/sync/status', authMiddleware, requireShopAccess(), syncController.status.bind(syncController));

// Notification routes
router.get('/notifications', authMiddleware, notificationController.list.bind(notificationController));
router.put('/notifications/:id/read', authMiddleware, notificationController.markRead.bind(notificationController));
router.put('/notifications/read-all', authMiddleware, notificationController.markAllRead.bind(notificationController));
router.post('/notifications/send-sms', authMiddleware, requireShopAccess(), requirePermission('reports:communications'), requireFeature('sms'), validate(sendSmsSchema), notificationController.sendSms.bind(notificationController));

// Device sessions (switch user on shared devices)
router.post('/device-sessions', authMiddleware, validate(registerDeviceSessionSchema), deviceController.register.bind(deviceController));
router.get('/device-sessions', authMiddleware, deviceController.list.bind(deviceController));

// Support is available to both owners and employees; tickets remain scoped to
// the authenticated user so one shop user cannot read another user's tickets.
const ownerSupportAuth = [authMiddleware];

router.get('/owner/support', ...ownerSupportAuth, async (req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        shop: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    res.json({ success: true, data: tickets, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

router.post('/owner/support', ...ownerSupportAuth, validate(createSupportTicketSchema), async (req, res, next) => {
  try {
    const { subject, message, priority, shopId } = req.body;
    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        message,
        priority: priority || 'MEDIUM',
        userId: req.user!.userId,
        shopId: shopId || null,
        createdBy: req.user!.userId,
        messages: { create: [{ senderId: req.user!.userId, content: message }] },
      },
    });
    res.status(201).json({ success: true, data: ticket, message: 'Support ticket created', timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

router.get('/owner/support/:id', ...ownerSupportAuth, async (req, res, next) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      include: {
        shop: { select: { id: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { sender: { select: { id: true, name: true, role: true } } },
        },
      },
    });
    if (!ticket) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Support ticket not found' }, timestamp: new Date().toISOString() });
      return;
    }
    res.json({ success: true, data: ticket, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

router.post('/owner/support/:id/messages', ...ownerSupportAuth, validate(addSupportMessageSchema), async (req, res, next) => {
  try {
    const { content } = req.body;
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
      select: { id: true, status: true },
    });
    if (!ticket) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Support ticket not found' }, timestamp: new Date().toISOString() });
      return;
    }
    if (ticket.status === 'CLOSED') {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot reply to a closed ticket' }, timestamp: new Date().toISOString() });
      return;
    }
    const message = await prisma.supportMessage.create({
      data: { ticketId: ticket.id, senderId: req.user!.userId, content: content.trim() },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });
    res.status(201).json({ success: true, data: message, message: 'Reply sent', timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

// Admin routes (System Owner only, stricter rate limit)
const adminAuth = [authMiddleware, adminLimiter, requireRoles('SYSTEM_OWNER')];

// Agents
router.post('/admin/agents', ...adminAuth, validate(createAgentSchema), adminController.createAgent.bind(adminController));
router.get('/admin/agents', ...adminAuth, adminController.listAgents.bind(adminController));
router.get('/admin/agents/:id', ...adminAuth, adminController.getAgent.bind(adminController));
router.put('/admin/agents/:id', ...adminAuth, validate(updateAgentSchema), adminController.updateAgent.bind(adminController));
router.put('/admin/agents/:id/toggle', ...adminAuth, adminController.toggleAgent.bind(adminController));
router.delete('/admin/agents/:id', ...adminAuth, adminController.deleteAgent.bind(adminController));
router.post('/admin/agents/:id/reset-password', ...adminAuth, adminController.resetAgentPassword.bind(adminController));
router.post('/admin/agents/:id/payout', ...adminAuth, adminController.payoutAgent.bind(adminController));

// Business Owners
router.post('/admin/business-owners', ...adminAuth, validate(createBusinessOwnerSchema), adminController.createBusinessOwner.bind(adminController));
router.get('/admin/business-owners', ...adminAuth, adminController.listBusinessOwners.bind(adminController));
router.get('/admin/business-owners/:id', ...adminAuth, adminController.getBusinessOwner.bind(adminController));
router.put('/admin/business-owners/:id/status', ...adminAuth, validate(statusUpdateSchema), adminController.updateBusinessOwnerStatus.bind(adminController));
router.post('/admin/business-owners/:id/reset-pin', ...adminAuth, adminController.resetBusinessOwnerPin.bind(adminController));
router.post('/admin/business-owners/:id/reset-password', ...adminAuth, adminController.resetBusinessOwnerPassword.bind(adminController));
router.post('/admin/business-owners/:id/otp', ...adminAuth, adminController.ownerOtp.bind(adminController));
router.delete('/admin/business-owners/:id', ...adminAuth, adminController.deleteBusinessOwner.bind(adminController));

// Businesses
router.get('/admin/businesses', ...adminAuth, adminController.listBusinesses.bind(adminController));
router.get('/admin/businesses/:id', ...adminAuth, adminController.getBusiness.bind(adminController));

// Shops
router.get('/admin/shops', ...adminAuth, adminController.listShops.bind(adminController));
router.get('/admin/shops/:id', ...adminAuth, adminController.getShop.bind(adminController));
router.put('/admin/shops/:id/archive', ...adminAuth, adminController.archiveShop.bind(adminController));
router.put('/admin/shops/:id/unarchive', ...adminAuth, adminController.unarchiveShop.bind(adminController));

// NOTE (Spec 15.1): shop employees, sales and shop-revenue endpoints are
// intentionally NOT exposed to the System Owner — that data is private to the
// Business Owner. Only platform/CRM/subscription reports are available below.

// Reports (platform/CRM only)
router.get('/admin/reports/agents', ...adminAuth, adminController.agentsReport.bind(adminController));
router.get('/admin/reports/owners', ...adminAuth, adminController.ownersReport.bind(adminController));

// Activity Logs
router.get('/admin/activity-logs', ...adminAuth, adminController.listActivityLogs.bind(adminController));

// Notifications
router.get('/admin/notifications', ...adminAuth, adminController.listNotifications.bind(adminController));
router.post('/admin/notifications', ...adminAuth, validate(createNotificationSchema), adminController.createNotification.bind(adminController));

// Support Center
router.get('/admin/support-tickets', ...adminAuth, adminController.listSupportTickets.bind(adminController));
router.get('/admin/support-tickets/:id', ...adminAuth, adminController.getSupportTicket.bind(adminController));
router.post('/admin/support-tickets', ...adminAuth, validate(createSupportTicketSchema), adminController.createSupportTicket.bind(adminController));
router.put('/admin/support-tickets/:id/status', ...adminAuth, validate(updateSupportTicketSchema), adminController.updateSupportTicketStatus.bind(adminController));
router.post('/admin/support-tickets/:id/messages', ...adminAuth, validate(addSupportMessageSchema), adminController.addTicketMessage.bind(adminController));
router.put('/admin/support-tickets/:id/assign', ...adminAuth, validate(assignSupportTicketSchema), adminController.assignTicket.bind(adminController));

// Subscription Plans (register before /admin/subscriptions/:id)
router.get('/admin/subscriptions/plans', ...adminAuth, adminController.listPlans.bind(adminController));
router.post('/admin/subscriptions/plans', ...adminAuth, validate(createPlanSchema), adminController.createPlan.bind(adminController));
router.put('/admin/subscriptions/plans/:id', ...adminAuth, validate(updatePlanSchema), adminController.updatePlan.bind(adminController));
router.delete('/admin/subscriptions/plans/:id', ...adminAuth, adminController.deletePlan.bind(adminController));

// Subscriptions
router.get('/admin/subscriptions', ...adminAuth, adminController.listSubscriptions.bind(adminController));
router.put('/admin/subscriptions/:id', ...adminAuth, validate(updateSubscriptionSchema), adminController.updateSubscription.bind(adminController));

// Demo Accounts
router.get('/admin/demo-accounts', ...adminAuth, adminController.listDemoAccounts.bind(adminController));

// System Settings
router.get('/admin/settings', ...adminAuth, adminController.getSettings.bind(adminController));
router.put('/admin/settings', ...adminAuth, validate(updateSettingsSchema), adminController.updateSettings.bind(adminController));

router.get('/admin/platform-stats', ...adminAuth, adminController.platformStats.bind(adminController));

// Comprehensive System Owner dashboard (subscription revenue only)
router.get('/admin/dashboard', ...adminAuth, adminController.dashboard.bind(adminController));

// Commissions & payouts (System Owner sees all)
router.get('/admin/commissions', ...adminAuth, adminController.listCommissions.bind(adminController));
router.get('/admin/payouts', ...adminAuth, adminController.listPayouts.bind(adminController));

// Active sessions (Spec 4.3 — 2-concurrent-session limit)
router.get('/admin/sessions', ...adminAuth, adminController.sessions.bind(adminController));

// Change the System Owner's own password
router.post('/admin/change-password', ...adminAuth, validate(changeAdminPasswordSchema), adminController.changePassword.bind(adminController));

// Agent self-service routes
router.post('/agents/onboard', authMiddleware, requireRoles('AGENT'), validate(onboardBusinessSchema), adminController.onboardBusiness.bind(adminController));

// Agent Portal routes (self-service for agents)
// NOTE: `/agents/businesses` is served by agentPortalController.listBusinesses
// below. A duplicate registration previously shadowed it, leaking raw user
// records and breaking the paginated response shape.
const agentAuth = [authMiddleware, requireRoles('AGENT')];
router.get('/agents/dashboard', ...agentAuth, agentPortalController.getDashboardStats.bind(agentPortalController));
router.get('/agents/commissions', ...agentAuth, agentPortalController.listCommissions.bind(agentPortalController));
router.get('/agents/payouts', ...agentAuth, agentPortalController.listPayouts.bind(agentPortalController));
router.get('/agents/businesses', ...agentAuth, agentPortalController.listBusinesses.bind(agentPortalController));
router.get('/agents/businesses/:id', ...agentAuth, agentPortalController.getBusiness.bind(agentPortalController));
router.get('/agents/businesses/:id/shops', ...agentAuth, agentPortalController.getBusinessShops.bind(agentPortalController));
router.get('/agents/businesses/:id/activity', ...agentAuth, agentPortalController.getBusinessActivity.bind(agentPortalController));
router.get('/agents/profile', ...agentAuth, agentPortalController.getAgentProfile.bind(agentPortalController));
router.put('/agents/profile', ...agentAuth, agentPortalController.updateAgentProfile.bind(agentPortalController));
router.get('/agents/me', ...agentAuth, agentPortalController.getAgentProfile.bind(agentPortalController));
router.put('/agents/me/password', ...agentAuth, agentPortalController.changePassword.bind(agentPortalController));
router.get('/agents/activity', ...agentAuth, agentPortalController.listAgentActivity.bind(agentPortalController));
router.get('/agents/notifications', ...agentAuth, agentPortalController.listNotifications.bind(agentPortalController));
router.put('/agents/notifications/:id/read', ...agentAuth, agentPortalController.markNotificationRead.bind(agentPortalController));
router.put('/agents/notifications/read-all', ...agentAuth, agentPortalController.markAllNotificationsRead.bind(agentPortalController));
router.post('/agents/support', ...agentAuth, agentPortalController.createSupportTicket.bind(agentPortalController));
router.get('/agents/support', ...agentAuth, agentPortalController.listSupportTickets.bind(agentPortalController));
router.get('/agents/support/:id', ...agentAuth, agentPortalController.getSupportTicket.bind(agentPortalController));
router.put('/agents/support/:id', ...agentAuth, agentPortalController.updateSupportTicket.bind(agentPortalController));
router.get('/agents/support/:id/messages', ...agentAuth, agentPortalController.listTicketMessages.bind(agentPortalController));
router.post('/agents/support/:id/messages', ...agentAuth, agentPortalController.addTicketMessage.bind(agentPortalController));

export default router;
