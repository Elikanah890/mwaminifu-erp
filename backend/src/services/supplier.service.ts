import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export class SupplierService {
  async listSuppliers(shopId: string, filters: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filters.limit) || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = { shopId, deletedAt: null };
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          _count: { select: { products: true, purchases: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    return { suppliers, total, page, limit };
  }

  async getSupplier(supplierId: string) {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        _count: { select: { products: true, purchases: true } },
        products: { select: { id: true, name: true, sellingPrice: true } },
        purchases: { orderBy: { date: 'desc' }, take: 20 },
      },
    });
    if (!supplier) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Supplier not found' };
    }
    return supplier;
  }

  async createSupplier(shopId: string, data: { name: string; phone?: string; email?: string; address?: string; notes?: string }) {
    return prisma.supplier.create({
      data: {
        shopId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        notes: data.notes,
      },
    });
  }

  async updateSupplier(supplierId: string, data: { name?: string; phone?: string; email?: string; address?: string; notes?: string }) {
    return prisma.supplier.update({
      where: { id: supplierId },
      data,
    });
  }

  async deleteSupplier(supplierId: string) {
    return prisma.supplier.update({
      where: { id: supplierId },
      data: { deletedAt: new Date() },
    });
  }
}

export const supplierService = new SupplierService();
