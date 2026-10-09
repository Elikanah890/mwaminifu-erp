import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { auditService } from './audit.service';

export type PurchaseItem = {
  productId: string;
  quantity: number;
  unitCost: number;
  unitConfigId?: string;
  unitName?: string;
  baseUnits?: number;
  tax?: number;
  discount?: number;
  receivedQuantity?: number;
};

export class PurchaseService {
  private parseItems(items: unknown): PurchaseItem[] {
    return (Array.isArray(items) ? items : []) as PurchaseItem[];
  }

  private computeTotals(items: PurchaseItem[], tax = 0, discount = 0) {
    const subtotal = items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitCost || 0), 0);
    const total = subtotal + (tax || 0) - (discount || 0);
    return { subtotal, total };
  }

  async createPurchase(
    shopId: string,
    userId: string,
    data: {
      supplierId?: string;
      invoiceNo?: string;
      items: PurchaseItem[];
      tax?: number;
      discount?: number;
      status?: string;
      dueDate?: string;
      notes?: string;
    }
  ) {
    const items = this.parseItems(data.items);
    if (items.length === 0) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: 'Purchase must include at least one item' };
    }

    const { subtotal, total } = this.computeTotals(items, data.tax, data.discount);

    const purchase = await prisma.purchase.create({
      data: {
        shopId,
        supplierId: data.supplierId || null,
        invoiceNo: data.invoiceNo,
        items: items.map((i) => ({ ...i, receivedQuantity: 0 })),
        subtotal,
        tax: data.tax || 0,
        discount: data.discount || 0,
        total,
        status: data.status || 'ORDERED',
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes,
        createdBy: userId,
      },
    });

    await auditService.logDetailed({
      shopId,
      userId,
      action: 'PURCHASE_CREATED',
      entity: 'Purchase',
      entityId: purchase.id,
      newValue: { subtotal, total, status: purchase.status, items: items.length },
    });

    return purchase;
  }

  async listPurchases(shopId: string, filters: { page?: number; limit?: number; status?: string; supplierId?: string; from?: string; to?: string }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = { shopId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.from || filters.to) {
      const date: Prisma.DateTimeFilter = {};
      if (filters.from) date.gte = new Date(filters.from);
      if (filters.to) date.lte = new Date(filters.to);
      where.date = date;
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ]);

    return { purchases, total, page, limit };
  }

  async getPurchase(purchaseId: string) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { supplier: { select: { id: true, name: true, phone: true } } },
    });
    if (!purchase) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Purchase not found' };
    }
    return purchase;
  }

  async updatePurchase(purchaseId: string, data: { supplierId?: string; invoiceNo?: string; items?: PurchaseItem[]; tax?: number; discount?: number; dueDate?: string; notes?: string }) {
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Purchase not found' };
    }
    if (purchase.status === 'RECEIVED' || purchase.status === 'CANCELLED') {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: `Cannot edit a ${purchase.status.toLowerCase()} purchase` };
    }

    const items = data.items ? this.parseItems(data.items) : this.parseItems(purchase.items);
    const { subtotal, total } = this.computeTotals(items, data.tax ?? purchase.tax, data.discount ?? purchase.discount);

    return prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        supplierId: data.supplierId ?? purchase.supplierId,
        invoiceNo: data.invoiceNo ?? purchase.invoiceNo,
        items: data.items ? items : undefined,
        tax: data.tax ?? purchase.tax,
        discount: data.discount ?? purchase.discount,
        subtotal,
        total,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        notes: data.notes ?? purchase.notes,
      },
    });
  }

  async receivePurchase(
    purchaseId: string,
    userId: string,
    data: { items?: Array<{ productId: string; quantity: number; unitConfigId?: string; baseUnits?: number }>; receivedAll?: boolean }
  ) {
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Purchase not found' };
    }
    if (purchase.status === 'CANCELLED') {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Cannot receive a cancelled purchase' };
    }
    if (purchase.status === 'RECEIVED') {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Purchase already fully received' };
    }

    const items = this.parseItems(purchase.items);
    // Received quantities are accumulated in the requested unit, together with
    // the baseUnits that unit represents (defaults to the purchase line's unit).
    const receiveMap = new Map<string, { qty: number; baseUnits?: number }>();
    if (data.receivedAll) {
      for (const i of items) {
        receiveMap.set(i.productId, {
          qty: (i.quantity || 0) - (i.receivedQuantity || 0),
          baseUnits: i.baseUnits || 1,
        });
      }
    } else if (data.items) {
      for (const r of data.items) {
        const prev = receiveMap.get(r.productId);
        receiveMap.set(r.productId, {
          qty: (prev?.qty || 0) + (r.quantity || 0),
          baseUnits: r.baseUnits ?? prev?.baseUnits,
        });
      }
    }

    if (receiveMap.size === 0) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: 'No quantities specified to receive' };
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const [productId, entry] of receiveMap.entries()) {
        const item = items.find((i) => i.productId === productId);
        if (!item) continue;
        if (entry.qty <= 0) continue;
        const purchaseBaseUnits = item.baseUnits || 1;
        const reqBaseUnits = entry.baseUnits || purchaseBaseUnits;
        const requestedBase = entry.qty * reqBaseUnits;
        const remainingBase = ((item.quantity || 0) - (item.receivedQuantity || 0)) * purchaseBaseUnits;
        if (requestedBase > remainingBase) {
          throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: `Receive quantity for product exceeds remaining (${remainingBase / purchaseBaseUnits} units)` };
        }

        const product = await tx.product.findFirst({ where: { id: productId, shopId: purchase.shopId } });
        if (!product) continue;

        // unitCost is per purchase unit → derive per-base-unit cost.
        const baseCost = item.unitCost ? item.unitCost / purchaseBaseUnits : product.costPrice;
        const after = await tx.product.update({
          where: { id: productId },
          data: { stockQuantity: { increment: requestedBase }, baseUnitStock: { increment: requestedBase }, costPrice: baseCost },
          select: { stockQuantity: true },
        });
        const newStock = after.stockQuantity;

        await tx.stockMovement.create({
          data: {
            shopId: purchase.shopId,
            productId,
            type: 'PURCHASE',
            quantity: requestedBase,
            balanceAfter: newStock,
            reference: purchase.invoiceNo || purchase.id,
            userId,
            reason: 'Purchase received',
          },
        });

        item.receivedQuantity = (item.receivedQuantity || 0) + requestedBase / purchaseBaseUnits;
      }

      const allReceived = items.every((i) => (i.receivedQuantity || 0) >= (i.quantity || 0));
      const nextStatus = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      return tx.purchase.update({
        where: { id: purchaseId },
        data: {
          items,
          status: nextStatus,
          receivedAt: allReceived ? new Date() : purchase.receivedAt,
        },
      });
    });

    await auditService.logDetailed({
      shopId: purchase.shopId,
      userId,
      action: 'PURCHASE_RECEIVED',
      entity: 'Purchase',
      entityId: purchaseId,
      oldValue: { status: purchase.status },
      newValue: { status: updated.status },
    });

    return updated;
  }

  async payPurchase(purchaseId: string, userId: string, data: { amount: number; method?: string }) {
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Purchase not found' };
    }
    if (purchase.paymentStatus === 'PAID') {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Purchase already fully paid' };
    }

    const amount = data.amount || 0;
    const newPaid = (purchase.amountPaid || 0) + amount;
    const paymentStatus = newPaid >= purchase.total ? 'PAID' : newPaid > 0 ? 'PARTIAL' : 'UNPAID';

    const updated = await prisma.$transaction(async (tx) => {
      if ((data.method || 'cash').toLowerCase() === 'cash') {
        await tx.cashTransaction.create({
          data: {
            shopId: purchase.shopId,
            type: 'PURCHASE',
            amount: -amount,
            reference: purchase.invoiceNo || purchase.id,
            userId,
            note: `Payment for purchase ${purchase.invoiceNo || purchase.id}`,
          },
        });
      }

      return tx.purchase.update({
        where: { id: purchaseId },
        data: { amountPaid: newPaid, paymentStatus },
      });
    });

    await auditService.logDetailed({
      shopId: purchase.shopId,
      userId,
      action: 'PURCHASE_PAYMENT',
      entity: 'Purchase',
      entityId: purchaseId,
      oldValue: { amountPaid: purchase.amountPaid, paymentStatus: purchase.paymentStatus },
      newValue: { amountPaid: newPaid, paymentStatus },
    });

    return updated;
  }

  async cancelPurchase(purchaseId: string, userId: string) {
    const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Purchase not found' };
    }
    if (purchase.status === 'RECEIVED' || purchase.status === 'PARTIALLY_RECEIVED') {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Cannot cancel a received purchase. Create a purchase return instead.' };
    }

    const updated = await prisma.purchase.update({
      where: { id: purchaseId },
      data: { status: 'CANCELLED' },
    });

    await auditService.logDetailed({
      shopId: purchase.shopId,
      userId,
      action: 'PURCHASE_CANCELLED',
      entity: 'Purchase',
      entityId: purchaseId,
      newValue: { status: 'CANCELLED' },
    });

    return updated;
  }

  async getPayables(shopId: string) {
    const purchases = await prisma.purchase.findMany({
      where: { shopId, deletedAt: null, paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    });

    const items = purchases.map((p) => ({
      purchaseId: p.id,
      invoiceNo: p.invoiceNo,
      supplier: p.supplier?.name || 'Unknown',
      date: p.date,
      dueDate: p.dueDate,
      total: p.total,
      amountPaid: p.amountPaid,
      balance: p.total - p.amountPaid,
      status: p.paymentStatus,
    }));

    const totalPayable = items.reduce((sum, i) => sum + i.balance, 0);
    return { totalPayable, count: items.length, items };
  }
}

export const purchaseService = new PurchaseService();
