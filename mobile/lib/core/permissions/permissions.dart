/// Centralized client-side permission model.
///
/// The backend (`permission.middleware.ts`) remains the final security
/// boundary. These constants are used only to improve the mobile UX by
/// hiding/guarding actions an employee is not allowed to perform.
///
/// Business Owners always have full access and are never subject to these
/// permission checks.
class Permission {
  Permission._();

  // Backwards-compatible aliases (map to canonical permissions).
  static const posWrite = salesCreate;
  static const posRefund = salesRefund;
  static const posVoid = salesCancel;
  static const inventoryRead = inventoryView;
  static const inventoryWrite = inventoryAdjust;
  static const expensesWrite = expensesCreate;
  static const creditWrite = creditCreate;

  // Sales
  static const salesCreate = 'sales:create';
  static const salesView = 'sales:view';
  static const salesCancel = 'sales:cancel';
  static const salesRefund = 'sales:refund';

  // Products & inventory
  static const productsView = 'products:view';
  static const productsCreate = 'products:create';
  static const productsUpdate = 'products:update';
  static const productsDelete = 'products:delete';
  static const inventoryView = 'inventory:view';
  static const inventoryAdjust = 'inventory:adjust';

  // Customers & credit
  static const customersView = 'customers:view';
  static const customersCreate = 'customers:create';
  static const customersUpdate = 'customers:update';
  static const creditCreate = 'credit:create';
  static const creditCollect = 'credit:collect';
  static const creditRead = 'credit:read';
  static const creditWriteoff = 'credit:writeoff';

  // Expenses & purchases
  static const expensesCreate = 'expenses:create';
  static const expensesRead = 'expenses:read';
  static const expensesApprove = 'expenses:approve';
  static const purchasesView = 'purchases:view';
  static const purchasesCreate = 'purchases:create';
  static const purchasesApprove = 'purchases:approve';

  // Shifts
  static const shiftOpen = 'shift:open';
  static const shiftClose = 'shift:close';
  static const shiftView = 'shift:view';

  // Staff
  static const employeesView = 'employees:view';
  static const employeesManage = 'employees:manage';

  // Financial controls
  static const loansRead = 'loans:read';
  static const loansWrite = 'loans:write';
  static const cashRead = 'cash:read';
  static const cashWrite = 'cash:write';
  static const financeRead = 'finance:read';

  /// Reporting permissions (Spec 9.8.1) — individually grantable.
  static const reportsSales = 'reports:sales';
  static const reportsInventory = 'reports:inventory';
  static const reportsCredit = 'reports:credit';
  static const reportsActivityLog = 'reports:activity_log';
  static const reportsLoans = 'reports:loans';
  static const reportsValuation = 'reports:valuation';
  static const reportsCommunications = 'reports:communications';

  /// Owner-only reports — NEVER granted to employees.
  static const reportsGeneral = 'reports:general';
  static const reportsFinanceOverview = 'reports:finance_overview';

  /// Standard V1 operational permission set for a full shop employee.
  /// Kept in sync with the backend `FULL_OPERATIONAL_PERMISSIONS` constant.
  static const List<String> fullOperational = [
    salesCreate,
    salesView,
    salesCancel,
    salesRefund,
    productsView,
    productsCreate,
    productsUpdate,
    productsDelete,
    inventoryView,
    inventoryAdjust,
    customersView,
    customersCreate,
    customersUpdate,
    creditCreate,
    creditCollect,
    creditRead,
    creditWriteoff,
    expensesCreate,
    expensesRead,
    expensesApprove,
    purchasesView,
    purchasesCreate,
    purchasesApprove,
    shiftOpen,
    shiftClose,
    shiftView,
    employeesView,
    reportsSales,
    reportsInventory,
    reportsCredit,
    reportsValuation,
  ];

  /// Legacy (pre-rename) permission strings mapped to their canonical form so
  /// that stale cached sessions still behave correctly.
  static const Map<String, List<String>> legacyAliases = {
    'pos:write': [salesCreate],
    'pos:refund': [salesRefund],
    'pos:void': [salesCancel],
    'inventory:read': [inventoryView],
    'inventory:write': [inventoryAdjust],
    'expenses:write': [expensesCreate],
    'credit:write': [creditCreate, creditCollect],
    'reports:read': [reportsSales, reportsInventory, reportsCredit],
  };

  static Set<String> expand(Iterable<String> permissions) {
    final out = <String>{};
    for (final p in permissions) {
      final aliases = legacyAliases[p];
      if (aliases != null) {
        out.addAll(aliases);
      } else {
        out.add(p);
      }
    }
    return out;
  }

  /// True when the user can open the Reports area (any report permission).
  static bool hasAnyReport(String role, Set<String> permissions) {
    if (role == 'BUSINESS_OWNER' || role == 'SYSTEM_OWNER') return true;
    final expanded = expand(permissions);
    return const [reportsSales, reportsInventory, reportsCredit, reportsActivityLog, reportsLoans, reportsValuation, reportsCommunications]
        .any(expanded.contains);
  }

  /// Pure permission check. Owners always pass; employees are checked against
  /// their permission set (mirrors backend `requirePermission`).
  static bool granted({
    required String role,
    required Set<String> permissions,
    required String permission,
  }) {
    if (role == 'BUSINESS_OWNER' || role == 'SYSTEM_OWNER') return true;
    return expand(permissions).contains(permission);
  }
}
