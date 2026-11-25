jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import { Prisma } from '@prisma/client';
import { inventoryService } from '../../src/services/inventory.service';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';

const SHOP = 'shop1';
const USER = 'u1';

function uniqueError(target: string[]): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '5.18.0',
    meta: { target },
  });
}

beforeEach(() => {
  resetMockPrisma();
});

describe('inventoryService.createProduct', () => {
  it('creates the product and shop prices in a single transaction', async () => {
    mockPrisma.product.create.mockResolvedValue({
      id: 'p1',
      shopId: SHOP,
      name: 'Cement',
      sellingPrice: 12000,
      minPrice: null,
      maxPrice: null,
      unitConfigs: [{ id: 'u1', sellingPrice: 130000, minPrice: null, maxPrice: null }],
    });

    const created = await inventoryService.createProduct(SHOP, USER, {
      name: 'Cement',
      costPrice: 10000,
      sellingPrice: 12000,
      stockQuantity: 5,
      unitConfigs: [{ unitName: 'bag', baseUnits: 10, sellingPrice: 130000 }],
    });

    expect(created.id).toBe('p1');
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.shopProductPrice.createMany).toHaveBeenCalledWith({
      data: [
        { shopId: SHOP, productId: 'p1', unitKey: 'base', sellingPrice: 12000, minPrice: null, maxPrice: null },
        { shopId: SHOP, productId: 'p1', unitKey: 'u1', sellingPrice: 130000, minPrice: null, maxPrice: null },
      ],
    });
    // No extra barcode pre-check or post-create re-read.
    expect(mockPrisma.product.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.product.findUnique).not.toHaveBeenCalled();
  });

  it('maps a duplicate barcode constraint to a friendly 409', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(uniqueError(['shopId', 'barcode']));

    await expect(
      inventoryService.createProduct(SHOP, USER, { name: 'Cement', barcode: '1234567890128' })
    ).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_BARCODE' });
  });

  it('returns the original product when a replayed clientId collides', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(uniqueError(['shopId', 'clientId']));
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'existing', unitConfigs: [] });
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'existing',
      sellingPrice: 100,
      minPrice: null,
      maxPrice: null,
      unitConfigs: [],
    });

    const product = await inventoryService.createProduct(SHOP, USER, {
      name: 'Cement',
      clientId: 'c1',
    });

    expect(product.id).toBe('existing');
    expect(mockPrisma.shopProductPrice.upsert).toHaveBeenCalledTimes(1);
  });
});

describe('inventoryService.listProducts', () => {
  it('skips unit configs and shop prices in compact mode', async () => {
    await inventoryService.listProducts(SHOP, { compact: '1' });

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { category: { select: { name: true } } } })
    );
  });

  it('includes unit configs and shop prices by default', async () => {
    await inventoryService.listProducts(SHOP, {});

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          category: { select: { name: true } },
          unitConfigs: true,
          shopPrices: { where: { shopId: SHOP } },
        },
      })
    );
  });
});
