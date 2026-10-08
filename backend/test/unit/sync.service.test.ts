jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import { syncService } from '../../src/services/sync.service';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';

const SHOP = 'shop1';

const baseSale = {
  userId: 'u1',
  totalAmount: 2000,
  grandTotal: 2000,
  paymentMethod: 'cash',
  paymentDetails: [{ method: 'cash', amount: 2000 }],
};

beforeEach(() => {
  resetMockPrisma();
  mockPrisma.shop.findUnique.mockResolvedValue({ id: SHOP, isArchived: false });
  mockPrisma.syncMetadata.upsert.mockResolvedValue({});
});

describe('syncService.pushChanges — idempotency', () => {
  it('applies the stock effect once for a new clientId', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(null);
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', sellingPrice: 1000, isService: false, unit: 'pc' });
    mockPrisma.sale.create.mockResolvedValue({ id: 's1' });

    await syncService.pushChanges(SHOP, 'dev1', {
      sales: [{ clientId: 'c1', data: { ...baseSale, items: [{ productId: 'p1', quantity: 2, total: 2000 }] }, lastModified: '' }],
    });

    expect(mockPrisma.sale.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.stockAdjustment.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stockQuantity: { decrement: 2 } } })
    );
  });

  it('does NOT re-apply stock when the same clientId is replayed', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue({ id: 's1' });
    mockPrisma.sale.update.mockResolvedValue({ id: 's1' });

    const result = await syncService.pushChanges(SHOP, 'dev1', {
      sales: [{ clientId: 'c1', data: baseSale, lastModified: '' }],
    });

    expect(mockPrisma.sale.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.sale.create).not.toHaveBeenCalled();
    expect(mockPrisma.stockAdjustment.create).not.toHaveBeenCalled();
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
    expect(result.processed.sales).toContain('c1');
  });

  it('rejects a push for a missing shop', async () => {
    mockPrisma.shop.findUnique.mockResolvedValue(null);
    await expect(syncService.pushChanges(SHOP, 'dev1', {})).rejects.toMatchObject({ status: 404 });
  });

  it('processes an offline expense', async () => {
    mockPrisma.expense.findFirst.mockResolvedValue(null);
    mockPrisma.expense.create.mockResolvedValue({ id: 'x' });
    await syncService.pushChanges(SHOP, 'dev1', {
      expenses: [{ clientId: 'e1', data: { userId: 'u1', category: 'Rent', amount: 100 }, lastModified: '' }],
    });
    expect(mockPrisma.expense.create).toHaveBeenCalled();
  });

  it('records a failed credit payment for a customer outside the shop', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    const res = await syncService.pushChanges(SHOP, 'dev1', {
      creditPayments: [{ clientId: 'p1', data: { customerId: 'c9', amount: 10 }, lastModified: '' }],
    });
    expect(res.failed.creditPayments[0].clientId).toBe('p1');
  });

  it('applies a valid credit payment', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ id: 'c1', outstandingBalance: 100 });
    mockPrisma.creditPayment.findFirst.mockResolvedValue(null);
    mockPrisma.customer.update.mockResolvedValue({});
    mockPrisma.creditPayment.create.mockResolvedValue({});
    await syncService.pushChanges(SHOP, 'dev1', {
      creditPayments: [{ clientId: 'p1', data: { customerId: 'c1', amount: 50 }, lastModified: '' }],
    });
    expect(mockPrisma.creditPayment.create).toHaveBeenCalled();
  });

  it('applies a stock adjustment', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({ id: 'p1', stockQuantity: 10 });
    mockPrisma.stockAdjustment.create.mockResolvedValue({});
    mockPrisma.product.update.mockResolvedValue({});
    await syncService.pushChanges(SHOP, 'dev1', {
      stockAdjustments: [{ clientId: 'a1', data: { productId: 'p1', quantityChange: 5, performedBy: 'u1' }, lastModified: '' }],
    });
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stockQuantity: 15 } })
    );
  });

  it('reads sync status', async () => {
    mockPrisma.syncMetadata.findUnique.mockResolvedValue({ shopId: SHOP });
    const status = await syncService.getSyncStatus(SHOP);
    expect(status.shopId).toBe(SHOP);
  });

  it('pulls changes since a timestamp', async () => {
    const res = await syncService.pullChanges(SHOP, new Date(0).toISOString(), 10);
    expect(res.changes).toBeTruthy();
    expect(res.hasMore).toBe(false);
  });

  it('rejects pull without a shopId', async () => {
    await expect(syncService.pullChanges('', '')).rejects.toMatchObject({ status: 400 });
  });
});
