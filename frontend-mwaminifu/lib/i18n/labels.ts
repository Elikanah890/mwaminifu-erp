type Translator = (key: string) => string;

const STATUS_KEYS: Record<string, string> = {
  COMPLETED: 'completed',
  SUSPENDED: 'suspended',
  REFUNDED: 'refunded',
  VOIDED: 'voided',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PAID: 'paid',
  PARTIAL: 'partial',
  UNPAID: 'unpaid',
  OPEN: 'open',
  CLOSED: 'closed',
  DRAFT: 'draft',
  ORDERED: 'ordered',
  PARTIALLY_RECEIVED: 'partiallyReceived',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
  DEFAULTED: 'defaulted',
  LOW: 'lowStock',
  OUT: 'outOfStock',
  GOOD: 'goodStock',
  EXPIRED: 'expired',
  OVERDUE: 'overdue',
  GRACE: 'grace',
  LAPSED: 'lapsed',
};

export function statusLabel(t: Translator, value?: string | null): string {
  if (!value) return '-';
  return t(STATUS_KEYS[value] ?? value);
}

const MOVEMENT_KEYS: Record<string, string> = {
  PURCHASE: 'mvPurchase',
  SALE: 'mvSale',
  ADJUSTMENT: 'mvAdjustment',
  RETURN: 'mvReturn',
  DAMAGED: 'mvDamaged',
  OPENING: 'mvOpening',
  SALE_RETURN: 'mvSaleReturn',
};

export function movementTypeLabel(t: Translator, value?: string | null): string {
  if (!value) return '-';
  return t(MOVEMENT_KEYS[value] ?? value);
}

const CASH_TYPE_KEYS: Record<string, string> = {
  OPENING: 'cashOpening',
  SALE: 'cashSale',
  PURCHASE: 'cashPurchase',
  EXPENSE: 'cashExpense',
  WITHDRAWAL: 'cashWithdrawal',
  DEPOSIT: 'cashDeposit',
  REFUND: 'cashRefund',
  ADJUSTMENT: 'cashAdjustment',
  LOAN_DISBURSEMENT: 'cashLoanDisbursement',
  LOAN_REPAYMENT: 'cashLoanRepayment',
  CREDIT_COLLECTION: 'cashCreditCollection',
};

export function cashTypeLabel(t: Translator, value?: string | null): string {
  if (!value) return '-';
  return t(CASH_TYPE_KEYS[value] ?? value);
}

const ROLE_KEYS: Record<string, string> = {
  Cashier: 'cashier',
  cashier: 'cashier',
  Manager: 'manager',
  manager: 'manager',
  BUSINESS_OWNER: 'businessOwner',
  EMPLOYEE: 'employeePortal',
  AGENT: 'agentPortal',
  SYSTEM_OWNER: 'systemOwner',
};

export function roleLabel(t: Translator, value?: string | null): string {
  if (!value) return '-';
  return t(ROLE_KEYS[value] ?? value);
}

const PAYMENT_KEYS: Record<string, string> = {
  cash: 'cash',
  mobile: 'mobileMoney',
  mpesa: 'mpesa',
  tigo: 'tigoPesa',
  airtel: 'airtelMoney',
  halopesa: 'halopesa',
  mixx: 'mixxByYas',
  card: 'card',
  bank: 'bank',
  credit: 'credit',
};

export function paymentMethodLabel(t: Translator, value?: string | null): string {
  if (!value) return '-';
  return t(PAYMENT_KEYS[value] ?? value);
}

const AUDIT_KEYS: Record<string, string> = {
  SALE_CREATED: 'auditSaleCreated',
  SALE_VOIDED: 'auditSaleVoided',
  SALE_REFUNDED: 'auditSaleRefunded',
  REFUND_CREATED: 'auditRefundCreated',
  REFUND_APPROVED: 'auditRefundApproved',
  REFUND_REJECTED: 'auditRefundRejected',
  PURCHASE_CREATED: 'auditPurchaseCreated',
  PURCHASE_RECEIVED: 'auditPurchaseReceived',
  PURCHASE_PAYMENT: 'auditPurchasePayment',
  PURCHASE_CANCELLED: 'auditPurchaseCancelled',
  CASH_TRANSACTION: 'auditCashTransaction',
  CASH_REVERSAL: 'auditCashReversal',
  EXPENSE_CREATED: 'auditExpenseCreated',
  EXPENSE_APPROVED: 'auditExpenseApproved',
  EXPENSE_REJECTED: 'auditExpenseRejected',
  PAYMENT_RECORDED: 'auditPaymentRecorded',
  CREDIT_WRITE_OFF: 'auditCreditWriteOff',
  LOAN_CREATED: 'auditLoanCreated',
  LOAN_REPAYMENT: 'auditLoanRepayment',
  CUSTOMER_CREATED: 'auditCustomerCreated',
  STOCK_ADJUSTED: 'auditStockAdjusted',
  PRODUCT_UPDATED: 'auditProductUpdated',
};

export function auditActionLabel(t: Translator, value?: string | null): string {
  if (!value) return '-';
  return t(AUDIT_KEYS[value] ?? value);
}

export const ERROR_KEYS: Record<string, string> = {
  VALIDATION_ERROR: 'errorValidation',
  DUPLICATE_BARCODE: 'errorDuplicateBarcode',
  DUPLICATE_SKU: 'errorDuplicateSku',
  PRICE_BELOW_COST: 'errorPriceBelowCost',
  SHIFT_REQUIRED: 'errorShiftRequired',
  NOT_FOUND: 'errorNotFound',
  FORBIDDEN: 'errorForbidden',
  UNAUTHORIZED: 'errorUnauthorized',
  TOKEN_EXPIRED: 'errorUnauthorized',
  RATE_LIMITED: 'errorRateLimited',
  OFFLINE: 'errorOffline',
  NETWORK_ERROR: 'errorNetwork',
  BUSINESS_RULE_VIOLATION: 'errorBusinessRule',
  DUPLICATE_EXPENSE_CATEGORY: 'errorDuplicateCategory',
  CONFLICT: 'errorConflict',
  SESSION_LIMIT: 'errorSessionLimit',
  FEATURE_NOT_INCLUDED: 'errorFeatureNotIncluded',
  SMS_FAILED: 'errorSmsFailed',
};

/**
 * Localized error text for API/network failures. Known error codes map to
 * natural translations; unknown codes fall back to a safe, localized message
 * instead of leaking English backend text in Swahili mode.
 */
export function errorTranslationKey(code?: string | null): string | null {
  return code ? ERROR_KEYS[code] ?? null : null;
}

export function localizedErrorMessage(err: unknown, t: Translator): string {
  if (!err) return t('errorGeneric');
  const e = err as {
    code?: string;
    error?: { code?: string; message?: string };
    message?: string;
  };
  const code = e.code ?? e.error?.code;
  if (code && ERROR_KEYS[code]) return t(ERROR_KEYS[code]);
  if (code) return t('errorGeneric');
  const message = e.error?.message ?? e.message;
  return message || t('errorGeneric');
}
