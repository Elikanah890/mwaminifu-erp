import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { auditService } from './audit.service';

export class LoanService {
  async listLoans(shopId: string, filters: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.LoanWhereInput = { shopId, deletedAt: null };
    if (filters.status) where.status = filters.status as Prisma.LoanWhereInput['status'];

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        include: { _count: { select: { repayments: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loan.count({ where }),
    ]);

    return { loans, total, page, limit };
  }

  async getLoan(loanId: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { repayments: { orderBy: { repaymentDate: 'desc' } } },
    });
    if (!loan) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Loan not found' };
    }
    return loan;
  }

  async createLoan(shopId: string, userId: string, data: {
    lender: string;
    amount: number;
    interestRate?: number;
    dueDate?: string;
    notes?: string;
  }) {
    const loan = await prisma.$transaction(async (tx) => {
      const created = await tx.loan.create({
        data: {
          shopId,
          lender: data.lender,
          amount: data.amount,
          interestRate: data.interestRate || 0,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          remainingBalance: data.amount,
          notes: data.notes,
          status: 'ACTIVE',
        },
      });

      // Loan disbursement: cash received by the business.
      await tx.cashTransaction.create({
        data: {
          shopId,
          type: 'LOAN_DISBURSEMENT',
          amount: Math.abs(data.amount),
          reference: created.id,
          userId,
          note: `Loan received from ${data.lender}`,
        },
      });

      return created;
    });

    await auditService.logDetailed({
      shopId,
      userId,
      action: 'LOAN_CREATED',
      entity: 'Loan',
      entityId: loan.id,
      newValue: { lender: data.lender, amount: data.amount, interestRate: data.interestRate || 0 },
    });

    return loan;
  }

  async updateLoan(loanId: string, data: {
    lender?: string;
    amount?: number;
    interestRate?: number;
    dueDate?: string;
    notes?: string;
  }) {
    return prisma.loan.update({
      where: { id: loanId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  async repayLoan(loanId: string, userId: string, data: { amount: number; repaymentDate?: string; method?: string; notes?: string }) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Loan not found' };
    }

    if (data.amount > loan.remainingBalance) {
      throw {
        status: 422,
        code: 'BUSINESS_RULE_VIOLATION',
        message: `Repayment exceeds remaining balance of ${loan.remainingBalance}`,
      };
    }

    const repayment = await prisma.$transaction(async (tx) => {
      const newBalance = loan.remainingBalance - data.amount;

      await tx.loan.update({
        where: { id: loanId },
        data: {
          remainingBalance: newBalance,
          status: newBalance <= 0 ? 'PAID' : 'ACTIVE',
        },
      });

      const created = await tx.loanRepayment.create({
        data: {
          loanId,
          amount: data.amount,
          repaymentDate: data.repaymentDate ? new Date(data.repaymentDate) : new Date(),
          method: data.method || 'cash',
          notes: data.notes,
        },
      });

      if ((data.method || 'cash').toLowerCase() === 'cash') {
        await tx.cashTransaction.create({
          data: {
            shopId: loan.shopId,
            type: 'LOAN_REPAYMENT',
            amount: -Math.abs(data.amount),
            reference: created.id,
            userId,
            note: `Loan repayment to ${loan.lender}`,
          },
        });
      }

      return created;
    });

    await auditService.logDetailed({
      shopId: loan.shopId,
      userId,
      action: 'LOAN_REPAYMENT',
      entity: 'Loan',
      entityId: loanId,
      newValue: { amount: data.amount, method: data.method || 'cash' },
    });

    return repayment;
  }

  async getOutstandingLoans(shopId: string) {
    return prisma.loan.findMany({
      where: { shopId, status: 'ACTIVE', deletedAt: null },
      orderBy: { dueDate: 'asc' },
    });
  }

  async deleteLoan(loanId: string, userId: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { _count: { select: { repayments: true } } },
    });
    if (!loan) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Loan not found' };
    }
    if (loan.remainingBalance > 0) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Cannot delete a loan with an outstanding balance' };
    }
    if (loan._count.repayments > 0) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Cannot delete a loan that has repayment history. Archive it instead.' };
    }

    const result = await prisma.loan.update({
      where: { id: loanId },
      data: { deletedAt: new Date() },
    });

    await auditService.logDetailed({
      shopId: loan.shopId,
      userId,
      action: 'LOAN_DELETED',
      entity: 'Loan',
      entityId: loanId,
      oldValue: { lender: loan.lender, amount: loan.amount },
    });

    return result;
  }
}

export const loanService = new LoanService();
