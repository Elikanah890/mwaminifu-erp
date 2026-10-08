import { z } from 'zod';

export const createShopSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().optional(),
  currency: z.string().optional(),
});

export const updateShopSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  address: z.string().optional(),
  logoUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  currency: z.string().optional(),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  taxNumber: z.string().optional(),
});

export const createSaleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    unit: z.string().optional(),
    unitPrice: z.number().min(0).optional(),
    baseUnits: z.number().positive().optional(),
    discount: z.number().min(0).optional(),
  })),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  payments: z.array(z.object({
    method: z.string(),
    amount: z.number().positive(),
  })),
  suspended: z.boolean().optional(),
  notes: z.string().optional(),
  clientId: z.string().optional(),
  isOffline: z.boolean().optional(),
  allowNegativeStock: z.boolean().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().optional(),
  categoryId: z.string().optional(),
  supplier: z.string().optional(),
  brand: z.string().optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  reorderLevel: z.number().int().min(0).optional(),
  stockQuantity: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  unitConversion: z.number().positive().optional(),
  images: z.array(z.string()).optional(),
  barcode: z.string().optional(),
});

export const adjustStockSchema = z.object({
  quantityChange: z.number().int(),
  reason: z.string().min(1),
});

export const createExpenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
  receiptUrl: z.string().optional(),
  expenseDate: z.string().optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const creditPaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().optional(),
  method: z.string().optional(),
  saleId: z.string().optional(),
  notes: z.string().optional(),
});

export const createLoanSchema = z.object({
  lender: z.string().min(1),
  amount: z.number().positive(),
  interestRate: z.number().min(0).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export const loanRepaymentSchema = z.object({
  amount: z.number().positive(),
  repaymentDate: z.string().optional(),
  method: z.string().optional(),
  notes: z.string().optional(),
});

export const addEmployeeSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(1),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export const updatePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export const onboardBusinessSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(1),
  email: z.string().email().optional(),
  shopName: z.string().min(1),
  shopAddress: z.string().optional(),
});

export const createBusinessOwnerSchema = z.object({
  phone: z.string().min(10).max(15),
  name: z.string().min(1),
  email: z.string().email().optional(),
  shopName: z.string().min(1),
  shopAddress: z.string().optional(),
  currency: z.string().min(3).max(3).optional(),
  agentId: z.string().optional(),
});

export const createAgentSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const sendSmsSchema = z.object({
  shopId: z.string(),
  phone: z.string(),
  message: z.string().min(1),
});

export const syncPushSchema = z.object({
  shopId: z.string(),
  deviceId: z.string(),
  changes: z.record(
    z.string(),
    z.array(z.object({
      clientId: z.string(),
      data: z.record(z.unknown()),
      lastModified: z.string(),
    }))
  ),
});

export const updateShopSettingsSchema = z.object({
  currency: z.string().optional(),
  language: z.string().optional(),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  taxNumber: z.string().optional(),
  printerSettings: z.record(z.unknown()).optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

export const statusUpdateSchema = z.object({
  isActive: z.boolean(),
});

export const createNotificationSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  type: z.string().optional(),
  target: z.enum(['all_owners', 'all_agents', 'shop', 'user']).optional(),
  shopId: z.string().optional(),
  userId: z.string().optional(),
});

export const createSupportTicketSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  userId: z.string().optional(),
  shopId: z.string().optional(),
});

export const updateSupportTicketSchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED', 'CLOSED']),
});

export const addSupportMessageSchema = z.object({
  content: z.string().min(1),
});

export const assignSupportTicketSchema = z.object({
  assignedTo: z.string().min(1),
});

export const createPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  billingCycle: z.string().optional(),
  features: z.array(z.string()).optional(),
  limits: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  billingCycle: z.string().optional(),
  features: z.array(z.string()).optional(),
  limits: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export const updateSubscriptionSchema = z.object({
  plan: z.string().optional(),
  status: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateSettingsSchema = z.record(z.unknown());

export const createCapitalTransactionSchema = z.object({
  type: z.enum(['INJECTION', 'DRAWING']),
  amount: z.number().positive(),
  note: z.string().optional(),
});

export const createRecurringExpenseSchema = z.object({
  category: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  nextDate: z.string().optional(),
});

export const registerDeviceSessionSchema = z.object({
  deviceId: z.string().min(1),
});

export const createProductUnitConfigSchema = z.object({
  unitName: z.string().min(1),
  baseUnits: z.number().int().positive(),
  sellingPrice: z.number().min(0),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  pricingMode: z.enum(['FIXED', 'FLUCTUATING']).optional(),
  isDefault: z.boolean().optional(),
});

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().optional(),
  invoiceNo: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    unitCost: z.number().min(0),
    tax: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
  })).min(1),
  tax: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  status: z.enum(['DRAFT', 'ORDERED']).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export const receivePurchaseSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
  })).optional(),
  receivedAll: z.boolean().optional(),
});

export const purchasePaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.string().optional(),
});

export const cashTransactionSchema = z.object({
  type: z.enum(['OPENING', 'SALE', 'PURCHASE', 'EXPENSE', 'WITHDRAWAL', 'DEPOSIT', 'REFUND', 'ADJUSTMENT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'CREDIT_COLLECTION']),
  amount: z.number().positive(),
  note: z.string().optional(),
  reference: z.string().optional(),
});

export const writeOffSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().optional(),
});

export const refundStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'COMPLETED']),
  note: z.string().optional(),
});

export const cashReversalSchema = z.object({
  reason: z.string().min(1),
});

export const auditDeleteSchema = z.object({
  reason: z.string().min(1),
});

export const auditBulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
  reason: z.string().min(1),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

export const bulkPriceSchema = z.object({
  scope: z.enum(['all', 'category']).optional(),
  categoryId: z.string().optional(),
  type: z.enum(['percentage', 'fixed']),
  value: z.number(),
  field: z.enum(['sellingPrice', 'costPrice']).optional(),
});

export const importProductsSchema = z.object({
  rows: z.array(z.record(z.unknown())).min(1),
});

export const uploadImageSchema = z.object({
  dataUrl: z.string().min(1),
});
