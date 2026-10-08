import prisma from '../config/database';
import { getErrorMessage } from '../utils/error.util';
import type { SaleStatus } from '@prisma/client';

interface OfflineSaleItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
  unit?: string;
}

interface OfflineSaleData {
  userId: string;
  customerId?: string | null;
  totalAmount?: number;
  grandTotal?: number;
  discount?: number;
  status?: SaleStatus;
  paymentMethod?: string;
  paymentDetails?: unknown;
  items?: OfflineSaleItem[];
}

interface OfflineExpenseData {
  userId: string;
  category: string;
  amount: number;
  description?: string;
}

interface OfflineCreditPaymentData {
  customerId: string;
  amount: number;
  method?: string;
}

interface OfflineStockAdjustmentData {
  productId: string;
  quantityChange: number;
  reason?: string;
  performedBy: string;
}

export class SyncService {
  async pushChanges(
    shopId: string,
    deviceId: string,
    changes: Record<string, Array<{ clientId: string; data: Record<string, unknown>; lastModified: string }>>
  ) {
    if (!shopId || !deviceId || !changes) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'shopId, deviceId and changes are required' };
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, isArchived: true },
    });
    if (!shop || shop.isArchived) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Shop not found' };
    }

    const processed: Record<string, string[]> = {};
    const failed: Record<string, Array<{ clientId: string; reason: string }>> = {};

    for (const [entity, records] of Object.entries(changes)) {
      processed[entity] = [];
      failed[entity] = [];

      for (const record of records) {
        try {
          await this.processEntity(entity, shopId, record);
          processed[entity].push(record.clientId);
        } catch (error: unknown) {
          failed[entity].push({
            clientId: record.clientId,
            reason: getErrorMessage(error),
          });
        }
      }
    }

    await prisma.syncMetadata.upsert({
      where: { shopId },
      update: {
        deviceId,
        lastPushTimestamp: new Date(),
        pendingUploads: 0,
        lastError: null,
      },
      create: {
        shopId,
        deviceId,
        lastPushTimestamp: new Date(),
        pendingUploads: 0,
      },
    });

    return {
      processed,
      failed,
      serverVersion: new Date().toISOString(),
    };
  }

  async pullChanges(shopId: string, since: string, limit = 500) {
    if (!shopId) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'shopId is required' };
    }
    const sinceDate = since ? new Date(since) : new Date(0);
    if (isNaN(sinceDate.getTime())) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid since parameter' };
    }

    const lastPullTimestamp = new Date();

    const [sales, products, customers, expenses, loans, stockAdjustments, employees] = await Promise.all([
      prisma.sale.findMany({
        where: { shopId, updatedAt: { gt: sinceDate } },
        include: { items: true },
        orderBy: { updatedAt: 'asc' },
        take: limit,
      }),
      prisma.product.findMany({
        where: { shopId, updatedAt: { gt: sinceDate } },
        take: limit,
      }),
      prisma.customer.findMany({
        where: { shopId, updatedAt: { gt: sinceDate } },
        take: limit,
      }),
      prisma.expense.findMany({
        where: { shopId, updatedAt: { gt: sinceDate } },
        take: limit,
      }),
      prisma.loan.findMany({
        where: { shopId, updatedAt: { gt: sinceDate } },
        include: { repayments: true },
        take: limit,
      }),
      prisma.stockAdjustment.findMany({
        where: { shopId, createdAt: { gt: sinceDate } },
        take: limit,
      }),
      prisma.employee.findMany({
        where: { shopId, updatedAt: { gt: sinceDate } },
        include: { user: { select: { name: true, phone: true, isActive: true } } },
        take: limit,
      }),
    ]);

    const hasMore = [sales, products, customers, expenses, loans, stockAdjustments, employees].some(
      (records) => records.length >= limit
    );

    await prisma.syncMetadata.upsert({
      where: { shopId },
      update: { lastPullTimestamp },
      create: {
        shopId,
        deviceId: 'mobile',
        lastPullTimestamp,
      },
    });

    return {
      changes: { sales, products, customers, expenses, loans, stockAdjustments, employees },
      serverVersion: lastPullTimestamp.toISOString(),
      lastPullTimestamp: lastPullTimestamp.toISOString(),
      hasMore,
    };
  }

  async getSyncStatus(shopId: string) {
    if (!shopId) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'shopId is required' };
    }
    const metadata = await prisma.syncMetadata.findUnique({
      where: { shopId },
    });

    return metadata || { shopId, lastPullTimestamp: null, lastPushTimestamp: null, pendingUploads: 0 };
  }

  private async processEntity(
    entity: string,
    shopId: string,
    record: { clientId: string; data: Record<string, unknown>; lastModified: string }
  ) {
    switch (entity) {
      case 'sales':
        await this.processSale(shopId, record);
        break;
      case 'expenses':
        await this.processExpense(shopId, record);
        break;
      case 'creditPayments':
        await this.processCreditPayment(shopId, record);
        break;
      case 'stockAdjustments':
        await this.processStockAdjustment(shopId, record);
        break;
      default:
        break;
    }
  }

  private async processSale(shopId: string, record: { clientId: string; data: Record<string, unknown> }) {
    const data = record.data as unknown as OfflineSaleData;

    // Idempotency guard: a sale that has already been synced (same clientId)
    // must never re-apply its stock effect, otherwise stock would be deducted
    // twice on retries.
    const existing = await prisma.sale.findFirst({
      where: { clientId: record.clientId, shopId },
    });

    if (existing) {
      await prisma.sale.update({
        where: { id: existing.id },
        data: {
          status: data.status || 'COMPLETED',
          syncStatus: 'SYNCED',
          grandTotal: data.grandTotal,
          totalAmount: data.totalAmount,
          discount: data.discount,
          paymentDetails: data.paymentDetails || {},
        },
      });
      return;
    }

    const items: OfflineSaleItem[] = data.items || [];

    await prisma.$transaction(async (tx) => {
      const saleItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        total: number;
        unit?: string;
      }> = [];

      for (const item of items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, shopId },
        });

        const unitPrice = product ? product.sellingPrice : item.unitPrice || 0;
        const total = item.total ?? unitPrice * item.quantity;

        saleItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          discount: 0,
          total,
          unit: item.unit || product?.unit || 'piece',
        });

        // Apply the same stock effect as an online sale (skip services).
        if (product && !product.isService) {
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: { decrement: item.quantity } },
          });

          await tx.stockAdjustment.create({
            data: {
              productId: product.id,
              quantityChange: -item.quantity,
              reason: 'Sale (offline)',
              performedBy: data.userId,
              shopId,
            },
          });
        }
      }

      await tx.sale.create({
        data: {
          shopId,
          userId: data.userId,
          customerId: data.customerId || null,
          totalAmount: data.totalAmount || 0,
          grandTotal: data.grandTotal || 0,
          status: data.status || 'COMPLETED',
          paymentMethod: data.paymentMethod || 'cash',
          paymentDetails: data.paymentDetails || {},
          clientId: record.clientId,
          syncStatus: 'SYNCED',
          isOffline: true,
          items: { create: saleItems },
        },
      });
    });
  }

  private async processExpense(shopId: string, record: { clientId: string; data: Record<string, unknown> }) {
    const data = record.data as unknown as OfflineExpenseData;
    const existing = await prisma.expense.findFirst({
      where: { clientId: record.clientId, shopId },
    });

    if (existing) {
      await prisma.expense.update({
        where: { id: existing.id },
        data: { amount: data.amount, category: data.category, syncStatus: 'SYNCED' },
      });
    } else {
      await prisma.expense.create({
        data: {
          shopId,
          userId: data.userId,
          category: data.category,
          amount: data.amount,
          description: data.description,
          clientId: record.clientId,
          syncStatus: 'SYNCED',
        },
      });
    }
  }

  private async processCreditPayment(shopId: string, record: { clientId: string; data: Record<string, unknown> }) {
    const data = record.data as unknown as OfflineCreditPaymentData;

    // Guard against cross-shop writes: customer must belong to the shop
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, shopId },
      select: { id: true, outstandingBalance: true },
    });
    if (!customer) {
      throw new Error(`Customer ${data.customerId} not found in this shop`);
    }

    const existing = await prisma.creditPayment.findFirst({
      where: { clientId: record.clientId },
    });

    if (existing) {
      await prisma.creditPayment.update({
        where: { id: existing.id },
        data: { amount: data.amount, syncStatus: 'SYNCED' },
      });
    } else {
      if ((data.amount || 0) > customer.outstandingBalance) {
        throw new Error(`Payment amount exceeds outstanding balance`);
      }
      await prisma.$transaction(async (tx) => {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            outstandingBalance: { decrement: data.amount || 0 },
            totalRepaid: { increment: data.amount || 0 },
          },
        });
        await tx.creditPayment.create({
          data: {
            customerId: customer.id,
            amount: data.amount,
            method: data.method || 'cash',
            clientId: record.clientId,
            syncStatus: 'SYNCED',
          },
        });
      });
    }
  }

  private async processStockAdjustment(shopId: string, record: { clientId: string; data: Record<string, unknown> }) {
    const data = record.data as unknown as OfflineStockAdjustmentData;

    // Guard against cross-shop writes: product must belong to the shop
    const product = await prisma.product.findFirst({
      where: { id: data.productId, shopId },
      select: { id: true, stockQuantity: true },
    });
    if (!product) {
      throw new Error(`Product ${data.productId} not found in this shop`);
    }

    const newQuantity = product.stockQuantity + (data.quantityChange || 0);
    if (newQuantity < 0) {
      throw new Error(`Stock cannot be negative`);
    }

    if (!data.performedBy) {
      throw new Error('performedBy is required for stock adjustment');
    }

    await prisma.stockAdjustment.create({
      data: {
        productId: product.id,
        quantityChange: data.quantityChange,
        reason: data.reason || 'Offline adjustment',
        performedBy: data.performedBy,
        shopId,
      },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { stockQuantity: newQuantity },
    });
  }
}

export const syncService = new SyncService();
