jest.mock('../src/utils/otp.util', () => ({
  generateTempPin: () => '123456',
}));

import { FULL_OPERATIONAL_PERMISSIONS } from '../src/services/employee.service';
import { ALL_PERMISSIONS } from '../src/config/permissions';

describe('Employee V1 default permissions', () => {
  it('grants the canonical full operational permission set', () => {
    expect(FULL_OPERATIONAL_PERMISSIONS).toEqual(
      expect.arrayContaining([
        'sales:create',
        'sales:view',
        'sales:refund',
        'products:view',
        'products:create',
        'inventory:view',
        'inventory:adjust',
        'customers:view',
        'credit:create',
        'credit:collect',
        'expenses:create',
        'reports:sales',
        'reports:inventory',
        'reports:credit',
        'shift:open',
        'shift:close',
      ])
    );
  });

  it('uses only canonical permissions (no legacy strings)', () => {
    const legacy = ['pos:write', 'pos:refund', 'pos:void', 'inventory:read', 'inventory:write', 'expenses:write', 'credit:write', 'reports:read'];
    for (const p of FULL_OPERATIONAL_PERMISSIONS) {
      expect(ALL_PERMISSIONS).toContain(p);
      expect(legacy).not.toContain(p);
    }
  });

  it('never includes the non-grantable General/Finance reports', () => {
    expect(FULL_OPERATIONAL_PERMISSIONS).not.toContain('reports:general');
    expect(FULL_OPERATIONAL_PERMISSIONS).not.toContain('reports:finance_overview');
  });
});
