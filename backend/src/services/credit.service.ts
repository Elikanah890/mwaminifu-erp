import prisma from '../config/database';
import { auditService } from './audit.service';

export class CreditService {
  async aging(shopId: string) {
    const customers = await prisma.customer.findMany({
      where: { shopId, isArchived: false, outstandingBalance: { gt: 0 } },
      include: {
        creditLedger: {
          where: { type: 'CHARGE' },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { outstandingBalance: 'desc' },
    });

    const now = new Date();
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    let total = 0;

    const rows = customers.map((c) => {
      total += c.outstandingBalance;

      // Allocate the oldest unpaid charge date to determine aging bucket.
      const oldestCharge = c.creditLedger[0]?.createdAt;
      let bucket = '0-30';
      if (oldestCharge) {
        const days = Math.floor((now.getTime() - oldestCharge.getTime()) / (1000 * 60 * 60 * 24));
        if (days > 90) bucket = '90+';
        else if (days > 60) bucket = '61-90';
        else if (days > 30) bucket = '31-60';
        else bucket = '0-30';
      }

      buckets[bucket as keyof typeof buckets] += c.outstandingBalance;

      return {
        customerId: c.id,
        name: c.name,
        phone: c.phone,
        outstandingBalance: c.outstandingBalance,
        creditLimit: c.creditLimit,
        isBlacklisted: c.isBlacklisted,
        bucket,
      };
    });

    return {
      summary: { totalOutstanding: total, buckets, customersWithDebt: customers.length },
      data: rows,
    };
  }

  async statement(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        creditLedger: { orderBy: { createdAt: 'desc' } },
        sales: {
          where: { status: 'COMPLETED' },
          orderBy: { saleDate: 'desc' },
          select: { id: true, receiptNumber: true, grandTotal: true, saleDate: true, paymentDetails: true },
        },
        creditPayments: { orderBy: { paymentDate: 'desc' } },
      },
    });
    if (!customer) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Customer not found' };
    }
    return customer;
  }

  async writeOff(customerId: string, userId: string, data: { amount: number; reason?: string }) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Customer not found' };
    }
    if (data.amount > customer.outstandingBalance) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Write-off amount exceeds outstanding balance' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const newBalance = customer.outstandingBalance - data.amount;
      await tx.customer.update({
        where: { id: customerId },
        data: { outstandingBalance: newBalance },
      });

      return tx.creditLedgerEntry.create({
        data: {
          customerId,
          type: 'WRITE_OFF',
          amount: data.amount,
          balanceAfter: newBalance,
          description: data.reason || 'Bad debt write-off',
        },
      });
    });

    await auditService.logDetailed({
      shopId: customer.shopId,
      userId,
      action: 'CREDIT_WRITE_OFF',
      entity: 'Customer',
      entityId: customerId,
      newValue: { amount: data.amount, reason: data.reason },
    });

    return updated;
  }
}

export const creditService = new CreditService();
