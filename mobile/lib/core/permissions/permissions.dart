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

  static const posWrite = 'pos:write';
  static const posRefund = 'pos:refund';
  static const posVoid = 'pos:void';
  static const inventoryRead = 'inventory:read';
  static const inventoryWrite = 'inventory:write';
  static const expensesWrite = 'expenses:write';
  static const creditWrite = 'credit:write';

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

  /// Owner-only financial permissions (not part of the default employee set).
  static const loansRead = 'loans:read';
  static const loansWrite = 'loans:write';
  static const cashRead = 'cash:read';
  static const cashWrite = 'cash:write';

  /// Standard V1 operational permission set for a full shop employee.
  /// Kept in sync with the backend `FULL_OPERATIONAL_PERMISSIONS` constant.
  static const List<String> fullOperational = [
    posWrite,
    posRefund,
    posVoid,
    inventoryRead,
    inventoryWrite,
    expensesWrite,
    creditWrite,
    reportsSales,
    reportsInventory,
    reportsCredit,
  ];

  /// True when the user can open the Reports area (any report permission).
  static bool hasAnyReport(String role, Set<String> permissions) {
    if (role == 'BUSINESS_OWNER' || role == 'SYSTEM_OWNER') return true;
    return const [reportsSales, reportsInventory, reportsCredit, reportsActivityLog, reportsLoans, reportsValuation, reportsCommunications]
        .any(permissions.contains);
  }

  /// Pure permission check. Owners always pass; employees are checked against
  /// their permission set (mirrors backend `requirePermission`).
  static bool granted({
    required String role,
    required Set<String> permissions,
    required String permission,
  }) {
    if (role == 'BUSINESS_OWNER' || role == 'SYSTEM_OWNER') return true;
    return permissions.contains(permission);
  }
}
