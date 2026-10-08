export interface User {
  id: string;
  username?: string;
  phone?: string;
  name: string;
  email?: string;
  role: 'SYSTEM_OWNER' | 'AGENT' | 'BUSINESS_OWNER' | 'EMPLOYEE';
}

export interface Agent {
  id: string;
  username: string;
  name: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  _count?: { onboardedUsers: number };
}

export interface PlatformStats {
  totalBusinesses: number;
  totalAgents: number;
  totalSales: number;
  totalShops: number;
  totalRevenue: number;
  totalEmployees: number;
  totalProducts: number;
  todayRevenue: number;
  todaySales: number;
  todayNewOwners: number;
  pendingTickets: number;
  revenueSeries: Array<{ date: string; orders: number; revenue: number }>;
}

export interface AgentStats {
  totalBusinesses: number;
  activeBusinesses: number;
  inactiveBusinesses: number;
  pendingBusinesses: number;
  totalShops: number;
  businessesThisMonth: number;
  businessesThisYear: number;
  shopsThisMonth: number;
  shopsThisYear: number;
}

export interface AgentBusiness {
  id: string;
  name: string;
  // Spec 12.2 — Agents never receive owner phone/email.
  isActive: boolean;
  isPinSet: boolean;
  createdAt: string;
  agentId: string;
  ownedShops: Array<{
    id: string;
    name: string;
    address: string | null;
    isArchived: boolean;
    createdAt: string;
    _count?: { employees: number; products: number; sales: number };
    subscriptions?: Array<{ plan: string; status: string; isActive: boolean; endDate: string | null }>;
  }>;
  _count: {
    ownedShops: number;
    sales: number;
  };
  lastActivity?: string | null;
}

export interface AgentPortalListQuery {
  [key: string]: string | undefined;
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
  from?: string;
  to?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface AgentDetail extends Agent {
  onboardedUsers: Array<{ id: string; name: string; phone: string | null; isActive: boolean; createdAt: string }>;
  stats: { onboardedUsers: number; activeUsers: number; transactions: number; revenue: number };
}

export interface BusinessOwner {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  isPinSet: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  agent?: { id: string; name: string; username: string } | null;
  _count?: { ownedShops: number; sales: number };
}

export interface ShopSummary {
  id: string;
  name: string;
  address?: string | null;
  isArchived: boolean;
  createdAt: string;
  _count?: { sales: number; products: number; employees: number };
}

export interface BusinessOwnerDetail extends BusinessOwner {
  _count: { ownedShops: number; sales: number };
  ownedShops: ShopSummary[];
  stats: { revenue: number; transactions: number; expenses: number; outstandingCredit: number; subscriptions: unknown[] };
}

export interface Business {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  agentName?: string | null;
  shopCount: number;
  transactions: number;
  revenue: number;
  lastLoginAt?: string | null;
  createdAt: string;
  ownedShops?: Array<{ id: string; name: string; createdAt: string }>;
}

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  address?: string | null;
  isArchived: boolean;
  currency: string;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  createdAt: string;
  owner?: { id: string; name: string; phone?: string; email?: string };
  _count?: { sales: number; products: number; employees: number };
}

export interface ShopDetail extends Omit<Shop, '_count'> {
  owner: { id: string; name: string; phone?: string; email?: string };
  _count: { products: number; sales: number; expenses: number; loans: number; customers: number };
  employees: Array<{ id: string; role: string; user: { id: string; name: string; phone: string | null } }>;
  stats: {
    revenue: number;
    transactions: number;
    expenses: number;
    outstandingCredit: number;
    subscription?: { id: string; plan: string; status: string; isActive: boolean; endDate?: string | null } | null;
  };
}

export interface Employee {
  id: string;
  userId: string;
  shopId: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  user?: { id: string; name: string; phone?: string; email?: string; isActive: boolean; lastLoginAt?: string | null };
  shop?: { id: string; name: string };
}

export type SaleStatus = 'COMPLETED' | 'SUSPENDED' | 'REFUNDED' | 'VOIDED';

export interface Sale {
  id: string;
  shopId: string;
  userId: string;
  customerId?: string | null;
  saleDate: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  status: SaleStatus;
  paymentMethod?: string | null;
  receiptNumber?: string | null;
  shop?: { id: string; name: string };
  user?: { id: string; name: string };
  customer?: { id: string; name: string } | null;
  _count?: { items: number };
}

export interface SaleItem {
  id: string;
  productId: string;
  product: { id: string; name: string; sku?: string | null };
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  unit?: string | null;
}

export interface SaleDetail extends Omit<Sale, '_count'> {
  items: SaleItem[];
  paymentDetails: Array<{ method: string; amount: number }>;
  shop: { id: string; name: string; currency: string };
  user: { id: string; name: string; phone?: string };
  customer?: { id: string; name: string; phone?: string } | null;
  creditPayments: unknown[];
}

export interface RevenueData {
  summary: {
    grossRevenue: number;
    refunds: number;
    voids: number;
    netRevenue: number;
    orders: number;
    expenses: number;
    outstandingCredit: number;
  };
  byShop: Array<{ shopId: string; shopName: string; revenue: number; orders: number }>;
  byMethod: Array<{ method: string; amount: number; count: number }>;
  daily: Array<{ date: string; orders: number; revenue: number }>;
}

export interface ActivityLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  saleId?: string | null;
  createdAt: string;
  user?: { id: string; name: string; username?: string | null; role: string };
  shop?: { id: string; name: string } | null;
}

export interface AdminNotification {
  id: string;
  title: string;
  body: string;
  type?: string | null;
  isRead: boolean;
  isSent: boolean;
  createdAt: string;
  user?: { id: string; name: string; phone?: string } | null;
  shop?: { id: string; name: string } | null;
}

export type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  resolvedAt?: string | null;
  createdAt: string;
  user?: { id: string; name: string; phone?: string } | null;
  shop?: { id: string; name: string } | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  billingCycle: string;
  features: string[];
  limits: Record<string, unknown>;
  isActive: boolean;
  isDefault?: boolean;
  displayOrder?: number;
  createdAt: string;
}

export interface ShopSubscription {
  id: string;
  plan: string;
  status: string;
  isActive: boolean;
  startDate: string;
  endDate?: string | null;
  shop?: { id: string; name: string; isArchived: boolean; owner: { id: string; name: string; phone?: string } };
}

export interface DemoAccounts {
  agents: Array<{
    id: string;
    username: string;
    name: string;
    phone?: string;
    isActive: boolean;
    role: string;
    password: string;
    _count?: { onboardedUsers: number };
  }>;
  owners: Array<{
    id: string;
    name: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    isPinSet: boolean;
    agentName?: string | null;
    pin: string;
    shops: Array<{ id: string; name: string }>;
    role: string;
  }>;
  employees: Array<{
    id: string;
    name: string;
    phone?: string;
    role: string;
    shopName: string;
    isActive: boolean;
    permissions: string[];
    pin: string;
    roleType: string;
  }>;
}

export interface AgentDetail extends Agent {
  onboardedUsers: Array<{
    id: string;
    name: string;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
  }>;
  stats: {
    onboardedUsers: number;
    activeUsers: number;
    transactions: number;
    revenue: number;
  };
}

export interface AgentProfile {
  id: string;
  username: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { onboardedUsers: number };
  stats?: { onboardedBusinesses: number; totalShops: number };
}

export interface Subscription {
  id: string;
  shopId: string;
  plan: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  shop?: {
    id: string;
    name: string;
    isArchived: boolean;
    owner: { id: string; name: string; phone?: string | null };
  };
}

export interface RegionRow {
  region: string;
  shops: number;
  owners: number;
  revenue: number;
  agents: number;
}

export type AdminSettings = Record<string, unknown>;

export interface OwnersReportData {
  summary: {
    totalOwners: number;
    activeOwners: number;
    totalRevenue: number;
    totalTransactions: number;
  };
  data: Array<{
    ownerId: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    isActive: boolean;
    agentName?: string | null;
    shops: number;
    transactions: number;
    revenue: number;
    lastLoginAt?: string | null;
    createdAt: string;
  }>;
}

// ---------------------------------------------------------------------------
// Business Owner / Employee domain types
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  shopId: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  children?: Array<Category & { _count?: { products: number } }>;
  isDefault?: boolean;
  isArchived?: boolean;
  _count?: { products: number };
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  sku?: string | null;
  categoryId?: string | null;
  category?: { id?: string; name: string } | null;
  supplier?: string | null;
  brand?: string | null;
  costPrice: number;
  sellingPrice: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  reorderLevel: number;
  stockQuantity: number;
  unit: string;
  baseUnitStock?: number;
  baseUnitName?: string;
  unitConfigs?: ProductUnitConfig[];
  barcode?: string | null;
  isActive: boolean;
  isService?: boolean;
  createdAt?: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  outstandingBalance: number;
  totalCreditGiven: number;
  totalRepaid: number;
  creditLimit?: number;
  isBlacklisted?: boolean;
  status?: string;
  isArchived: boolean;
  createdAt: string;
}

export interface SaleListItem {
  id: string;
  shopId: string;
  saleDate: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  status: 'COMPLETED' | 'SUSPENDED' | 'REFUNDED' | 'VOIDED';
  paymentMethod?: string | null;
  receiptNumber?: string | null;
  user?: { id?: string; name: string } | null;
  customer?: { id?: string; name: string } | null;
  items?: Array<{ id?: string; productId?: string; quantity: number; unitPrice: number; total: number; product?: { name: string } }>;
}

export interface Expense {
  id: string;
  shopId: string;
  category: string;
  amount: number;
  description?: string | null;
  expenseDate: string;
  receiptUrl?: string | null;
  paymentMethod?: string | null;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  user?: { name: string } | null;
}

export interface Loan {
  id: string;
  shopId: string;
  lender: string;
  amount: number;
  interestRate: number;
  dueDate?: string | null;
  remainingBalance: number;
  status: 'ACTIVE' | 'PAID' | 'DEFAULTED';
  notes?: string | null;
  createdAt: string;
  _count?: { repayments: number };
  repayments?: Array<{ id: string; amount: number; repaymentDate: string; method: string }>;
}

export interface EmployeeRow {
  id: string;
  userId: string;
  shopId: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  user?: { id: string; name: string; phone?: string | null; email?: string | null; isActive: boolean };
  shop?: { id: string; name: string };
}

export interface Shift {
  id: string;
  userId: string;
  shopId: string;
  openingCashBalance: number;
  countedCash?: number | null;
  expectedCash?: number | null;
  discrepancy?: number | null;
  isActive: boolean;
  startedAt: string;
  closedAt?: string | null;
}

export interface ShopDashboard {
  todaySales: number;
  todayProfit: number;
  todayGrossProfit?: number;
  todayCogs?: number;
  todayExpenses?: number;
  transactionsToday?: number;
  cashInHand: number;
  mobileMoneyReceived: number;
  creditGivenToday: number;
  expensesToday: number;
  lowStockItems: number;
  outstandingCredit?: number;
  stockValue?: number;
  stockItems?: number;
  pendingOrders: number;
  totalCustomers: number;
  activeLoans: number;
  subscriptionStatus: string;
  lastSyncStatus: string;
  salesTrend: Array<{ date: string; total: number }>;
  topProducts: Array<{ name: string; quantity: number }>;
  actionItems?: Array<{ type: string; label: string; count: number; severity: string }>;
}

export interface SalesReport {
  summary: { totalSales: number; totalItems: number; averageTicket: number; totalTransactions: number };
  data: SaleListItem[];
}

export interface InventoryReport {
  summary: { totalValue: number; totalRetailValue: number; totalItems: number; totalProducts: number };
  data: Array<{ name: string; sku?: string | null; costPrice: number; sellingPrice: number; stockQuantity: number }>;
}

export interface ProfitReport {
  summary: { totalRevenue: number; totalDiscounts: number; totalExpenses: number; cogs?: number; grossProfit?: number; netProfit?: number; estimatedProfit: number };
  expensesByCategory: Array<{ category: string; total: number }>;
}

export interface CreditReport {
  summary: { totalOutstanding: number; customersWithDebt: number };
  data: Customer[];
}

export interface LoansReport {
  summary: { totalBorrowed: number; totalOutstanding: number; totalRepaid: number; totalLoans: number };
  data: Loan[];
}

export interface CashFlowReport {
  summary: { totalInflow: number; totalOutflow: number; netCashFlow: number; creditCollections: number };
}

export interface PaymentMethodsReport {
  data: Record<string, number>;
}

export interface ShopSettings {
  id?: string;
  shopId: string;
  currency?: string;
  language?: string;
  receiptHeader?: string | null;
  receiptFooter?: string | null;
  taxNumber?: string | null;
}

export interface OwnerCapitalTransaction {
  id: string;
  shopId: string;
  userId: string;
  type: string;
  amount: number;
  note?: string | null;
  createdAt: string;
  user?: { name: string };
}

export interface CapitalSummary {
  injections: number;
  drawings: number;
  net: number;
}

export interface RecurringExpense {
  id: string;
  shopId: string;
  category: string;
  amount: number;
  frequency: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  nextDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductUnitConfig {
  id: string;
  productId: string;
  unitName: string;
  baseUnits: number;
  sellingPrice: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  pricingMode: string;
  isDefault: boolean;
  createdAt: string;
}

export interface DeviceUser {
  id: string;
  name: string;
  phone?: string | null;
  role: string;
}

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: { products: number; purchases: number };
}

export interface Purchase {
  id: string;
  shopId: string;
  supplierId?: string | null;
  supplier?: { id: string; name: string; phone?: string | null } | null;
  date: string;
  invoiceNo?: string | null;
  items: Array<{ productId: string; quantity: number; unitCost: number; tax?: number; discount?: number; receivedQuantity?: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  status: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
  dueDate?: string | null;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  shopId: string;
  productId: string;
  product?: { id: string; name: string; sku?: string | null };
  type: string;
  quantity: number;
  balanceAfter: number;
  reference?: string | null;
  reason?: string | null;
  user?: { name: string } | null;
  createdAt: string;
}

export interface CashTransaction {
  id: string;
  shopId: string;
  type: string;
  amount: number;
  reference?: string | null;
  note?: string | null;
  user?: { name: string } | null;
  createdAt: string;
}

export interface CashSummary {
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  transactionCount: number;
}

export interface ReceivablesAging {
  summary: { totalOutstanding: number; buckets: Record<string, number>; customersWithDebt: number };
  data: Array<{
    customerId: string;
    name: string;
    phone?: string | null;
    outstandingBalance: number;
    creditLimit: number;
    isBlacklisted: boolean;
    bucket: string;
  }>;
}

export interface PayablesReport {
  totalPayable: number;
  count: number;
  items: Array<{
    purchaseId: string;
    invoiceNo?: string | null;
    supplier: string;
    date: string;
    dueDate?: string | null;
    total: number;
    amountPaid: number;
    balance: number;
    status: string;
  }>;
}

export interface StockValuation {
  totalCost: number;
  totalRetail: number;
  totalItems: number;
  totalProducts: number;
  potentialProfit: number;
}

export interface EmployeeDashboard {
  shiftStatus: 'OPEN' | 'CLOSED';
  activeShift?: Shift | null;
  todaySales: number;
  transactions: number;
  itemsSold: number;
  averageSale: number;
  recentSales: Array<{
    id: string;
    saleDate: string;
    grandTotal: number;
    receiptNumber?: string | null;
    paymentMethod?: string | null;
    customer?: { name: string } | null;
  }>;
}

export type ReportPeriod = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface ProductAnalysisRow {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  share: number;
  trendPct: number;
}

export interface SalesAnalytics {
  period: ReportPeriod;
  range: { from: string; to: string };
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    totalItems: number;
    averageSale: number;
    totalCustomers: number;
    totalDiscounts: number;
    netSales: number;
  };
  trend: Array<{ date: string; revenue: number }>;
  paymentMethods: Array<{ method: string; amount: number }>;
  perProduct: ProductAnalysisRow[];
  perCategory: Array<{ category: string; quantity: number; revenue: number; profit: number }>;
}

export interface InventoryAnalytics {
  summary: {
    totalProducts: number;
    totalItems: number;
    totalValue: number;
    totalRetailValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  perProduct: Array<{
    productId: string;
    name: string;
    sku?: string | null;
    category: string;
    stock: number;
    costPrice: number;
    sellingPrice: number;
    reorderLevel: number;
    value: number;
    status: 'GOOD' | 'LOW' | 'OUT';
  }>;
  byCategory: Array<{ category: string; value: number; items: number; products: number }>;
}

export interface ProfitAnalytics {
  period: ReportPeriod;
  summary: {
    totalRevenue: number;
    totalDiscounts: number;
    cogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
  };
  trend: Array<{ date: string; revenue: number }>;
  perProduct: ProductAnalysisRow[];
  perCategory: Array<{ category: string; revenue: number; profit: number }>;
  expensesByCategory: Array<{ category: string; total: number }>;
}

export interface ValuationAnalytics {
  summary: {
    stockValue: number;
    cashBalance: number;
    creditReceivable: number;
    loansOutstanding: number;
    supplierPayables: number;
    totalAssets: number;
    totalLiabilities: number;
    net: number;
  };
  assets: Array<{ name: string; label: string; amount: number }>;
  liabilities: Array<{ name: string; label: string; amount: number }>;
}

export interface AuditLogEntry {
  id: string;
  shopId: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { name: string } | null;
}

export interface RefundItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit?: string;
}

export interface Refund {
  id: string;
  shopId: string;
  saleId: string;
  userId: string;
  customerId?: string | null;
  refundNumber?: string | null;
  items: RefundItem[];
  amount: number;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvedBy?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  sale?: { receiptNumber?: string | null; grandTotal: number } | null;
  customer?: { id: string; name: string; phone?: string | null } | null;
  user?: { id?: string; name: string } | null;
}

export interface CustomerProfile {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  outstandingBalance: number;
  totalCreditGiven: number;
  totalRepaid: number;
  creditLimit: number;
  isBlacklisted: boolean;
  status: string;
  financialSummary: {
    totalPurchases: number;
    totalPaid: number;
    outstandingBalance: number;
    creditLimit: number;
    availableCredit: number;
    purchaseCount: number;
  };
  recentSales: Array<{
    id: string;
    receiptNumber?: string | null;
    grandTotal: number;
    paymentMethod?: string | null;
    saleDate: string;
    status: string;
  }>;
  recentPayments: Array<{ id: string; amount: number; paymentDate: string; method: string; notes?: string | null }>;
  ledger: Array<{ id: string; type: string; amount: number; balanceAfter: number; description?: string | null; createdAt: string }>;
}

export interface FinanceOverview {
  period: string;
  range: { from: string; to: string };
  summary: {
    revenue: number;
    expenses: number;
    netProfit: number;
    cashBalance: number;
    receivables: number;
    payables: number;
    outstandingLoans: number;
  };
}
