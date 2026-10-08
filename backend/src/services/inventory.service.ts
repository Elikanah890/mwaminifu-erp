import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { notificationService } from './notification.service';

/**
 * Generates a valid EAN-13 barcode with a Mwaminifu-style internal prefix.
 * The first 12 digits are generated and the 13th is a checksum.
 */
function generateEan13(): string {
  // Prefix "2" (in-store/retail) + 11 random digits = 12 digits, then checksum.
  const digits = [2];
  for (let i = 0; i < 11; i += 1) digits.push(Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, d, idx) => acc + d * (idx % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return [...digits, check].join('');
}

export class InventoryService {
  async listProducts(shopId: string, filters: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    lowStock?: boolean;
  }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { shopId, isActive: true };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.lowStock) {
      where.stockQuantity = { lte: prisma.product.fields.reorderLevel };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { name: true } }, unitConfigs: true },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { products, total, page, limit };
  }

  async getLowStock(shopId: string) {
    return prisma.product.findMany({
      where: {
        shopId,
        isActive: true,
        stockQuantity: { lte: prisma.product.fields.reorderLevel },
      },
      orderBy: { stockQuantity: 'asc' },
    });
  }

  async getProduct(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { id: true, name: true } },
        stockAdjustments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { performer: { select: { name: true } } },
        },
      },
    });
    if (!product) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
    }
    return product;
  }

  async createProduct(shopId: string, userId: string, data: {
    name: string;
    sku?: string;
    categoryId?: string;
    supplier?: string;
    supplierId?: string;
    brand?: string;
    description?: string;
    taxRate?: number;
    status?: string;
    costPrice?: number;
    sellingPrice?: number;
    minPrice?: number;
    maxPrice?: number;
    reorderLevel?: number;
    stockQuantity?: number;
    unit?: string;
    unitConversion?: number;
    baseUnitName?: string;
    baseUnitStock?: number;
    images?: string[];
    barcode?: string;
  }) {
    return prisma.product.create({
      data: {
        shopId,
        name: data.name,
        sku: data.sku,
        categoryId: data.categoryId,
        supplier: data.supplier,
        supplierId: data.supplierId,
        brand: data.brand,
        description: data.description,
        taxRate: data.taxRate || 0,
        status: data.status || 'ACTIVE',
        costPrice: data.costPrice || 0,
        sellingPrice: data.sellingPrice || 0,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        reorderLevel: data.reorderLevel || 10,
        stockQuantity: data.stockQuantity || 0,
        unit: data.unit || 'piece',
        unitConversion: data.unitConversion,
        baseUnitName: data.baseUnitName || data.unit || 'piece',
        baseUnitStock: data.baseUnitStock ?? data.stockQuantity ?? 0,
        images: data.images || [],
        barcode: data.barcode,
      },
    });
  }

  async updateProduct(productId: string, data: {
    name?: string;
    sku?: string;
    categoryId?: string;
    supplier?: string;
    supplierId?: string;
    brand?: string;
    description?: string;
    taxRate?: number;
    status?: string;
    costPrice?: number;
    sellingPrice?: number;
    minPrice?: number;
    maxPrice?: number;
    reorderLevel?: number;
    stockQuantity?: number;
    unit?: string;
    unitConversion?: number;
    images?: string[];
    barcode?: string;
    isActive?: boolean;
  }) {
    return prisma.product.update({
      where: { id: productId },
      data,
    });
  }

  async deleteProduct(productId: string) {
    return prisma.product.update({
      where: { id: productId },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async adjustStock(productId: string, shopId: string, userId: string, data: { quantityChange: number; reason: string }) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, shopId },
      });

      if (!product) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
      }

      const newQuantity = product.stockQuantity + data.quantityChange;
      if (newQuantity < 0) {
        throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Stock cannot be negative' };
      }

      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: newQuantity },
      });

      await tx.stockAdjustment.create({
        data: {
          productId,
          quantityChange: data.quantityChange,
          reason: data.reason,
          performedBy: userId,
          shopId,
        },
      });

      // Check low stock
      if (newQuantity <= (product.reorderLevel)) {
        await notificationService.sendLowStockAlert(
          shopId,
          product.name,
          newQuantity,
          product.reorderLevel
        );
      }

      return { productId, previousStock: product.stockQuantity, newQuantity, change: data.quantityChange };
    });
  }

  async getStockHistory(productId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [adjustments, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where: { productId },
        include: { performer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.stockAdjustment.count({ where: { productId } }),
    ]);
    return { adjustments, total, page, limit };
  }

  async getValuation(shopId: string) {
    const products = await prisma.product.findMany({
      where: { shopId, isActive: true },
      select: { costPrice: true, stockQuantity: true, name: true, sku: true },
    });

    const totalValue = products.reduce((sum, p) => sum + p.costPrice * p.stockQuantity, 0);
    const totalItems = products.reduce((sum, p) => sum + p.stockQuantity, 0);

    return {
      totalValue,
      totalItems,
      totalProducts: products.length,
      products: products.map((p) => ({
        name: p.name,
        sku: p.sku,
        stock: p.stockQuantity,
        costPerUnit: p.costPrice,
        totalValue: p.costPrice * p.stockQuantity,
      })),
    };
  }

  async listCategories(shopId: string) {
    return prisma.category.findMany({
      where: { shopId, isArchived: false },
      include: {
        _count: { select: { products: true } },
        children: { include: { _count: { select: { products: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(shopId: string, name: string, description?: string, parentId?: string) {
    return prisma.category.create({
      data: { shopId, name, description, parentId: parentId || null, isDefault: false },
    });
  }

  async updateCategory(categoryId: string, data: { name?: string; description?: string; parentId?: string | null }) {
    return prisma.category.update({
      where: { id: categoryId },
      data,
    });
  }

  async deleteCategory(categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Category not found' };
    }
    if (category._count.products > 0) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: `Cannot archive category with ${category._count.products} products` };
    }
    if (category._count.children > 0) {
      throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Cannot archive category with subcategories' };
    }
    return prisma.category.update({
      where: { id: categoryId },
      data: { isArchived: true, deletedAt: new Date() },
    });
  }

  async listUnitConfigs(productId: string) {
    return prisma.productUnitConfig.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createUnitConfig(
    productId: string,
    data: { unitName: string; baseUnits: number; sellingPrice: number; minPrice?: number; maxPrice?: number; pricingMode?: string; isDefault?: boolean }
  ) {
    return prisma.productUnitConfig.create({
      data: {
        productId,
        unitName: data.unitName,
        baseUnits: data.baseUnits,
        sellingPrice: data.sellingPrice,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        pricingMode: data.pricingMode || 'FIXED',
        isDefault: data.isDefault ?? false,
      },
    });
  }

  async deleteUnitConfig(id: string) {
    return prisma.productUnitConfig.delete({ where: { id } });
  }

  async findByBarcode(shopId: string, barcode: string) {
    return prisma.product.findFirst({
      where: { shopId, barcode, isActive: true },
      include: { category: { select: { name: true } }, unitConfigs: true },
    });
  }

  async generateBarcode(shopId: string): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = generateEan13();
      const existing = await prisma.product.findFirst({ where: { shopId, barcode: code } });
      if (!existing) return code;
    }
    throw { status: 500, code: 'GENERATION_FAILED', message: 'Could not generate a unique barcode' };
  }

  async importProducts(shopId: string, userId: string, rows: Array<Record<string, unknown>>) {
    if (!Array.isArray(rows) || rows.length === 0) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: 'No product rows provided' };
    }

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const name = String(row.name ?? row.Name ?? '').trim();
      if (!name) continue;

      const sku = String(row.sku ?? row.SKU ?? '').trim() || undefined;
      const data = {
        name,
        sku,
        barcode: String(row.barcode ?? row.Barcode ?? '').trim() || undefined,
        brand: String(row.brand ?? row.Brand ?? '').trim() || undefined,
        costPrice: Number(row.costPrice ?? row['Cost Price'] ?? 0) || 0,
        sellingPrice: Number(row.sellingPrice ?? row['Selling Price'] ?? 0) || 0,
        stockQuantity: Number(row.stockQuantity ?? row['Stock'] ?? 0) || 0,
        reorderLevel: Number(row.reorderLevel ?? row['Reorder Level'] ?? 10) || 10,
        unit: String(row.unit ?? row.Unit ?? 'piece').trim() || 'piece',
      };

      if (sku) {
        const existing = await prisma.product.findFirst({ where: { shopId, sku } });
        if (existing) {
          await prisma.product.update({ where: { id: existing.id }, data });
          updated += 1;
          continue;
        }
      }

      await prisma.product.create({
        data: {
          ...data,
          shopId,
          baseUnitName: data.unit,
          baseUnitStock: data.stockQuantity,
        },
      });
      created += 1;
    }

    return { created, updated };
  }

  async bulkPriceUpdate(shopId: string, data: {
    scope?: 'all' | 'category';
    categoryId?: string;
    type: 'percentage' | 'fixed';
    value: number;
    field?: 'sellingPrice' | 'costPrice';
  }) {
    const where: Prisma.ProductWhereInput = { shopId, isActive: true };
    if (data.scope === 'category' && data.categoryId) {
      where.categoryId = data.categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      select: { id: true, sellingPrice: true, costPrice: true },
    });

    const field = data.field === 'costPrice' ? 'costPrice' : 'sellingPrice';

    for (const p of products) {
      const current = p[field];
      const next = data.type === 'percentage'
        ? current + (current * data.value) / 100
        : current + data.value;
      const rounded = Math.max(0, Math.round(next * 100) / 100);
      await prisma.product.update({
        where: { id: p.id },
        data: { [field]: rounded },
      });
    }

    return { updated: products.length };
  }
}

export const inventoryService = new InventoryService();
