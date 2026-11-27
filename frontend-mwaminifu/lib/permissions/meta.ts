export type PermissionMeta = { id: string; labelKey: string; descKey: string };

export const PERMISSION_GROUPS: Array<{
  title: string;
  items: Array<{ id: string; labelKey: string; descKey: string }>;
}> = [
  { title: 'sales', items: [
    { id: 'sales:create', labelKey: 'permSalesCreate', descKey: 'permSalesCreateDesc' },
    { id: 'sales:view', labelKey: 'permSalesView', descKey: 'permSalesViewDesc' },
    { id: 'sales:refund', labelKey: 'permSalesRefund', descKey: 'permSalesRefundDesc' },
    { id: 'sales:cancel', labelKey: 'permSalesCancel', descKey: 'permSalesCancelDesc' },
  ] },
  { title: 'productsInventory', items: [
    { id: 'products:view', labelKey: 'permProductsView', descKey: 'permProductsViewDesc' },
    { id: 'products:create', labelKey: 'permProductsCreate', descKey: 'permProductsCreateDesc' },
    { id: 'products:update', labelKey: 'permProductsUpdate', descKey: 'permProductsUpdateDesc' },
    { id: 'products:delete', labelKey: 'permProductsDelete', descKey: 'permProductsDeleteDesc' },
    { id: 'inventory:view', labelKey: 'permInventoryView', descKey: 'permInventoryViewDesc' },
    { id: 'inventory:adjust', labelKey: 'permInventoryAdjust', descKey: 'permInventoryAdjustDesc' },
  ] },
  { title: 'customersCredit', items: [
    { id: 'customers:view', labelKey: 'permCustomersView', descKey: 'permCustomersViewDesc' },
    { id: 'customers:create', labelKey: 'permCustomersCreate', descKey: 'permCustomersCreateDesc' },
    { id: 'customers:update', labelKey: 'permCustomersUpdate', descKey: 'permCustomersUpdateDesc' },
    { id: 'credit:create', labelKey: 'permCreditCreate', descKey: 'permCreditCreateDesc' },
    { id: 'credit:collect', labelKey: 'permCreditCollect', descKey: 'permCreditCollectDesc' },
    { id: 'credit:read', labelKey: 'permCreditRead', descKey: 'permCreditReadDesc' },
    { id: 'credit:writeoff', labelKey: 'permCreditWriteoff', descKey: 'permCreditWriteoffDesc' },
  ] },
  { title: 'expensesPurchases', items: [
    { id: 'expenses:create', labelKey: 'permExpensesCreate', descKey: 'permExpensesCreateDesc' },
    { id: 'expenses:read', labelKey: 'permExpensesRead', descKey: 'permExpensesReadDesc' },
    { id: 'expenses:approve', labelKey: 'permExpensesApprove', descKey: 'permExpensesApproveDesc' },
    { id: 'purchases:view', labelKey: 'permPurchasesView', descKey: 'permPurchasesViewDesc' },
    { id: 'purchases:create', labelKey: 'permPurchasesCreate', descKey: 'permPurchasesCreateDesc' },
    { id: 'purchases:approve', labelKey: 'permPurchasesApprove', descKey: 'permPurchasesApproveDesc' },
  ] },
  { title: 'shifts', items: [
    { id: 'shift:open', labelKey: 'permShiftOpen', descKey: 'permShiftOpenDesc' },
    { id: 'shift:close', labelKey: 'permShiftClose', descKey: 'permShiftCloseDesc' },
    { id: 'shift:view', labelKey: 'permShiftView', descKey: 'permShiftViewDesc' },
  ] },
  { title: 'reports', items: [
    { id: 'reports:sales', labelKey: 'permReportsSales', descKey: 'permReportsSalesDesc' },
    { id: 'reports:inventory', labelKey: 'permReportsInventory', descKey: 'permReportsInventoryDesc' },
    { id: 'reports:credit', labelKey: 'permReportsCredit', descKey: 'permReportsCreditDesc' },
    { id: 'reports:activity_log', labelKey: 'permReportsActivityLog', descKey: 'permReportsActivityLogDesc' },
    { id: 'reports:loans', labelKey: 'permReportsLoans', descKey: 'permReportsLoansDesc' },
    { id: 'reports:valuation', labelKey: 'permReportsValuation', descKey: 'permReportsValuationDesc' },
    { id: 'reports:communications', labelKey: 'permReportsCommunications', descKey: 'permReportsCommunicationsDesc' },
  ] },
  { title: 'financialControls', items: [
    { id: 'loans:read', labelKey: 'permLoansRead', descKey: 'permLoansReadDesc' },
    { id: 'loans:write', labelKey: 'permLoansWrite', descKey: 'permLoansWriteDesc' },
    { id: 'cash:read', labelKey: 'permCashRead', descKey: 'permCashReadDesc' },
    { id: 'cash:write', labelKey: 'permCashWrite', descKey: 'permCashWriteDesc' },
    { id: 'finance:read', labelKey: 'permFinanceRead', descKey: 'permFinanceReadDesc' },
  ] },
  { title: 'staff', items: [
    { id: 'employees:view', labelKey: 'permEmployeesView', descKey: 'permEmployeesViewDesc' },
  ] },
];

export function permissionLabel(t: (key: string) => string, id: string): string {
  for (const group of PERMISSION_GROUPS) {
    const item = group.items.find((entry) => entry.id === id);
    if (item) return t(item.labelKey);
  }
  return id;
}

export function permissionDescription(t: (key: string) => string, id: string): string {
  for (const group of PERMISSION_GROUPS) {
    const item = group.items.find((entry) => entry.id === id);
    if (item) return t(item.descKey);
  }
  return '';
}
