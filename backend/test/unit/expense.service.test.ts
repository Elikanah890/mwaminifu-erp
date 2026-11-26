jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import { expenseService, DEFAULT_EXPENSE_CATEGORIES } from '../../src/services/expense.service';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';

const SHOP = 'shop1';
const USER = 'owner1';

beforeEach(() => {
  resetMockPrisma();
});

describe('expenseService.listExpenseCategories', () => {
  it('returns built-in categories plus the shop custom categories', async () => {
    mockPrisma.expenseCategory.findMany.mockResolvedValue([
      { id: 'ec1', shopId: SHOP, nameEn: 'Internet', nameSw: 'Intaneti', isArchived: false },
    ]);

    const categories = await expenseService.listExpenseCategories(SHOP);

    expect(categories).toHaveLength(DEFAULT_EXPENSE_CATEGORIES.length + 1);
    expect(categories[0]).toMatchObject({ value: 'Rent', nameSw: 'Kodi', isDefault: true });
    expect(categories[categories.length - 1]).toMatchObject({
      id: 'ec1',
      value: 'Internet',
      nameSw: 'Intaneti',
      isDefault: false,
    });
    expect(mockPrisma.expenseCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shopId: SHOP, isArchived: false } })
    );
  });
});

describe('expenseService.createExpenseCategory', () => {
  it('rejects a name that duplicates a built-in category (case-insensitive)', async () => {
    await expect(
      expenseService.createExpenseCategory(SHOP, USER, { nameEn: 'rent', nameSw: 'Kodi' })
    ).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_EXPENSE_CATEGORY' });
    expect(mockPrisma.expenseCategory.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate custom category for the same shop', async () => {
    mockPrisma.expenseCategory.findFirst.mockResolvedValue({ id: 'ec1' });

    await expect(
      expenseService.createExpenseCategory(SHOP, USER, { nameEn: 'Internet', nameSw: 'Intaneti' })
    ).rejects.toMatchObject({ status: 409, code: 'DUPLICATE_EXPENSE_CATEGORY' });
    expect(mockPrisma.expenseCategory.create).not.toHaveBeenCalled();
  });

  it('trims names and creates a tenant-scoped category', async () => {
    mockPrisma.expenseCategory.findFirst.mockResolvedValue(null);
    mockPrisma.expenseCategory.create.mockResolvedValue({
      id: 'ec2', shopId: SHOP, nameEn: 'Internet', nameSw: 'Intaneti', isArchived: false,
    });

    const category = await expenseService.createExpenseCategory(SHOP, USER, {
      nameEn: '  Internet  ',
      nameSw: '  Intaneti ',
    });

    expect(category).toMatchObject({ id: 'ec2', value: 'Internet', nameEn: 'Internet', nameSw: 'Intaneti', isDefault: false });
    expect(mockPrisma.expenseCategory.create).toHaveBeenCalledWith({
      data: { shopId: SHOP, nameEn: 'Internet', nameSw: 'Intaneti' },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });
});

describe('expenseService.setApprovalStatus', () => {
  it('approves a pending expense and posts the cash outflow', async () => {
    mockPrisma.expense.findUnique.mockResolvedValue({
      id: 'e1', shopId: SHOP, amount: 25000, category: 'Rent', description: 'Shop rent', approvalStatus: 'PENDING',
    });
    mockPrisma.expense.update.mockResolvedValue({ id: 'e1', approvalStatus: 'APPROVED' });

    const result = await expenseService.setApprovalStatus('e1', 'APPROVED', USER);

    expect(result).toMatchObject({ id: 'e1', approvalStatus: 'APPROVED' });
    expect(mockPrisma.cashTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'EXPENSE', amount: -25000, reference: 'e1' }) })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it('refuses to approve an already approved expense', async () => {
    mockPrisma.expense.findUnique.mockResolvedValue({ id: 'e1', shopId: SHOP, approvalStatus: 'APPROVED' });

    await expect(
      expenseService.setApprovalStatus('e1', 'APPROVED', USER)
    ).rejects.toMatchObject({ status: 422, code: 'BUSINESS_RULE_VIOLATION' });
    expect(mockPrisma.expense.update).not.toHaveBeenCalled();
  });
});
