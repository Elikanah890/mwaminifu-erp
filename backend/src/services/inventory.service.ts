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

const PRICE_EPSILON = 0.001;

/**
 * Spec 8.4.1 — a unit's selling price must be STRICTLY greater than its cost.
 * Cost is tracked per base unit, so a unit configuration's equivalent cost is
 * `costPrice * baseUnits`.
 */
function isAtOrBelowCost(costPerBaseUnit: number, price: number, baseUnits = 1): boolean {
  if (costPerBaseUnit <= 0) return false; // no meaningful cost to compare against
  return price <= costPerBaseUnit * baseUnits + PRICE_EPSILON;
}

function priceErrorForProduct(
  costPrice: number,
  sellingPrice?: number | null,
  minPrice?: number | null
): string | null {
  if (costPrice <= 0) return null;
  if (minPrice != null && isAtOrBelowCost(costPrice, minPrice, 1)) {
    return 'The minimum (fluctuating) price must be strictly greater than the cost price.';
  }
  if (sellingPrice != null && isAtOrBelowCost(costPrice, sellingPrice, 1)) {
    return 'The selling price must be strictly greater than the cost price.';
  }
  return null;
}

function priceErrorForUnit(
  costPrice: number,
  cfg: { baseUnits: number; sellingPrice?: number | null; minPrice?: number | null; pricingMode?: string | null }
): string | null {
  if (costPrice <= 0) return null;
  const equivalentCost = Math.round(costPrice * cfg.baseUnits * 100) / 100;
  if (cfg.pricingMode === 'FLUCTUATING') {
    if (cfg.minPrice == null) return 'A fluctuating unit needs a minimum price.';
    if (isAtOrBelowCost(costPrice, cfg.minPrice, cfg.baseUnits)) {
      return `The minimum price for "${cfg.baseUnits} base units" must be strictly greater than its cost (${equivalentCost}).`;
    }
    return null;
  }
  if (cfg.sellingPrice == null || isAtOrBelowCost(costPrice, cfg.sellingPrice, cfg.baseUnits)) {
    return `The price for "${cfg.baseUnits} base units" must be strictly greater than its cost (${equivalentCost}).`;
  }
  return null;
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
    unitConfigs?: Array<{
      unitName: string;
      baseUnits: number;
      sellingPrice: number;
      minPrice?: number;
      maxPrice?: number;
      pricingMode?: string;
      isDefault?: boolean;
      priceOverride?: boolean;
    }>;
    images?: string[];
    barcode?: string;
    priceOverride?: boolean;
  }, opts: { isOwner?: boolean } = {}) {
    // Spec 8.4.1 — reject a selling/min price at or below cost unless the Owner
    // has explicitly confirmed an override.
    const costPrice = data.costPrice || 0;
    const priceError = priceErrorForProduct(costPrice, data.sellingPrice, data.minPrice);
    const overrideApproved = Boolean(opts.isOwner && data.priceOverride);
    if (priceError && !overrideApproved) {
      throw { status: 422, code: 'PRICE_BELOW_COST', message: priceError };
    }

    // Validate every unit configuration against the base-unit cost.
    const configs = data.unitConfigs ?? [];
    let configOverrideUsed = false;
    for (const cfg of configs) {
      const err = priceErrorForUnit(costPrice, cfg);
      if (!err) continue;
      if (opts.isOwner && cfg.priceOverride) {
        configOverrideUsed = true;
      } else {
        throw { status: 422, code: 'PRICE_BELOW_COST', message: err };
      }
    }

    // Barcodes are unique per shop — reject a clash with a clear message.
    if (data.barcode) {
      const duplicate = await prisma.product.findFirst({
        where: { shopId, barcode: data.barcode },
        select: { id: true },
      });
      if (duplicate) {
        throw { status: 409, code: 'DUPLICATE_BARCODE', message: `Barcode "${data.barcode}" is already used by another product in this shop` };
      }
    }

    const baseStock = data.baseUnitStock ?? data.stockQuantity ?? 0;
    const baseUnitName = data.baseUnitName || data.unit || 'piece';

    return prisma.product.create({
      data: {
        shopId,
        needsPriceReview: Boolean((priceError && overrideApproved) || configOverrideUsed),
        name: data.name,
        sku: data.sku,
        categoryId: data.categoryId,
        supplier: data.supplier,
        supplierId: data.supplierId,
        brand: data.brand,
        description: data.description,
        taxRate: data.taxRate || 0,
        status: data.status || 'ACTIVE',
        costPrice,
        sellingPrice: data.sellingPrice || 0,
        minPrice: data.minPrice,
        maxPrice: data.maxPrice,
        reorderLevel: data.reorderLevel || 10,
        stockQuantity: baseStock,
        unit: data.unit || baseUnitName,
        unitConversion: data.unitConversion,
        baseUnitName,
        baseUnitStock: baseStock,
        images: data.images || [],
        barcode: data.barcode,
        ...(configs.length
          ? {
              unitConfigs: {
                create: configs.map((c) => ({
                  unitName: c.unitName,
                  baseUnits: c.baseUnits,
                  sellingPrice: c.sellingPrice,
                  minPrice: c.minPrice,
                  maxPrice: c.maxPrice,
                  pricingMode: c.pricingMode || 'FIXED',
                  isDefault: c.isDefault ?? false,
                })),
              },
            }
          : {}),
      },
      include: { unitConfigs: true },
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
    baseUnitName?: string;
    baseUnitStock?: number;
    unitConfigs?: Array<{
      unitName: string;
      baseUnits: number;
      sellingPrice: number;
      minPrice?: number;
      maxPrice?: number;
      pricingMode?: string;
      isDefault?: boolean;
      priceOverride?: boolean;
    }>;
    images?: string[];
    barcode?: string;
    isActive?: boolean;
    priceOverride?: boolean;
  }, opts: { isOwner?: boolean } = {}) {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      include: { unitConfigs: true },
    });
    if (!existing) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
    }

    if (data.barcode) {
      const duplicate = await prisma.product.findFirst({
        where: { shopId: existing.shopId, barcode: data.barcode, NOT: { id: productId } },
        select: { id: true },
      });
      if (duplicate) {
        throw { status: 409, code: 'DUPLICATE_BARCODE', message: `Barcode "${data.barcode}" is already used by another product in this shop` };
      }
    }

    const { priceOverride, unitConfigs, baseUnitStock, baseUnitName, ...rest } = data;
    const nextCost = rest.costPrice ?? existing.costPrice;
    const nextSelling = rest.sellingPrice !== undefined ? rest.sellingPrice : existing.sellingPrice;
    const nextMin = rest.minPrice !== undefined ? rest.minPrice : existing.minPrice;

    const priceError = priceErrorForProduct(nextCost, nextSelling, nextMin);
    const overrideApproved = Boolean(opts.isOwner && priceOverride);
    // Reject only when the user is deliberately setting a price at/below cost.
    // A pure cost-price edit is allowed (it just flags the product for review).
    const priceProvided = rest.sellingPrice !== undefined || rest.minPrice !== undefined;
    if (priceError && priceProvided && !overrideApproved) {
      throw { status: 422, code: 'PRICE_BELOW_COST', message: priceError };
    }

    // Validate any incoming unit configurations against the (possibly new) cost.
    let configOverrideUsed = false;
    if (unitConfigs) {
      for (const cfg of unitConfigs) {
        const err = priceErrorForUnit(nextCost, cfg);
        if (!err) continue;
        if (opts.isOwner && cfg.priceOverride) configOverrideUsed = true;
        else throw { status: 422, code: 'PRICE_BELOW_COST', message: err };
      }
    }

    // Spec 8.4.1 — editing cost is allowed, but if it invalidates any existing
    // price/range the product is flagged for review (including its unit configs).
    const priceFieldsTouched =
      rest.sellingPrice !== undefined || rest.minPrice !== undefined || rest.costPrice !== undefined;
    let needsPriceReview = existing.needsPriceReview;
    if (overrideApproved) {
      needsPriceReview = false;
    } else if (priceFieldsTouched || unitConfigs) {
      const effectiveConfigs = unitConfigs ?? existing.unitConfigs;
      const anyUnitInvalid = effectiveConfigs.some((cfg) => priceErrorForUnit(nextCost, cfg) != null);
      needsPriceReview = Boolean(priceError) || anyUnitInvalid;
    }
    if (configOverrideUsed) needsPriceReview = false;

    const updateData: Prisma.ProductUncheckedUpdateInput = { ...rest, needsPriceReview };
    if (baseUnitName !== undefined) updateData.baseUnitName = baseUnitName;
    if (baseUnitStock !== undefined) {
      updateData.baseUnitStock = baseUnitStock;
      updateData.stockQuantity = baseUnitStock;
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id: productId }, data: updateData });
      if (unitConfigs) {
        await tx.productUnitConfig.deleteMany({ where: { productId } });
        if (unitConfigs.length) {
          await tx.productUnitConfig.createMany({
            data: unitConfigs.map((c) => ({
              productId,
              unitName: c.unitName,
              baseUnits: c.baseUnits,
              sellingPrice: c.sellingPrice,
              minPrice: c.minPrice,
              maxPrice: c.maxPrice,
              pricingMode: c.pricingMode || 'FIXED',
              isDefault: c.isDefault ?? false,
            })),
          });
        }
      }
      return updated;
    });
  }

  /** Recompute the needs_price_review flag for a product across its unit configs. */
  async recomputePriceReview(productId: string): Promise<boolean> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { unitConfigs: true },
    });
    if (!product) return false;
    const review =
      priceErrorForProduct(product.costPrice, product.sellingPrice, product.minPrice) != null ||
      product.unitConfigs.some((cfg) => priceErrorForUnit(product.costPrice, cfg) != null);
    if (review !== product.needsPriceReview) {
      await prisma.product.update({ where: { id: productId }, data: { needsPriceReview: review } });
    }
    return review;
  }

  async deleteProduct(productId: string) {
    return prisma.product.update({
      where: { id: productId },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async adjustStock(productId: string, shopId: string, userId: string, data: { quantityChange: number; reason: string; unitConfigId?: string; baseUnits?: number }) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, shopId },
      });

      if (!product) {
        throw { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
      }

      // Adjustments may be expressed in a unit configuration (e.g. +1 carton).
      let units = data.baseUnits && data.baseUnits > 0 ? data.baseUnits : 1;
      if (data.unitConfigId) {
        const cfg = await tx.productUnitConfig.findFirst({
          where: { id: data.unitConfigId, productId },
        });
        if (!cfg) {
          throw { status: 422, code: 'VALIDATION_ERROR', message: 'Unit configuration not found for this product' };
        }
        units = cfg.baseUnits;
      }
      const baseChange = data.quantityChange * units;

      const newQuantity = product.stockQuantity + baseChange;
      if (newQuantity < 0) {
        throw { status: 422, code: 'BUSINESS_RULE_VIOLATION', message: 'Stock cannot be negative' };
      }

      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: newQuantity, baseUnitStock: newQuantity },
      });

      await tx.stockAdjustment.create({
        data: {
          productId,
          quantityChange: baseChange,
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

      return { productId, previousStock: product.stockQuantity, newQuantity, change: baseChange };
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
    data: { unitName: string; baseUnits: number; sellingPrice: number; minPrice?: number; maxPrice?: number; pricingMode?: string; isDefault?: boolean; priceOverride?: boolean },
    opts: { isOwner?: boolean } = {}
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { costPrice: true },
    });
    if (!product) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Product not found' };
    }

    const priceError = priceErrorForUnit(product.costPrice, data);
    const overrideApproved = Boolean(opts.isOwner && data.priceOverride);
    if (priceError && !overrideApproved) {
      throw { status: 422, code: 'PRICE_BELOW_COST', message: priceError };
    }

    const created = await prisma.productUnitConfig.create({
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
    await this.recomputePriceReview(productId);
    return created;
  }

  async deleteUnitConfig(id: string) {
    const cfg = await prisma.productUnitConfig.findUnique({ where: { id }, select: { productId: true } });
    const deleted = await prisma.productUnitConfig.delete({ where: { id } });
    if (cfg) await this.recomputePriceReview(cfg.productId);
    return deleted;
  }

  /** Products flagged for price review (cost edit invalidated a price). */
  async listPriceReviewProducts(shopId: string) {
    return prisma.product.findMany({
      where: { shopId, needsPriceReview: true, isActive: true },
      select: { id: true, name: true, costPrice: true, sellingPrice: true, minPrice: true, unitConfigs: true },
      orderBy: { updatedAt: 'desc' },
    });
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
      // A cost-bulk change can invalidate existing prices across unit configs,
      // so re-evaluate the review flag for each affected product.
      await this.recomputePriceReview(p.id);
    }

    return { updated: products.length };
  }
}

export const inventoryService = new InventoryService();
