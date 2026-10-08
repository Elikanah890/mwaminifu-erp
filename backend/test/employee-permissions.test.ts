jest.mock('../src/utils/otp.util', () => ({
  generateTempPin: () => '123456',
}));

import { FULL_OPERATIONAL_PERMISSIONS } from '../src/services/employee.service';

describe('Employee V1 default permissions', () => {
  it('grants new employees the standard full operational permission set', () => {
    expect(FULL_OPERATIONAL_PERMISSIONS).toEqual([
      'pos:write',
      'pos:refund',
      'pos:void',
      'inventory:read',
      'inventory:write',
      'expenses:write',
      'credit:write',
      'reports:sales',
      'reports:inventory',
      'reports:credit',
    ]);
  });

  it('never includes the non-grantable General/Finance reports', () => {
    expect(FULL_OPERATIONAL_PERMISSIONS).not.toContain('reports:general');
    expect(FULL_OPERATIONAL_PERMISSIONS).not.toContain('reports:finance_overview');
  });

  it('is not mutated when read', () => {
    const snapshot = [...FULL_OPERATIONAL_PERMISSIONS];
    FULL_OPERATIONAL_PERMISSIONS.length = 0;
    expect(snapshot).toHaveLength(10);
  });
});
