/**
 * Canonical permission identifiers.
 *
 * These are stored as strings on `Employee.permissions` (JSON) and enforced by
 * `requirePermission(...)` in the permission middleware. Business Owners and
 * System Owners implicitly hold every permission; employees are granted a
 * subset by their owner.
 */
export const PERMISSION = {
  POS_WRITE: 'pos:write',
  POS_REFUND: 'pos:refund',
  POS_VOID: 'pos:void',
  INVENTORY_READ: 'inventory:read',
  INVENTORY_WRITE: 'inventory:write',
  EXPENSES_WRITE: 'expenses:write',
  CREDIT_WRITE: 'credit:write',
  REPORTS_READ: 'reports:read',
  // Owner-only by default (financial controls).
  LOANS_READ: 'loans:read',
  LOANS_WRITE: 'loans:write',
  CASH_READ: 'cash:read',
  CASH_WRITE: 'cash:write',
} as const;

export type PermissionId = (typeof PERMISSION)[keyof typeof PERMISSION];

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSION);

/**
 * Permissions that are NOT part of the standard employee operational set and
 * are therefore owner-only unless explicitly granted.
 */
export const OWNER_ONLY_PERMISSIONS: string[] = [
  PERMISSION.LOANS_READ,
  PERMISSION.LOANS_WRITE,
  PERMISSION.CASH_READ,
  PERMISSION.CASH_WRITE,
];
