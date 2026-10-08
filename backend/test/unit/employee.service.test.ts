jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import { employeeService, FULL_OPERATIONAL_PERMISSIONS } from '../../src/services/employee.service';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';

const SHOP = 'shop1';
const OWNER = 'owner1';

beforeEach(() => {
  resetMockPrisma();
  mockPrisma.shop.findFirst.mockResolvedValue({ id: SHOP, ownerId: OWNER, isArchived: false });
});

describe('employeeService', () => {
  it('lists employees for a shop', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([{ id: 'e1' }]);
    expect(await employeeService.listEmployees(SHOP, OWNER)).toHaveLength(1);
  });

  it('creates an employee with the default permission set', async () => {
    mockPrisma.employee.count.mockResolvedValue(0);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 'u1', phone: '255700000000' });
    mockPrisma.employee.findFirst.mockResolvedValue(null);
    mockPrisma.employee.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'e1', ...data }));
    mockPrisma.shop.findUnique.mockResolvedValue({ name: 'Shop' });

    const emp = await employeeService.addEmployee(SHOP, OWNER, { phone: '255700000000', name: 'New' });
    expect(emp.permissions).toEqual(FULL_OPERATIONAL_PERMISSIONS);
  });

  it('enforces the 5-employee limit', async () => {
    mockPrisma.employee.count.mockResolvedValue(5);
    await expect(employeeService.addEmployee(SHOP, OWNER, { phone: '2557', name: 'New' })).rejects.toMatchObject({ status: 422 });
  });

  it('rejects a duplicate assignment', async () => {
    mockPrisma.employee.count.mockResolvedValue(1);
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    mockPrisma.employee.findFirst.mockResolvedValue({ id: 'e1' });
    await expect(employeeService.addEmployee(SHOP, OWNER, { phone: '2557', name: 'New' })).rejects.toMatchObject({ status: 409 });
  });

  it('updates permissions', async () => {
    mockPrisma.employee.update.mockResolvedValue({ id: 'e1', permissions: ['cash:read'] });
    const res = await employeeService.updatePermissions('e1', ['cash:read']);
    expect(res.permissions).toEqual(['cash:read']);
  });

  it('toggles active state and syncs the user account', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: 'e1', userId: 'u1', isActive: true });
    mockPrisma.employee.update.mockResolvedValue({ id: 'e1', userId: 'u1', isActive: false });
    mockPrisma.user.update.mockResolvedValue({});
    const res = await employeeService.toggleEmployee('e1');
    expect(res.isActive).toBe(false);
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });

  it('resets the PIN and issues a temp PIN', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: 'e1', userId: 'u1', user: { phone: '255700000000' } });
    mockPrisma.employee.update.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});
    const res = await employeeService.resetPin('e1');
    expect(res.message).toMatch(/PIN reset/);
  });

  it('soft-deletes an employee', async () => {
    mockPrisma.employee.update.mockResolvedValue({ id: 'e1', isActive: false });
    const res = await employeeService.removeEmployee('e1');
    expect(res.isActive).toBe(false);
  });
});
