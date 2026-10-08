import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { auditService } from './audit.service';

export class ExpenseService {
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
    category: string;
    amount: number;
    description?: string;
    receiptUrl?: string;
    expenseDate?: string;
    paymentMethod?: string;
  }) {
    const expense = await prisma.expense.create({
      data: {
        shopId,
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

    return prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...data,
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
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
