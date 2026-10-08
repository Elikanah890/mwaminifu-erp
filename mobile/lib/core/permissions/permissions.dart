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
  static const reportsRead = 'reports:read';

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
    reportsRead,
  ];

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
