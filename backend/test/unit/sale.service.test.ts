jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import { saleService } from '../../src/services/sale.service';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';

const SHOP = 'shop1';
const USER = 'u1';

const product = {
  id: 'p1', name: 'Rice', sellingPrice: 1000, costPrice: 600, stockQuantity: 10,
  isActive: true, isService: false, unit: 'pc', minPrice: null, maxPrice: null,
};

const salePayload = {
  items: [{ productId: 'p1', quantity: 2 }],
  payments: [{ method: 'cash', amount: 2000 }],
};

beforeEach(() => {
  resetMockPrisma();
  mockPrisma.shop.findFirst.mockResolvedValue({ id: SHOP, ownerId: USER, isArchived: false });
});

describe('saleService.createSale', () => {
  it('creates an online sale and decrements stock', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(null);
    mockPrisma.product.findFirst.mockResolvedValue(product);
    mockPrisma.sale.create.mockResolvedValue({ id: 's1', receiptNumber: 'INV-1', grandTotal: 2000, items: [] });

    const sale = await saleService.createSale(SHOP, USER, salePayload);

    expect(sale.id).toBe('s1');
    expect(mockPrisma.stockAdjustment.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stockQuantity: 8, baseUnitStock: 8 } })
    );
    expect(mockPrisma.cashTransaction.create).toHaveBeenCalledTimes(1);
  });

  it('is idempotent for a replayed clientId (no duplicate sale)', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue({ id: 'existing' });

    const sale = await saleService.createSale(SHOP, USER, { ...salePayload, clientId: 'c1' });

    expect(sale.id).toBe('existing');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.stockAdjustment.create).not.toHaveBeenCalled();
  });

  it('rejects a sale that exceeds available stock', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(null);
    mockPrisma.product.findFirst.mockResolvedValue({ ...product, stockQuantity: 1 });
    await expect(saleService.createSale(SHOP, USER, salePayload)).rejects.toMatchObject({ status: 422 });
  });

  it('rejects underpayment', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(null);
    mockPrisma.product.findFirst.mockResolvedValue(product);
    await expect(
      saleService.createSale(SHOP, USER, {
        items: [{ productId: 'p1', quantity: 2 }],
        payments: [{ method: 'cash', amount: 500 }],
      })
    ).rejects.toMatchObject({ status: 422 });
  });

  it('rejects a credit sale without a customer', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(null);
    mockPrisma.product.findFirst.mockResolvedValue(product);
    await expect(
      saleService.createSale(SHOP, USER, {
        items: [{ productId: 'p1', quantity: 2 }],
        payments: [{ method: 'credit', amount: 2000 }],
      })
    ).rejects.toMatchObject({ status: 422 });
  });
});

const completedSale = {
  id: 's1', customerId: null, receiptNumber: 'INV', grandTotal: 2000, status: 'COMPLETED',
  paymentDetails: [{ method: 'cash', amount: 2000 }],
  items: [{
    productId: 'p1', quantity: 2, unitPrice: 1000, total: 2000, unit: 'pc',
    product: { id: 'p1', name: 'Rice', unit: 'pc', shopId: SHOP, stockQuantity: 10 },
  }],
};

function mockRefundEffects() {
  mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', shopId: SHOP, stockQuantity: 8 });
  mockPrisma.product.update.mockResolvedValue({});
  mockPrisma.stockAdjustment.create.mockResolvedValue({});
  mockPrisma.stockMovement.create.mockResolvedValue({});
  mockPrisma.cashTransaction.create.mockResolvedValue({});
  mockPrisma.sale.update.mockResolvedValue({});
  mockPrisma.activityLog.create.mockResolvedValue({});
  mockPrisma.auditLog.create.mockResolvedValue({});
}

describe('saleService suspend / resume', () => {
  it('creates a suspended sale', async () => {
    mockPrisma.product.findFirst.mockResolvedValue(product);
    mockPrisma.sale.create.mockResolvedValue({ id: 'sus1', status: 'SUSPENDED', items: [] });
    const sale = await saleService.suspendSale(SHOP, USER, { items: [{ productId: 'p1', quantity: 1 }], payments: [] });
    expect(sale.status).toBe('SUSPENDED');
  });

  it('marks an existing sale as suspended', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue({ id: 's1' });
    mockPrisma.sale.update.mockResolvedValue({ id: 's1', status: 'SUSPENDED' });
    mockPrisma.activityLog.create.mockResolvedValue({});
    expect((await saleService.markSuspended('s1', SHOP, USER)).status).toBe('SUSPENDED');
  });

  it('resumes a suspended sale', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue({ id: 's1', items: [] });
    expect((await saleService.resumeSale('s1', SHOP)).id).toBe('s1');
  });

  it('completes a suspended sale and decrements stock', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue({ id: 's1', items: [{ productId: 'p1', quantity: 2 }] });
    mockPrisma.product.update.mockResolvedValue({});
    mockPrisma.sale.update.mockResolvedValue({ id: 's1', status: 'COMPLETED' });
    expect((await saleService.completeSuspendedSale('s1', SHOP, USER, [{ method: 'cash', amount: 2000 }])).status).toBe('COMPLETED');
  });
});

describe('saleService reads', () => {
  it('lists sales', async () => {
    mockPrisma.sale.findMany.mockResolvedValue([{ id: 's1' }]);
    mockPrisma.sale.count.mockResolvedValue(1);
    expect((await saleService.listSales(SHOP, {})).total).toBe(1);
  });

  it('gets a sale and throws 404 when missing', async () => {
    mockPrisma.sale.findUnique.mockResolvedValue({ id: 's1' });
    expect((await saleService.getSale('s1')).id).toBe('s1');
    mockPrisma.sale.findUnique.mockResolvedValue(null);
    await expect(saleService.getSale('x')).rejects.toMatchObject({ status: 404 });
  });

  it('lists and gets refunds', async () => {
    mockPrisma.refund.findMany.mockResolvedValue([{ id: 'r1' }]);
    expect((await saleService.listRefunds(SHOP, {})).refunds).toHaveLength(1);
    mockPrisma.refund.findUnique.mockResolvedValue({ id: 'r1' });
    expect((await saleService.getRefund('r1')).id).toBe('r1');
  });

  it('gets a receipt', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue({ id: 's1', receiptNumber: 'INV' });
    expect((await saleService.getReceipt('INV')).id).toBe('s1');
  });
});

describe('saleService.refundSale', () => {
  it('completes a full refund and restores stock', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(completedSale);
    mockPrisma.refund.create.mockResolvedValue({ id: 'r1' });
    mockRefundEffects();
    const refund = await saleService.refundSale('s1', SHOP, USER, { reason: 'Damaged' });
    expect(refund.id).toBe('r1');
    expect(mockPrisma.product.update).toHaveBeenCalled();
    expect(mockPrisma.cashTransaction.create).toHaveBeenCalled();
  });

  it('creates a PENDING refund without applying effects', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(completedSale);
    mockPrisma.refund.create.mockResolvedValue({ id: 'r2', status: 'PENDING' });
    mockPrisma.activityLog.create.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
    const refund = await saleService.refundSale('s1', SHOP, USER, { reason: 'Review', status: 'PENDING' });
    expect(refund.status).toBe('PENDING');
    expect(mockPrisma.product.update).not.toHaveBeenCalled();
  });

  it('requires a reason', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(completedSale);
    await expect(saleService.refundSale('s1', SHOP, USER, {})).rejects.toMatchObject({ status: 422 });
  });

  it('throws 404 when the sale is not completed', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(null);
    await expect(saleService.refundSale('x', SHOP, USER, { reason: 'x' })).rejects.toMatchObject({ status: 404 });
  });
});

describe('saleService.voidSale', () => {
  it('voids a sale and reverses stock', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(completedSale);
    mockRefundEffects();
    const res = await saleService.voidSale('s1', SHOP, USER, { reason: 'Mistake' });
    expect(res).toBeTruthy();
    expect(mockPrisma.stockAdjustment.create).toHaveBeenCalled();
  });

  it('throws 404 for a missing completed sale', async () => {
    mockPrisma.sale.findFirst.mockResolvedValue(null);
    await expect(saleService.voidSale('x', SHOP, USER, {})).rejects.toMatchObject({ status: 404 });
  });
});

describe('saleService.setRefundStatus', () => {
  it('rejects a refund that is not pending', async () => {
    mockPrisma.refund.findFirst.mockResolvedValue({ id: 'r1', status: 'COMPLETED', sale: { items: [] } });
    await expect(saleService.setRefundStatus('r1', SHOP, USER, 'APPROVED')).rejects.toMatchObject({ status: 422 });
  });

  it('rejects a pending refund', async () => {
    mockPrisma.refund.findFirst.mockResolvedValue({
      id: 'r1', status: 'PENDING', items: [], notes: null, saleId: 's1', refundNumber: 'RFD',
      sale: { items: [{ productId: 'p1', quantity: 2 }], status: 'COMPLETED', paymentDetails: [], customerId: null },
    });
    mockPrisma.refund.update.mockResolvedValue({ id: 'r1', status: 'REJECTED' });
    mockPrisma.auditLog.create.mockResolvedValue({});
    expect((await saleService.setRefundStatus('r1', SHOP, USER, 'REJECTED')).status).toBe('REJECTED');
  });
});
