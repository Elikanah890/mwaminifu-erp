import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { auditService } from './audit.service';

/**
 * Built-in categories. `nameEn` is the stable value stored on expenses so
 * existing reports and exports stay readable; the UI shows nameSw in Swahili.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { nameEn: 'Rent', nameSw: 'Kodi' },
  { nameEn: 'Wages', nameSw: 'Mishahara' },
  { nameEn: 'Transport', nameSw: 'Usafirishaji' },
  { nameEn: 'Utilities', nameSw: 'Huduma (maji, umeme)' },
  { nameEn: 'Restocking', nameSw: 'Ununuzi wa bidhaa' },
  { nameEn: 'Food', nameSw: 'Chakula' },
  { nameEn: 'Other', nameSw: 'Nyingine' },
] as const;

export type ExpenseCategoryView = {
  id: string;
  value: string;
  nameEn: string;
  nameSw: string;
  isDefault: boolean;
};

function normalizeCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export class ExpenseService {
  /**
   * Default (built-in) categories plus this shop's custom categories. Custom
   * entries are tenant-scoped by `shopId`, never global.
   */
  async listExpenseCategories(shopId: string): Promise<ExpenseCategoryView[]> {
    const custom = await prisma.expenseCategory.findMany({
      where: { shopId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    });

    const defaults: ExpenseCategoryView[] = DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
      id: `default:${category.nameEn}`,
      value: category.nameEn,
      nameEn: category.nameEn,
      nameSw: category.nameSw,
      isDefault: true,
    }));

    return [
      ...defaults,
      ...custom.map((category) => ({
        id: category.id,
        value: category.nameEn,
        nameEn: category.nameEn,
        nameSw: category.nameSw,
        isDefault: false,
      })),
    ];
  }

  async createExpenseCategory(
    shopId: string,
    userId: string,
    data: { nameEn: string; nameSw: string }
  ): Promise<ExpenseCategoryView> {
    const nameEn = normalizeCategoryName(data.nameEn);
    const nameSw = normalizeCategoryName(data.nameSw);

    if (!nameEn || !nameSw) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: 'English and Swahili names are required' };
    }

    const lowered = nameEn.toLowerCase();
    if (DEFAULT_EXPENSE_CATEGORIES.some((category) => category.nameEn.toLowerCase() === lowered)) {
      throw { status: 409, code: 'DUPLICATE_EXPENSE_CATEGORY', message: `"${nameEn}" already exists as a built-in category` };
    }

    const existing = await prisma.expenseCategory.findFirst({
      where: { shopId, isArchived: false, nameEn: { equals: nameEn, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw { status: 409, code: 'DUPLICATE_EXPENSE_CATEGORY', message: `"${nameEn}" already exists for this shop` };
    }

    let created;
    try {
      created = await prisma.expenseCategory.create({
        data: { shopId, nameEn, nameSw },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw { status: 409, code: 'DUPLICATE_EXPENSE_CATEGORY', message: `"${nameEn}" already exists for this shop` };
      }
      throw err;
    }

    await auditService.logDetailed({
      shopId,
      userId,
      action: 'EXPENSE_CATEGORY_CREATED',
      entity: 'ExpenseCategory',
      entityId: created.id,
      newValue: { nameEn, nameSw },
    });

    return {
      id: created.id,
      value: created.nameEn,
      nameEn: created.nameEn,
      nameSw: created.nameSw,
      isDefault: false,
    };
  }

  async listExpenses(shopId: string, filters: {
    page?: number;
    limit?: number;
    category?: string;
    from?: string;
    to?: string;
    approvalStatus?: string;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = { shopId, deletedAt: null };
    if (filters.category) where.category = filters.category;
    if (filters.approvalStatus) where.approvalStatus = filters.approvalStatus;
    if (filters.from || filters.to) {
      const expenseDate: Prisma.DateTimeFilter = {};
      if (filters.from) expenseDate.gte = new Date(filters.from);
      if (filters.to) expenseDate.lte = new Date(filters.to);
      where.expenseDate = expenseDate;
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return { expenses, total, page, limit };
  }

  async getExpense(expenseId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { user: { select: { name: true } } },
    });
    if (!expense) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Expense not found' };
    }
    return expense;
  }

  async createExpense(shopId: string, userId: string, data: {
    clientId?: string;
    category: string;
    amount: number;
    description?: string;
    receiptUrl?: string;
    expenseDate?: string;
    paymentMethod?: string;
  }) {
    if (data.clientId) {
      const existing = await prisma.expense.findFirst({ where: { shopId, clientId: data.clientId } });
      if (existing) return existing;
    }

    const expense = await prisma.expense.create({
      data: {
        shopId,
        clientId: data.clientId ?? null,
        userId,
        category: data.category,
        amount: data.amount,
        description: data.description,
        receiptUrl: data.receiptUrl,
        paymentMethod: data.paymentMethod || 'cash',
        approvalStatus: 'PENDING',
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
      },
    });

    await auditService.logDetailed({
      shopId,
      userId,
      action: 'EXPENSE_CREATED',
      entity: 'Expense',
      entityId: expense.id,
      newValue: { category: data.category, amount: data.amount, approvalStatus: 'PENDING' },
    });

    return expense;
  }

  async updateExpense(expenseId: string, data: {
    category?: string;
    amount?: number;
    description?: string;
    receiptUrl?: string;
    expenseDate?: string;
    paymentMethod?: string;
  }) {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Expense not found' };
    }
    if (expense.approvalStatus === 'APPROVED') {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Approved expenses cannot be edited. Reverse the expense instead.' };
    }

    // Whitelist: approvalStatus, shopId and deletedAt are never editable here.
    return prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.receiptUrl !== undefined ? { receiptUrl: data.receiptUrl } : {}),
        ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
        ...(data.expenseDate !== undefined ? { expenseDate: new Date(data.expenseDate) } : {}),
      },
    });
  }

  async deleteExpense(expenseId: string, userId: string) {
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Expense not found' };
    }
    if (expense.approvalStatus === 'APPROVED') {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Approved expenses cannot be deleted. Reverse the expense instead.' };
    }

    const result = await prisma.expense.update({
      where: { id: expenseId },
      data: { deletedAt: new Date() },
    });

    await auditService.logDetailed({
      shopId: expense.shopId,
      userId,
      action: 'EXPENSE_DELETED',
      entity: 'Expense',
      entityId: expenseId,
      oldValue: { amount: expense.amount, category: expense.category, approvalStatus: expense.approvalStatus },
    });

    return result;
  }

  async setApprovalStatus(expenseId: string, approvalStatus: string, userId: string) {
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(approvalStatus)) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: 'Invalid approval status' };
    }

    const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!expense) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Expense not found' };
    }
    if (expense.approvalStatus === 'APPROVED') {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Expense is already approved' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.expense.update({
        where: { id: expenseId },
        data: { approvalStatus },
      });

      // Once approved, post the expense to the cash ledger as a cash outflow.
      if (approvalStatus === 'APPROVED') {
        await tx.cashTransaction.create({
          data: {
            shopId: expense.shopId,
            type: 'EXPENSE',
            amount: -Math.abs(expense.amount),
            reference: expense.id,
            userId,
            note: `${expense.category}${expense.description ? ` — ${expense.description}` : ''}`,
          },
        });
      }

      return result;
    });

    await auditService.logDetailed({
      shopId: expense.shopId,
      userId,
      action: approvalStatus === 'APPROVED' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
      entity: 'Expense',
      entityId: expenseId,
      oldValue: { approvalStatus: expense.approvalStatus },
      newValue: { approvalStatus },
    });

    return updated;
  }
}

export const expenseService = new ExpenseService();
