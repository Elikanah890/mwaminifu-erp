import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export class StockService {
  async listMovements(shopId: string, filters: {
    page?: number;
    limit?: number;
    productId?: string;
    type?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(filters.limit) || 100));
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = { shopId };
    if (filters.productId) where.productId = filters.productId;
    if (filters.type) where.type = filters.type;
    if (filters.from || filters.to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.from) createdAt.gte = new Date(filters.from);
      if (filters.to) createdAt.lte = new Date(filters.to);
      where.createdAt = createdAt;
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { movements, total, page, limit };
  }

  async fastMovers(shopId: string, limit = 10) {
    const grouped = await prisma.stockMovement.groupBy({
      by: ['productId'],
      where: { shopId, type: 'SALE' },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'asc' } }, // SALE quantities are negative
      take: limit,
    });

    const productIds = grouped.map((g) => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true },
    });

    return grouped.map((g) => ({
      productId: g.productId,
      name: products.find((p) => p.id === g.productId)?.name || 'Unknown',
      sku: products.find((p) => p.id === g.productId)?.sku,
      soldQuantity: Math.abs(g._sum.quantity || 0),
    }));
  }

  async stockByCategory(shopId: string) {
    const products = await prisma.product.findMany({
      where: { shopId, isActive: true },
      select: {
        category: { select: { name: true } },
        costPrice: true,
        stockQuantity: true,
        sellingPrice: true,
      },
    });

    const byCategory: Record<string, { value: number; retailValue: number; items: number; products: number }> = {};
    for (const p of products) {
      const name = p.category?.name || 'Uncategorized';
      if (!byCategory[name]) byCategory[name] = { value: 0, retailValue: 0, items: 0, products: 0 };
      byCategory[name].value += p.costPrice * p.stockQuantity;
      byCategory[name].retailValue += p.sellingPrice * p.stockQuantity;
      byCategory[name].items += p.stockQuantity;
      byCategory[name].products += 1;
    }

    return Object.entries(byCategory).map(([category, stats]) => ({ category, ...stats }));
  }

  async lowAndOutOfStock(shopId: string) {
    const products = await prisma.product.findMany({
      where: { shopId, isActive: true },
      select: { id: true, name: true, sku: true, stockQuantity: true, reorderLevel: true, unit: true },
    });

    const outOfStock = products.filter((p) => p.stockQuantity <= 0);
    const lowStock = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.reorderLevel);

    return { lowStock, outOfStock };
  }

  async stockValuation(shopId: string) {
    const products = await prisma.product.findMany({
      where: { shopId, isActive: true },
      select: { costPrice: true, sellingPrice: true, stockQuantity: true },
    });

    const totalCost = products.reduce((s, p) => s + p.costPrice * p.stockQuantity, 0);
    const totalRetail = products.reduce((s, p) => s + p.sellingPrice * p.stockQuantity, 0);
    const totalItems = products.reduce((s, p) => s + p.stockQuantity, 0);

    return {
      totalCost,
      totalRetail,
      totalItems,
      totalProducts: products.length,
      potentialProfit: totalRetail - totalCost,
    };
  }
}

export const stockService = new StockService();
