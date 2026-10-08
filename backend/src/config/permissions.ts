/**
 * Canonical permission identifiers.
 *
 * Stored as strings on `Employee.permissions` (JSON) and enforced by
 * `requirePermission(...)` in the permission middleware. Business Owners and
 * System Owners implicitly hold every permission; employees are granted a
 * subset by their owner.
 *
 * Spec 9.8.1 — reporting is split into individually-grantable permissions.
 * General Reports and Finance Overview are OWNER-ONLY and are never grantable
 * to any employee (enforced by `requireOwnerOnly()`).
 */
export const PERMISSION = {
  POS_WRITE: 'pos:write',
  POS_REFUND: 'pos:refund',
  POS_VOID: 'pos:void',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  EXPENSES_WRITE: 'expenses:write',
  CREDIT_WRITE: 'credit:write',

  // Reporting — individually grantable (Spec 8.5/9.8.1)
  REPORTS_SALES: 'reports:sales',
  REPORTS_INVENTORY: 'reports:inventory',
  REPORTS_CREDIT: 'reports:credit',
  REPORTS_ACTIVITY_LOG: 'reports:activity_log',
  REPORTS_LOANS: 'reports:loans',
  REPORTS_VALUATION: 'reports:valuation',
  REPORTS_COMMUNICATIONS: 'reports:communications',

  // Owner-only reports — never grantable to employees
  REPORTS_GENERAL: 'reports:general',
  REPORTS_FINANCE_OVERVIEW: 'reports:finance_overview',

  // Owner-only financial controls (not part of the default employee set)
  LOANS_READ: 'loans:read',
  LOANS_WRITE: 'loans:write',
  CASH_READ: 'cash:read',
  CASH_WRITE: 'cash:write',
} as const;

export type PermissionId = (typeof PERMISSION)[keyof typeof PERMISSION];

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSION);

/** Permissions that are NOT part of the standard employee operational set. */
export const OWNER_ONLY_PERMISSIONS: string[] = [
  PERMISSION.LOANS_READ,
  PERMISSION.LOANS_WRITE,
  PERMISSION.CASH_READ,
  PERMISSION.CASH_WRITE,
];

/** Reporting permissions an Owner may grant to an employee (off by default). */
export const GRANTABLE_REPORT_PERMISSIONS: string[] = [
  PERMISSION.REPORTS_SALES,
  PERMISSION.REPORTS_INVENTORY,
  PERMISSION.REPORTS_CREDIT,
  PERMISSION.REPORTS_ACTIVITY_LOG,
  PERMISSION.REPORTS_LOANS,
  PERMISSION.REPORTS_VALUATION,
  PERMISSION.REPORTS_COMMUNICATIONS,
];

/**
 * Permissions that can NEVER be granted to an employee. General Reports and
 * Finance Overview are Owner-only by design.
 */
export const NON_GRANTABLE_PERMISSIONS: string[] = [
  PERMISSION.REPORTS_GENERAL,
  PERMISSION.REPORTS_FINANCE_OVERVIEW,
];
