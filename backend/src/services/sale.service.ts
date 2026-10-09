import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { generateReceiptNumber } from '../utils/otp.util';
import { shopService } from './shop.service';

const round2 = (n: number) => Math.round(n * 100) / 100;

export class SaleService {
  async createSale(
    shopId: string,
    userId: string,
    data: {
      customerId?: string;
      items: Array<{ productId: string; quantity: number; unit?: string; unitPrice?: number; baseUnits?: number; unitConfigId?: string; unitName?: string; baseUnitsPerConfig?: number; discount?: number; tax?: number }>;
      discount?: number;
      tax?: number;
      payments: Array<{ method: string; amount: number }>;
      suspended?: boolean;
      notes?: string;
      clientId?: string;
      isOffline?: boolean;
      allowNegativeStock?: boolean;
    },
    opts: { requireOpenShift?: boolean } = {}
  ) {
    await shopService.verifyShopAccess(shopId, userId);

    // Idempotency: a replayed offline sale (same clientId) must not be
    // created twice. Return the original record instead.
    if (data.clientId) {
      const existing = await prisma.sale.findFirst({
        where: { clientId: data.clientId, shopId },
        include: { items: true },
      });
      if (existing) return existing;
    }

    if (data.suspended) {
      return this.suspendSale(shopId, userId, data);
    }

    // Spec 8.8.1 — a cashier must open their shift (opening drawer balance)
    // before any sale can be recorded. Owners are not gated by default.
    const openShift = await prisma.shift.findFirst({
      where: { userId, shopId, isActive: true, status: 'OPEN' },
      orderBy: { startedAt: 'desc' },
    });
    if (opts.requireOpenShift && !openShift) {
      throw { status: 422, code: 'SHIFT_REQUIRED', message: 'Open your shift first' };
    }

    const sale = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const saleItems: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        costPrice: number;
        discount: number;
        tax: number;
        total: number;
        unit?: string;
        unitConfigId?: string | null;
        unitName?: string | null;
        baseUnitsPerConfig: number;
      }> = [];

      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, shopId },
        });

        if (!product) {
          throw { status: 404, code: 'NOT_FOUND', message: `Product ${item.productId} not found` };
        }

        // Resolve the sold unit configuration (must belong to this product/shop).
        let baseUnitsPerConfig = item.baseUnitsPerConfig ?? item.baseUnits ?? 1;
        let unitName = item.unitName ?? item.unit ?? product.unit;
        let unitPrice = item.unitPrice;

        if (item.unitConfigId) {
          const cfg = await tx.productUnitConfig.findFirst({
            where: { id: item.unitConfigId, productId: product.id },
          });
          if (!cfg) {
            throw {
              status: 422,
              code: 'VALIDATION_ERROR',
              message: `Unit configuration not found for "${product.name}"`,
            };
          }
          baseUnitsPerConfig = cfg.baseUnits;
          unitName = cfg.unitName;
          if (unitPrice == null) unitPrice = cfg.sellingPrice;
          if (cfg.pricingMode === 'FLUCTUATING') {
            if (cfg.minPrice != null && unitPrice < cfg.minPrice) unitPrice = cfg.minPrice;
            if (cfg.maxPrice != null && unitPrice > cfg.maxPrice) unitPrice = cfg.maxPrice;
          }
        } else {
          // Product-level price bounds apply only to the base unit.
          if (unitPrice == null) unitPrice = product.sellingPrice;
          if (product.minPrice != null && unitPrice < product.minPrice) unitPrice = product.minPrice;
          if (product.maxPrice != null && unitPrice > product.maxPrice) unitPrice = product.maxPrice;
        }

        const totalBaseUnits = item.quantity * baseUnitsPerConfig;
        const resolvedUnitPrice = unitPrice ?? product.sellingPrice;

        if (!data.allowNegativeStock && product.stockQuantity < totalBaseUnits && product.isActive) {
          throw {
            status: 422,
            code: 'BUSINESS_RULE_VIOLATION',
            message: `Insufficient stock for "${product.name}". Available: ${product.stockQuantity} ${product.baseUnitName || ''}`.trim(),
          };
        }

        const itemDiscount = item.discount || 0;
        const itemTotal = item.quantity * resolvedUnitPrice - itemDiscount;
        const itemTax = item.tax || 0;

        totalAmount += itemTotal;

        saleItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: resolvedUnitPrice,
          costPrice: product.costPrice || 0,
          discount: itemDiscount,
          tax: itemTax,
          total: itemTotal,
          unit: unitName,
          unitConfigId: item.unitConfigId ?? null,
          unitName,
          baseUnitsPerConfig,
        });

        if (!product.isService) {
          const newStock = product.stockQuantity - totalBaseUnits;
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: newStock, baseUnitStock: newStock },
          });

          await tx.stockAdjustment.create({
            data: {
              productId: product.id,
              quantityChange: -totalBaseUnits,
              reason: 'Sale',
              performedBy: userId,
              shopId,
            },
          });

          await tx.stockMovement.create({
            data: {
              shopId,
              productId: product.id,
              type: 'SALE',
              quantity: -totalBaseUnits,
              balanceAfter: newStock,
              userId,
              reason: 'Sale',
            },
          });
        }
      }

      const totalDiscount = data.discount || 0;
      const grandTotal = round2(totalAmount - totalDiscount + (data.tax || 0));
      const receiptNumber = generateReceiptNumber();

      let paymentMethod = 'cash';
      const totalPaid = round2(data.payments.reduce((sum, p) => sum + p.amount, 0));

      // Financial rule: paid amount + credit amount must equal the sale total.
      // Underpayment is rejected; only a cash overpayment is allowed (returned as change).
      const shortfall = round2(totalPaid - grandTotal);
      if (shortfall < -0.01) {
        throw {
          status: 422,
          code: 'BUSINESS_RULE_VIOLATION',
          message: `Payment total (${totalPaid}) is less than the sale total (${grandTotal})`,
        };
      }

      const creditPayment = data.payments.find((p) => p.method.toLowerCase() === 'credit');
      if (creditPayment && !data.customerId) {
        throw {
          status: 422,
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'A customer is required for credit sales',
        };
      }

      const changeGiven = Math.max(0, shortfall);

      if (data.payments.length === 1) {
        paymentMethod = data.payments[0].method;
      } else if (data.payments.length > 1) {
        paymentMethod = 'split';
      }

      const newSale = await tx.sale.create({
        data: {
          shopId,
          userId,
          customerId: data.customerId || null,
          totalAmount,
          discount: totalDiscount,
          taxAmount: data.tax || 0,
          grandTotal,
          changeGiven,
          paymentMethod,
          paymentDetails: data.payments,
          receiptNumber,
          status: 'COMPLETED',
          notes: data.notes,
          clientId: data.clientId ?? null,
          isOffline: data.isOffline ?? false,
          shiftId: openShift?.id ?? null,
          syncStatus: 'SYNCED',
          items: {
            create: saleItems,
          },
        },
        include: { items: true },
      });

      // Update customer credit balance and ledger
      if (data.customerId && creditPayment) {
        const updatedCustomer = await tx.customer.update({
          where: { id: data.customerId },
          data: {
            outstandingBalance: { increment: creditPayment.amount },
            totalCreditGiven: { increment: creditPayment.amount },
          },
        });

        await tx.creditLedgerEntry.create({
          data: {
            customerId: data.customerId,
            type: 'CHARGE',
            amount: creditPayment.amount,
            balanceAfter: updatedCustomer.outstandingBalance,
            referenceId: newSale.id,
            referenceType: 'SALE',
            description: `Credit sale ${receiptNumber}`,
          },
        });
      }

      // Record cash transactions for cash payments (cash management trail)
      for (const payment of data.payments) {
        if (payment.method.toLowerCase() === 'cash' && payment.amount > 0) {
          await tx.cashTransaction.create({
            data: {
              shopId,
              type: 'SALE',
              amount: payment.amount,
              reference: receiptNumber,
              userId,
              note: `Cash sale ${receiptNumber}`,
            },
          });
        }
      }

      await tx.activityLog.create({
        data: {
          userId,
          shopId,
          action: 'SALE_CREATED',
          details: { receiptNumber, grandTotal, items: data.items.length },
          saleId: newSale.id,
        },
      });

      await tx.auditLog.create({
        data: {
          shopId,
          userId,
          action: 'SALE_CREATED',
          entity: 'Sale',
          entityId: newSale.id,
          newValue: { receiptNumber, grandTotal, paymentMethod, status: 'COMPLETED', items: data.items.length },
        },
      });

      return newSale;
    });

    return sale;
  }

  async suspendSale(
    shopId: string,
    userId: string,
    data: {
      customerId?: string;
      items: Array<{ productId: string; quantity: number; unit?: string; unitPrice?: number; baseUnits?: number; unitConfigId?: string; unitName?: string; baseUnitsPerConfig?: number; discount?: number }>;
      discount?: number;
      payments: Array<{ method: string; amount: number }>;
      notes?: string;
    }
  ) {
    let totalAmount = 0;
    const saleItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      total: number;
      unit?: string;
      unitConfigId?: string | null;
      unitName?: string | null;
      baseUnitsPerConfig: number;
    }> = [];

    for (const item of data.items) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId, shopId },
      });
      let unitPrice = item.unitPrice ?? product?.sellingPrice ?? 0;
      if (product?.minPrice != null && unitPrice < product.minPrice) unitPrice = product.minPrice;
      if (product?.maxPrice != null && unitPrice > product.maxPrice) unitPrice = product.maxPrice;
      const itemDiscount = item.discount || 0;
      const itemTotal = item.quantity * unitPrice - itemDiscount;
      totalAmount += itemTotal;
      saleItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        discount: itemDiscount,
        total: itemTotal,
        unit: item.unitName || item.unit || product?.unit || 'piece',
        unitConfigId: item.unitConfigId ?? null,
        unitName: item.unitName || item.unit || product?.unit || 'piece',
        baseUnitsPerConfig: item.baseUnitsPerConfig ?? item.baseUnits ?? 1,
      });
    }

    const grandTotal = totalAmount - (data.discount || 0);

    return prisma.sale.create({
      data: {
        shopId,
        userId,
        customerId: data.customerId || null,
        totalAmount,
        discount: data.discount || 0,
        grandTotal,
        status: 'SUSPENDED',
        paymentDetails: data.payments,
        notes: data.notes,
        items: { create: saleItems },
      },
      include: { items: true },
    });
  }

  async markSuspended(saleId: string, shopId: string, userId: string) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, shopId },
    });

    if (!sale) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Sale not found' };
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id: saleId },
        data: { status: 'SUSPENDED' },
      });

      await tx.activityLog.create({
        data: {
          userId,
          shopId,
          action: 'SALE_SUSPENDED',
          details: { saleId },
          saleId,
        },
      });

      return updated;
    });
  }

  async resumeSale(saleId: string, shopId: string) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, shopId, status: 'SUSPENDED' },
      include: { items: { include: { product: true } } },
    });

    if (!sale) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Suspended sale not found' };
    }

    return sale;
  }

  async completeSuspendedSale(
    saleId: string,
    shopId: string,
    userId: string,
    payments: Array<{ method: string; amount: number }>
  ) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, shopId, status: 'SUSPENDED' },
      include: { items: true },
    });

    if (!sale) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Suspended sale not found' };
    }

    return prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        const baseUnits = item.quantity * (item.baseUnitsPerConfig || 1);
        const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stockQuantity: true } });
        const newStock = (product?.stockQuantity ?? 0) - baseUnits;
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newStock, baseUnitStock: newStock },
        });
      }

      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: 'COMPLETED',
          paymentMethod: payments.length === 1 ? payments[0].method : 'split',
          paymentDetails: payments,
          receiptNumber: generateReceiptNumber(),
          userId,
          saleDate: new Date(),
        },
      });

      return updatedSale;
    });
  }

  async listSales(shopId: string, filters: {
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
    customerId?: string;
    userId?: string;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = { shopId };
    if (filters.status) {
      where.status = filters.status as Prisma.SaleWhereInput['status'];
    }
    if (filters.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.from || filters.to) {
      const saleDate: Prisma.DateTimeFilter = {};
      if (filters.from) saleDate.gte = new Date(filters.from);
      if (filters.to) saleDate.lte = new Date(filters.to);
      where.saleDate = saleDate;
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          items: { include: { product: { select: { name: true } } } },
          user: { select: { name: true } },
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return { sales, total, page, limit };
  }

  async getSale(saleId: string) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, phone: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!sale) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Sale not found' };
    }
    return sale;
  }

  async refundSale(
    saleId: string,
    shopId: string,
    userId: string,
    data: { reason?: string; items?: Array<{ productId: string; quantity: number }>; status?: string; notes?: string }
  ) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, shopId, status: 'COMPLETED' },
      include: { items: { include: { product: true } } },
    });

    if (!sale) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Completed sale not found' };
    }

    if (!data.reason || !data.reason.trim()) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: 'A refund reason is required' };
    }

    // Determine the items and quantities to refund (defaults to full refund).
    const refundLines: Array<{
      productId: string;
      name: string;
      quantity: number;
      unitPrice: number;
      total: number;
      unit: string;
    }> = [];

    for (const item of sale.items) {
      const requested = data.items?.find((ri) => ri.productId === item.productId);
      const qty = requested ? requested.quantity : item.quantity;
      if (!qty || qty <= 0) continue;
      if (qty > item.quantity) {
        throw {
          status: 422,
          code: 'BUSINESS_RULE_VIOLATION',
          message: `Refund quantity for "${item.product.name}" exceeds the purchased quantity (${item.quantity})`,
        };
      }
      refundLines.push({
        productId: item.productId,
        name: item.product.name,
        quantity: qty,
        unitPrice: item.unitPrice,
        total: round2(qty * item.unitPrice),
        unit: item.unit || item.product.unit,
      });
    }

    if (refundLines.length === 0) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: 'No valid items to refund' };
    }

    const refundAmount = round2(refundLines.reduce((sum, l) => sum + l.total, 0));
    const status = data.status === 'PENDING' ? 'PENDING' : 'COMPLETED';

    const refund = await prisma.$transaction(async (tx) => {
      const refundNumber = generateReceiptNumber().replace('INV', 'RFD');

      const created = await tx.refund.create({
        data: {
          shopId,
          saleId,
          userId,
          customerId: sale.customerId,
          refundNumber,
          items: refundLines,
          amount: refundAmount,
          reason: data.reason,
          notes: data.notes,
          status,
          approvedBy: status === 'COMPLETED' ? userId : null,
          approvedAt: status === 'COMPLETED' ? new Date() : null,
        },
      });

      if (status === 'COMPLETED') {
        await this.applyRefundEffects(tx, shopId, sale, refundLines, refundAmount, userId, data.reason as string, refundNumber, 'REFUND');

        const isFullRefund = sale.items.every((i) => {
          const line = refundLines.find((l) => l.productId === i.productId);
          return line && line.quantity >= i.quantity;
        });
        if (isFullRefund) {
          await tx.sale.update({
            where: { id: saleId },
            data: { status: 'REFUNDED', refundReason: data.reason, refundedAt: new Date() },
          });
        }
      }

      await tx.activityLog.create({
        data: {
          userId,
          shopId,
          action: status === 'COMPLETED' ? 'REFUND_CREATED' : 'REFUND_REQUESTED',
          details: { saleId, refundId: created.id, reason: data.reason, amount: refundAmount, items: refundLines.length },
          saleId,
        },
      });

      await tx.auditLog.create({
        data: {
          shopId,
          userId,
          action: status === 'COMPLETED' ? 'REFUND_CREATED' : 'REFUND_REQUESTED',
          entity: 'Refund',
          entityId: created.id,
          newValue: { saleId, refundNumber, amount: refundAmount, reason: data.reason, items: refundLines.length },
        },
      });

      return created;
    });

    return refund;
  }

  /**
   * Applies the operational and financial effects of a completed refund or void:
   * restores inventory, reverses customer credit, and records the cash movement.
   */
  private async applyRefundEffects(
    tx: Prisma.TransactionClient,
    shopId: string,
    sale: { id: string; customerId: string | null; receiptNumber: string | null; paymentDetails: unknown; grandTotal: number },
    lines: Array<{ productId: string; quantity: number; total: number }>,
    refundAmount: number,
    userId: string,
    reason: string,
    reference: string,
    type: 'REFUND' | 'VOID'
  ) {
    for (const line of lines) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) continue;
      const newStock = product.stockQuantity + line.quantity;
      await tx.product.update({
        where: { id: line.productId },
        data: { stockQuantity: newStock },
      });
      await tx.stockAdjustment.create({
        data: {
          productId: line.productId,
          quantityChange: line.quantity,
          reason: `${type}: ${reason}`,
          performedBy: userId,
          shopId: product.shopId,
        },
      });
      await tx.stockMovement.create({
        data: {
          shopId: product.shopId,
          productId: line.productId,
          type: type === 'VOID' ? 'REVERSAL' : 'REFUND',
          quantity: line.quantity,
          balanceAfter: newStock,
          reference,
          userId,
          reason: `${type}: ${reason}`,
        },
      });
    }

    // Reverse customer credit if the original sale included a credit payment.
    const payments = (sale.paymentDetails as Array<{ method: string; amount: number }>) || [];
    const creditPaid = payments.find((p) => p.method && p.method.toLowerCase() === 'credit');
    if (sale.customerId && creditPaid && creditPaid.amount > 0) {
      const creditToReverse = Math.min(round2(creditPaid.amount), refundAmount);
      if (creditToReverse > 0) {
        const customer = await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            outstandingBalance: { decrement: creditToReverse },
            totalCreditGiven: { decrement: creditToReverse },
          },
        });
        await tx.creditLedgerEntry.create({
          data: {
            customerId: sale.customerId,
            type: 'ADJUSTMENT',
            amount: creditToReverse,
            balanceAfter: customer.outstandingBalance,
            referenceId: sale.id,
            referenceType: 'SALE',
            description: `${type} ${reference}`,
          },
        });
      }
    }

    // Record the cash reversal for the cash portion of the original payment.
    const cashPaid = payments.find((p) => p.method && p.method.toLowerCase() === 'cash');
    if (cashPaid && cashPaid.amount > 0) {
      const cashToReverse = Math.min(round2(cashPaid.amount), refundAmount);
      if (cashToReverse > 0) {
        await tx.cashTransaction.create({
          data: {
            shopId,
            type: type === 'VOID' ? 'ADJUSTMENT' : 'REFUND',
            amount: -cashToReverse,
            reference,
            userId,
            note: `${type} ${reference}`,
          },
        });
      }
    }
  }

  async voidSale(saleId: string, shopId: string, userId: string, data: { reason?: string }) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, shopId, status: 'COMPLETED' },
      include: { items: { include: { product: true } } },
    });

    if (!sale) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Completed sale not found' };
    }

    const reason = data.reason && data.reason.trim() ? data.reason.trim() : 'Transaction voided';
    const voidLines = sale.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      quantity: item.quantity,
      total: item.total,
      unit: item.unit || item.product.unit,
    }));

    const updated = await prisma.$transaction(async (tx) => {
      await this.applyRefundEffects(tx, shopId, sale, voidLines, sale.grandTotal, userId, reason, sale.receiptNumber || sale.id, 'VOID');

      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: 'VOIDED',
          refundReason: reason,
          refundedAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          shopId,
          action: 'SALE_VOIDED',
          details: { saleId, reason },
          saleId,
        },
      });

      await tx.auditLog.create({
        data: {
          shopId,
          userId,
          action: 'SALE_VOIDED',
          entity: 'Sale',
          entityId: saleId,
          oldValue: { status: sale.status },
          newValue: { status: 'VOIDED', reason },
        },
      });

      return updatedSale;
    });

    return updated;
  }

  async listRefunds(shopId: string, filters: { page?: number; limit?: number; status?: string; from?: string; to?: string }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.RefundWhereInput = { shopId };
    if (filters.status) where.status = filters.status as Prisma.RefundWhereInput['status'];
    if (filters.from || filters.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.from) createdAt.gte = new Date(filters.from);
      if (filters.to) createdAt.lte = new Date(filters.to);
      where.createdAt = createdAt;
    }

    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        include: {
          sale: { select: { receiptNumber: true, grandTotal: true } },
          customer: { select: { id: true, name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.refund.count({ where }),
    ]);

    return { refunds, total, page, limit };
  }

  async getRefund(refundId: string) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        sale: { select: { id: true, receiptNumber: true, grandTotal: true } },
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
      },
    });
    if (!refund) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Refund not found' };
    }
    return refund;
  }

  async setRefundStatus(refundId: string, shopId: string, userId: string, status: 'APPROVED' | 'REJECTED' | 'COMPLETED', note?: string) {
    const refund = await prisma.refund.findFirst({
      where: { id: refundId, shopId },
      include: { sale: { include: { items: true } } },
    });
    if (!refund) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Refund not found' };
    }
    if (refund.status !== 'PENDING') {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: `Cannot change a refund that is already ${refund.status}` };
    }

    if (status === 'REJECTED') {
      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.refund.update({ where: { id: refundId }, data: { status: 'REJECTED', approvedBy: userId, notes: note || refund.notes } });
        await tx.auditLog.create({
          data: { shopId, userId, action: 'REFUND_REJECTED', entity: 'Refund', entityId: refundId, oldValue: { status: 'PENDING' }, newValue: { status: 'REJECTED' } },
        });
        return res;
      });
      return updated;
    }

    // APPROVED (COMPLETED) — apply the financial/stock effects now.
    const lines = (refund.items as Array<{ productId: string; quantity: number; total: number }>) || [];
    const updated = await prisma.$transaction(async (tx) => {
      await this.applyRefundEffects(tx, shopId, refund.sale, lines, refund.amount, userId, refund.reason || 'Approved refund', refund.refundNumber || refund.id, 'REFUND');

      const saleLines = lines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
      const fullRefund = refund.sale.items.every((i) => {
        const line = saleLines.find((l) => l.productId === i.productId);
        return line && line.quantity >= i.quantity;
      });
      if (fullRefund && refund.sale.status === 'COMPLETED') {
        await tx.sale.update({
          where: { id: refund.saleId },
          data: { status: 'REFUNDED', refundReason: refund.reason, refundedAt: new Date() },
        });
      }

      const res = await tx.refund.update({
        where: { id: refundId },
        data: { status: 'COMPLETED', approvedBy: userId, approvedAt: new Date(), notes: note || refund.notes },
      });

      await tx.auditLog.create({
        data: { shopId, userId, action: 'REFUND_APPROVED', entity: 'Refund', entityId: refundId, oldValue: { status: 'PENDING' }, newValue: { status: 'COMPLETED' } },
      });

      return res;
    });

    return updated;
  }

  async getReceipt(receiptNumber: string) {
    const sale = await prisma.sale.findFirst({
      where: { receiptNumber },
      include: {
        items: { include: { product: true } },
        shop: { select: { name: true, address: true, receiptHeader: true, receiptFooter: true } },
        user: { select: { name: true } },
      },
    });

    if (!sale) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Receipt not found' };
    }
    return sale;
  }
}

export const saleService = new SaleService();
