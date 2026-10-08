/**
 * Shared deep mock of the Prisma client for unit/integration tests.
 *
 * Usage in a test file:
 *   jest.mock('../../src/config/database', () => ({
 *     __esModule: true,
 *     default: require('../helpers/mockPrisma').default,
 *   }));
 *   import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';
 */

export type MockModel = {
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  createMany: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  aggregate: jest.Mock;
  groupBy: jest.Mock;
  fields: Record<string, string>;
};

export type MockPrisma = Record<string, MockModel> & {
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
};

const MODEL_NAMES = [
  'user', 'agent', 'refreshToken', 'otp', 'shop', 'shopSettings', 'employee',
  'category', 'product', 'stockAdjustment', 'customer', 'sale', 'saleItem',
  'refund', 'expense', 'loan', 'loanRepayment', 'creditPayment', 'syncMetadata',
  'notification', 'activityLog', 'subscription', 'subscriptionPayment',
  'subscriptionPlan', 'systemSetting', 'supportTicket', 'supportMessage',
  'shift', 'ownerCapitalTransaction', 'recurringExpense', 'deviceSession',
  'productUnitConfig', 'productImage', 'supplier', 'purchase', 'stockMovement',
  'cashTransaction', 'creditLedgerEntry', 'auditLog', 'smsLog',
];

function createModel(): MockModel {
  return {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: { _all: 0 } }),
    groupBy: jest.fn().mockResolvedValue([]),
    fields: { reorderLevel: 'reorderLevel' },
  };
}

const mockPrisma = {} as MockPrisma;
for (const name of MODEL_NAMES) {
  mockPrisma[name] = createModel();
}

mockPrisma.$transaction = jest.fn(async (arg: unknown) => {
  if (typeof arg === 'function') {
    return await (arg as (tx: MockPrisma) => Promise<unknown>)(mockPrisma);
  }
  return await Promise.all(arg as Promise<unknown>[]);
});
mockPrisma.$connect = jest.fn().mockResolvedValue(undefined);
mockPrisma.$disconnect = jest.fn().mockResolvedValue(undefined);

/** Clear call history and restore default return values between tests. */
export function resetMockPrisma(): void {
  for (const name of MODEL_NAMES) {
    const model = mockPrisma[name];
    for (const value of Object.values(model)) {
      if (typeof value === 'function' && typeof (value as jest.Mock).mockClear === 'function') {
        (value as jest.Mock).mockClear();
      }
    }
    model.findMany.mockResolvedValue([]);
    model.count.mockResolvedValue(0);
    model.groupBy.mockResolvedValue([]);
    model.aggregate.mockResolvedValue({ _sum: {}, _count: { _all: 0 } });
    model.createMany.mockResolvedValue({ count: 0 });
    model.updateMany.mockResolvedValue({ count: 0 });
    model.deleteMany.mockResolvedValue({ count: 0 });
  }
  mockPrisma.$transaction.mockClear();
}

export default mockPrisma;
