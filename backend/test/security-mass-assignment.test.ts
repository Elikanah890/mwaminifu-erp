jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: require('./helpers/mockPrisma').default,
}));

import { expenseService } from '../src/services/expense.service';
import { customerService } from '../src/services/customer.service';
import { loanService } from '../src/services/loan.service';
import { supplierService } from '../src/services/supplier.service';
import mockPrisma, { resetMockPrisma } from './helpers/mockPrisma';

beforeEach(() => resetMockPrisma());

describe('Mass-assignment protection', () => {
  it('ignores privileged fields when updating an expense', async () => {
    mockPrisma.expense.findUnique.mockResolvedValue({ id: 'e1', approvalStatus: 'PENDING' });
    mockPrisma.expense.update.mockResolvedValue({ id: 'e1' });

    await expenseService.updateExpense('e1', {
      amount: 10,
      approvalStatus: 'APPROVED',
      shopId: 'other_shop',
      deletedAt: new Date(),
    } as unknown as Parameters<typeof expenseService.updateExpense>[1]);

    const call = mockPrisma.expense.update.mock.calls[0][0];
    expect(call.data).toEqual({ amount: 10 });
  });

  it('ignores balances and shop ownership when updating a customer', async () => {
    mockPrisma.customer.update.mockResolvedValue({ id: 'c1' });

    await customerService.updateCustomer('c1', {
      name: 'Renamed',
      outstandingBalance: 999999,
      shopId: 'other_shop',
      deletedAt: new Date(),
    } as unknown as Parameters<typeof customerService.updateCustomer>[1]);

    const call = mockPrisma.customer.update.mock.calls[0][0];
    expect(call.data).toEqual({ name: 'Renamed' });
  });

  it('ignores status/balance fields when updating a loan', async () => {
    mockPrisma.loan.update.mockResolvedValue({ id: 'l1' });

    await loanService.updateLoan('l1', {
      lender: 'Bank',
      status: 'PAID',
      remainingBalance: 0,
      shopId: 'other_shop',
    } as unknown as Parameters<typeof loanService.updateLoan>[1]);

    const call = mockPrisma.loan.update.mock.calls[0][0];
    expect(call.data).toEqual({ lender: 'Bank' });
  });

  it('ignores soft-delete and shop fields when updating a supplier', async () => {
    mockPrisma.supplier.update.mockResolvedValue({ id: 's1' });

    await supplierService.updateSupplier('s1', {
      name: 'Supplier',
      shopId: 'other_shop',
      deletedAt: new Date(),
    } as unknown as Parameters<typeof supplierService.updateSupplier>[1]);

    const call = mockPrisma.supplier.update.mock.calls[0][0];
    expect(call.data).toEqual({ name: 'Supplier' });
  });
});
