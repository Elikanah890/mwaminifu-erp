import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { auditService } from './audit.service';

const CASH_TYPES = [
  'OPENING', 'SALE', 'PURCHASE', 'EXPENSE', 'WITHDRAWAL', 'DEPOSIT',
  'REFUND', 'ADJUSTMENT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'CREDIT_COLLECTION',
];

export class CashService {
  async listTransactions(shopId: string, filters: { page?: number; limit?: number; type?: string; from?: string; to?: string }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(filters.limit) || 100));
    const skip = (page - 1) * limit;

    const where: Prisma.CashTransactionWhereInput = { shopId };
    if (filters.type) where.type = filters.type;
    if (filters.from || filters.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.from) createdAt.gte = new Date(filters.from);
      if (filters.to) createdAt.lte = new Date(filters.to);
      where.createdAt = createdAt;
    }

    const [transactions, total] = await Promise.all([
      prisma.cashTransaction.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.cashTransaction.count({ where }),
    ]);

    return { transactions, total, page, limit };
  }

  async getSummary(shopId: string) {
    const [transactions, openingToday] = await Promise.all([
      prisma.cashTransaction.findMany({
        where: { shopId },
        orderBy: { createdAt: 'asc' },
      }),
      this.getOpeningBalance(shopId),
    ]);

    let totalIn = 0;
    let totalOut = 0;
    for (const t of transactions) {
      if (t.amount >= 0) totalIn += t.amount;
      else totalOut += Math.abs(t.amount);
    }

    const closingBalance = openingToday + totalIn - totalOut;

    return {
      openingBalance: openingToday,
      totalIn,
      totalOut,
      closingBalance,
      transactionCount: transactions.length,
    };
  }

  private async getOpeningBalance(shopId: string) {
    const opening = await prisma.cashTransaction.aggregate({
      where: { shopId, type: 'OPENING' },
      _sum: { amount: true },
    });
    return opening._sum.amount || 0;
  }

  async recordTransaction(
    shopId: string,
    userId: string,
    data: { type: string; amount: number; note?: string; reference?: string }
  ) {
    if (!CASH_TYPES.includes(data.type)) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: `Invalid cash transaction type. Allowed: ${CASH_TYPES.join(', ')}` };
    }

    // Normalize sign: withdrawals/expenses/purchases are negative cash movements.
    const negativeTypes = ['PURCHASE', 'EXPENSE', 'WITHDRAWAL', 'REFUND', 'LOAN_DISBURSEMENT'];
    const amount = negativeTypes.includes(data.type) ? -Math.abs(data.amount) : Math.abs(data.amount);

    const transaction = await prisma.cashTransaction.create({
      data: {
        shopId,
        type: data.type,
        amount,
        note: data.note,
        reference: data.reference,
        userId,
      },
      include: { user: { select: { name: true } } },
    });

    await auditService.logDetailed({
      shopId,
      userId,
      action: 'CASH_TRANSACTION',
      entity: 'CashTransaction',
      entityId: transaction.id,
      newValue: { type: data.type, amount },
    });

    return transaction;
  }

  /**
   * Corrects a posted cash transaction using a reversal entry (never a delete).
   * The original record is preserved; the reversal is recorded as an ADJUSTMENT
   * with the opposite sign and a reference back to the original transaction.
   */
  async reverseTransaction(
    shopId: string,
    userId: string,
    transactionId: string,
    data: { reason: string }
  ) {
    const original = await prisma.cashTransaction.findFirst({
      where: { id: transactionId, shopId },
    });
    if (!original) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Cash transaction not found' };
    }
    if (original.type === 'ADJUSTMENT' && original.reference?.startsWith('REVERSAL:')) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'A reversal entry cannot itself be reversed' };
    }
    if (!data.reason || !data.reason.trim()) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: 'A reversal reason is required' };
    }

    const reversal = await prisma.cashTransaction.create({
      data: {
        shopId,
        type: 'ADJUSTMENT',
        amount: -original.amount,
        reference: `REVERSAL:${original.id}`,
        userId,
        note: `Reversal of ${original.type} (${original.reference || original.id}): ${data.reason}`,
      },
      include: { user: { select: { name: true } } },
    });

    await auditService.logDetailed({
      shopId,
      userId,
      action: 'CASH_REVERSAL',
      entity: 'CashTransaction',
      entityId: original.id,
      oldValue: { type: original.type, amount: original.amount },
      newValue: { reversalId: reversal.id, amount: reversal.amount, reason: data.reason },
    });

    return reversal;
  }
}

export const cashService = new CashService();
