jest.mock('../src/utils/otp.util', () => ({
  generateTempPin: () => '123456',
  generateOtp: () => '123456',
  generateUniqueId: () => 'test-id',
  generateReceiptNumber: () => 'INV-TEST',
}));

import { FULL_OPERATIONAL_PERMISSIONS } from '../src/services/employee.service';
import { ALL_PERMISSIONS, OWNER_ONLY_PERMISSIONS } from '../src/config/permissions';

describe('Permission model', () => {
  it('defines loans and cash permissions', () => {
    expect(ALL_PERMISSIONS).toEqual(
      expect.arrayContaining(['loans:read', 'loans:write', 'cash:read', 'cash:write'])
    );
  });

  it('treats loans and cash as owner-only by default', () => {
    expect(OWNER_ONLY_PERMISSIONS).toEqual([
      'loans:read',
      'loans:write',
      'cash:read',
      'cash:write',
    ]);
  });

  it('does NOT grant owner-only financial permissions to employees by default', () => {
    for (const permission of OWNER_ONLY_PERMISSIONS) {
      expect(FULL_OPERATIONAL_PERMISSIONS).not.toContain(permission);
    }
  });
});
