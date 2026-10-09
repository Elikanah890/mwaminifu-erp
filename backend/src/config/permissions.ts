/**
 * Canonical permission identifiers (Spec 9.8.1).
 *
 * Stored as strings on `Employee.permissions` (JSON) and enforced by
 * `requirePermission(...)`. Business Owners and System Owners implicitly hold
 * every permission; employees are granted a subset by their owner.
 *
 * `reports:general` and `reports:finance_overview` are OWNER-ONLY and can never
 * be granted to an employee (enforced by `requireOwnerOnly()`).
 */
export const PERMISSION = {
  // Sales / POS
  SALES_CREATE: 'sales:create',
  SALES_VIEW: 'sales:view',
  SALES_CANCEL: 'sales:cancel',
  SALES_REFUND: 'sales:refund',

  // Products / inventory
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_ADJUST: 'inventory:adjust',

  // Customers / credit
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CREDIT_CREATE: 'credit:create',
  CREDIT_COLLECT: 'credit:collect',
  CREDIT_READ: 'credit:read',
  CREDIT_WRITEOFF: 'credit:writeoff',

  // Expenses
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_APPROVE: 'expenses:approve',
  EXPENSES_READ: 'expenses:read',

  // Purchases / suppliers
  PURCHASES_VIEW: 'purchases:view',
  PURCHASES_CREATE: 'purchases:create',
  PURCHASES_APPROVE: 'purchases:approve',

  // Reports
  REPORTS_SALES: 'reports:sales',
  REPORTS_INVENTORY: 'reports:inventory',
  REPORTS_CREDIT: 'reports:credit',
  REPORTS_ACTIVITY_LOG: 'reports:activity_log',
  REPORTS_LOANS: 'reports:loans',
  REPORTS_VALUATION: 'reports:valuation',
  REPORTS_COMMUNICATIONS: 'reports:communications',

  // Shifts
  SHIFT_OPEN: 'shift:open',
  SHIFT_CLOSE: 'shift:close',
  SHIFT_VIEW: 'shift:view',

  // Employees
  EMPLOYEES_VIEW: 'employees:view',
  EMPLOYEES_MANAGE: 'employees:manage',

  // Loans / cash / finance
  LOANS_READ: 'loans:read',
  LOANS_WRITE: 'loans:write',
  CASH_READ: 'cash:read',
  CASH_WRITE: 'cash:write',
  FINANCE_READ: 'finance:read',

  // Owner-only reports — never grantable
  REPORTS_GENERAL: 'reports:general',
  REPORTS_FINANCE_OVERVIEW: 'reports:finance_overview',
} as const;

export type PermissionId = (typeof PERMISSION)[keyof typeof PERMISSION];

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSION);

/**
 * Permissions that can NEVER be granted to an employee. General Reports and
 * Finance Overview are Owner-only by design. Employee management
 * (`employees:manage`) is also Owner-only — delegating it would let an employee
 * create/alter staff and escalate their own privileges.
 */
export const NON_GRANTABLE_PERMISSIONS: string[] = [
  PERMISSION.REPORTS_GENERAL,
  PERMISSION.REPORTS_FINANCE_OVERVIEW,
  PERMISSION.EMPLOYEES_MANAGE,
];

/** Everything an Owner may assign to an employee. */
export const GRANTABLE_PERMISSIONS: string[] = ALL_PERMISSIONS.filter(
  (p) => !NON_GRANTABLE_PERMISSIONS.includes(p)
);

/**
 * Default permission set for a new full-operational employee (Spec 9.8.1).
 * Reporting beyond sales/inventory/credit, valuation, loans, cash, finance,
 * activity log and communications remain OFF by default but grantable.
 */
export const FULL_OPERATIONAL_PERMISSIONS: string[] = [
  PERMISSION.SALES_CREATE,
  PERMISSION.SALES_VIEW,
  PERMISSION.SALES_REFUND,
  PERMISSION.PRODUCTS_VIEW,
  PERMISSION.PRODUCTS_CREATE,
  PERMISSION.PRODUCTS_UPDATE,
  PERMISSION.PRODUCTS_DELETE,
  PERMISSION.INVENTORY_VIEW,
  PERMISSION.INVENTORY_ADJUST,
  PERMISSION.CUSTOMERS_VIEW,
  PERMISSION.CUSTOMERS_CREATE,
  PERMISSION.CUSTOMERS_UPDATE,
  PERMISSION.CREDIT_CREATE,
  PERMISSION.CREDIT_COLLECT,
  PERMISSION.EXPENSES_CREATE,
  PERMISSION.REPORTS_SALES,
  PERMISSION.REPORTS_INVENTORY,
  PERMISSION.REPORTS_CREDIT,
  PERMISSION.SHIFT_OPEN,
  PERMISSION.SHIFT_CLOSE,
  PERMISSION.SHIFT_VIEW,
];

/**
 * Legacy permission strings → canonical equivalents. Existing employee records
 * created before the vocabulary change are still honoured by `requirePermission`.
 */
export const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  'pos:write': [PERMISSION.SALES_CREATE, PERMISSION.SALES_VIEW, PERMISSION.SHIFT_OPEN, PERMISSION.SHIFT_CLOSE, PERMISSION.SHIFT_VIEW],
  'pos:refund': [PERMISSION.SALES_REFUND],
  'pos:void': [PERMISSION.SALES_CANCEL],
  'inventory:read': [PERMISSION.INVENTORY_VIEW, PERMISSION.PRODUCTS_VIEW],
  'inventory:write': [PERMISSION.INVENTORY_ADJUST, PERMISSION.PRODUCTS_CREATE, PERMISSION.PRODUCTS_UPDATE, PERMISSION.PRODUCTS_DELETE],
  'expenses:write': [PERMISSION.EXPENSES_CREATE],
  'credit:write': [PERMISSION.CUSTOMERS_CREATE, PERMISSION.CUSTOMERS_UPDATE, PERMISSION.CREDIT_CREATE, PERMISSION.CREDIT_COLLECT],
  'reports:read': [PERMISSION.REPORTS_SALES, PERMISSION.REPORTS_INVENTORY, PERMISSION.REPORTS_CREDIT],
};

/** Expand a stored permission list to include legacy aliases. */
export function expandPermissions(permissions: string[]): Set<string> {
  const set = new Set(permissions);
  for (const perm of permissions) {
    const aliases = LEGACY_PERMISSION_ALIASES[perm];
    if (aliases) aliases.forEach((a) => set.add(a));
  }
  return set;
}

/** Permissions that are NOT part of the standard employee operational set. */
export const OWNER_ONLY_PERMISSIONS: string[] = [
  PERMISSION.LOANS_READ,
  PERMISSION.LOANS_WRITE,
  PERMISSION.CASH_READ,
  PERMISSION.CASH_WRITE,
];
