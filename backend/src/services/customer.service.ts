import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { auditService } from './audit.service';

export class CustomerService {
  async listCustomers(shopId: string, filters: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = { shopId, isArchived: false };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total, page, limit };
  }

  async createCustomer(shopId: string, data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    creditLimit?: number;
  }, userId?: string) {
    const customer = await prisma.customer.create({
      data: {
        shopId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        notes: data.notes,
        creditLimit: data.creditLimit || 0,
      },
    });

    await auditService.logDetailed({
      shopId,
      userId: userId || null,
      action: 'CUSTOMER_CREATED',
      entity: 'Customer',
      entityId: customer.id,
      newValue: { name: data.name, phone: data.phone, creditLimit: data.creditLimit || 0 },
    });

    return customer;
  }

  async getCustomer(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        _count: { select: { sales: true, creditPayments: true } },
      },
    });
    if (!customer) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Customer not found' };
    }
    return customer;
  }

  async getCustomerProfile(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        sales: {
          where: { status: 'COMPLETED' },
          orderBy: { saleDate: 'desc' },
          take: 20,
          select: { id: true, receiptNumber: true, grandTotal: true, paymentMethod: true, saleDate: true, status: true },
        },
        creditPayments: { orderBy: { paymentDate: 'desc' }, take: 20 },
        creditLedger: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!customer) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Customer not found' };
    }

    const totalPurchases = await prisma.sale.aggregate({
      where: { customerId, shopId: customer.shopId, status: 'COMPLETED' },
      _sum: { grandTotal: true },
      _count: true,
    });

    return {
      ...customer,
      financialSummary: {
        totalPurchases: totalPurchases._sum.grandTotal || 0,
        totalPaid: customer.totalRepaid || 0,
        outstandingBalance: customer.outstandingBalance,
        creditLimit: customer.creditLimit,
        availableCredit: Math.max(0, customer.creditLimit - customer.outstandingBalance),
        purchaseCount: totalPurchases._count || 0,
      },
      recentSales: customer.sales,
      recentPayments: customer.creditPayments,
      ledger: customer.creditLedger,
    };
  }

  async updateCustomer(customerId: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    creditLimit?: number;
    isBlacklisted?: boolean;
    status?: string;
  }) {
    return prisma.customer.update({ where: { id: customerId }, data });
  }

  async deleteCustomer(customerId: string) {
    return prisma.customer.update({
      where: { id: customerId },
      data: { isArchived: true, deletedAt: new Date() },
    });
  }

  async getPurchaseHistory(customerId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where: { customerId, status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          receiptNumber: true,
          grandTotal: true,
          paymentMethod: true,
          paymentDetails: true,
          saleDate: true,
        },
      }),
      prisma.sale.count({ where: { customerId, status: 'COMPLETED' } }),
    ]);
    return { sales, total, page, limit };
  }

  async recordCreditPayment(customerId: string, data: {
    amount: number;
    paymentDate?: string;
    method?: string;
    saleId?: string;
    notes?: string;
  }, userId?: string) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Customer not found' };
    }

    if (data.amount > customer.outstandingBalance) {
      throw {
        status: 422,
        code: 'BUSINESS_RULE_VIOLATION',
        message: `Payment amount exceeds outstanding balance of ${customer.outstandingBalance}`,
      };
    }

    const payment = await prisma.$transaction(async (tx) => {
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          outstandingBalance: { decrement: data.amount },
          totalRepaid: { increment: data.amount },
        },
      });

      const created = await tx.creditPayment.create({
        data: {
          customerId,
          saleId: data.saleId,
          amount: data.amount,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          method: data.method || 'cash',
          notes: data.notes,
        },
      });

      await tx.creditLedgerEntry.create({
        data: {
          customerId,
          type: 'REPAYMENT',
          amount: data.amount,
          balanceAfter: updatedCustomer.outstandingBalance,
          referenceId: created.id,
          referenceType: 'PAYMENT',
          description: data.notes || 'Credit repayment',
        },
      });

      if ((data.method || 'cash').toLowerCase() === 'cash') {
        await tx.cashTransaction.create({
          data: {
            shopId: customer.shopId,
            type: 'CREDIT_COLLECTION',
            amount: data.amount,
            reference: created.id,
            userId: userId || null,
            note: `Credit repayment from ${customer.name}`,
          },
        });
      }

      return created;
    });

    await auditService.logDetailed({
      shopId: customer.shopId,
      userId: userId || null,
      action: 'PAYMENT_RECORDED',
      entity: 'Customer',
      entityId: customerId,
      newValue: { amount: data.amount, method: data.method || 'cash' },
    });

    return payment;
  }

  async getCreditHistory(customerId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      prisma.creditPayment.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.creditPayment.count({ where: { customerId } }),
    ]);
    return { payments, total, page, limit };
  }

  async getOutstandingCredits(shopId: string) {
    return prisma.customer.findMany({
      where: { shopId, isArchived: false, outstandingBalance: { gt: 0 } },
      orderBy: { outstandingBalance: 'desc' },
    });
  }
}

export const customerService = new CustomerService();
