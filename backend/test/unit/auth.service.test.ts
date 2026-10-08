jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: require('../helpers/mockPrisma').default,
}));

import { authService } from '../../src/services/auth.service';
import { hashPin, hashPassword } from '../../src/utils/bcrypt.util';
import mockPrisma, { resetMockPrisma } from '../helpers/mockPrisma';

const PHONE = '255700000000';

beforeEach(() => resetMockPrisma());

describe('AuthService.login', () => {
  it('issues tokens for valid credentials and resets failed attempts', async () => {
    const pinHash = await hashPin('1234');
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', phone: PHONE, role: 'BUSINESS_OWNER', name: 'John', email: null,
      isActive: true, isPinSet: true, pinHash, failedLoginAttempts: 0, blockedUntil: null, avatarUrl: null,
    });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: 'shop1', name: 'Shop' });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const result = await authService.login(PHONE, '1234');
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.role).toBe('BUSINESS_OWNER');
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 0 }) })
    );
  });

  it('increments failed attempts on a wrong PIN', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', phone: PHONE, role: 'BUSINESS_OWNER', isActive: true, isPinSet: true,
      pinHash: await hashPin('1234'), failedLoginAttempts: 0, blockedUntil: null,
    });
    mockPrisma.user.update.mockResolvedValue({});

    await expect(authService.login(PHONE, '9999')).rejects.toMatchObject({ status: 401 });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ failedLoginAttempts: 1 }) })
    );
  });

  it('rejects a locked account with 429', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1', role: 'BUSINESS_OWNER', isActive: true, pinHash: await hashPin('1234'),
      blockedUntil: new Date(Date.now() + 60_000),
    });
    await expect(authService.login(PHONE, '1234')).rejects.toMatchObject({ status: 429 });
  });

  it('rejects a disabled account with 403', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BUSINESS_OWNER', isActive: false });
    await expect(authService.login(PHONE, '1234')).rejects.toMatchObject({ status: 403 });
  });

  it('rejects unknown phone', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.login(PHONE, '1234')).rejects.toMatchObject({ status: 401 });
  });
});

describe('AuthService.adminLogin', () => {
  it('authenticates with a valid password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'a1', username: 'admin', role: 'SYSTEM_OWNER', name: 'Admin', email: null,
      isActive: true, deletedAt: null, passwordHash: await hashPassword('admin123'),
    });
    mockPrisma.refreshToken.create.mockResolvedValue({});
    const result = await authService.adminLogin('admin', 'admin123');
    expect(result.accessToken).toBeTruthy();
    expect(result.user.role).toBe('SYSTEM_OWNER');
  });

  it('rejects an invalid password', async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: 'a1', role: 'SYSTEM_OWNER', isActive: true, passwordHash: await hashPassword('admin123'),
    });
    await expect(authService.adminLogin('admin', 'nope')).rejects.toMatchObject({ status: 401 });
  });
});

describe('AuthService.employeeLogin', () => {
  it('issues a full session for an active employee with a set PIN', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'e1', phone: PHONE, role: 'EMPLOYEE', isActive: true, isPinSet: true, pinHash: await hashPin('1234'),
    });
    mockPrisma.employee.findFirst.mockResolvedValue({
      userId: 'e1', shopId: 'shop1', isActive: true, permissions: ['pos:write'], shop: { id: 'shop1', name: 'Shop' },
    });
    mockPrisma.refreshToken.create.mockResolvedValue({});

    const result = await authService.employeeLogin(PHONE, '1234');
    expect(result.accessToken).toBeTruthy();
    expect(result.permissions).toEqual(['pos:write']);
    expect(result.shop?.id).toBe('shop1');
  });

  it('returns a temporary token when only a temp PIN is set', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'e1', phone: PHONE, role: 'EMPLOYEE', isActive: true, isPinSet: false, pinHash: null,
    });
    mockPrisma.employee.findFirst
      .mockResolvedValueOnce({
        userId: 'e1', shopId: 'shop1', isActive: true, permissions: [], shop: { id: 'shop1', name: 'Shop' },
      })
      .mockResolvedValueOnce({ userId: 'e1', tempPinHash: await hashPin('9999') });

    const result = await authService.employeeLogin(PHONE, '9999');
    expect(result.tempToken).toBeTruthy();
    expect(result.requirePinChange).toBe(true);
  });

  it('rejects an employee with no active assignment', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'e1', role: 'EMPLOYEE', isActive: true, isPinSet: true });
    mockPrisma.employee.findFirst.mockResolvedValue(null);
    await expect(authService.employeeLogin(PHONE, '1234')).rejects.toMatchObject({ status: 403 });
  });
});

describe('AuthService OTP', () => {
  it('rejects OTP requests for unknown accounts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.requestOtp(PHONE)).rejects.toMatchObject({ status: 404 });
  });

  it('rejects OTP requests for admin roles', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'a1', role: 'AGENT', phone: PHONE });
    await expect(authService.requestOtp(PHONE)).rejects.toMatchObject({ status: 400 });
  });

  it('issues and persists an OTP for a valid business owner', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'BUSINESS_OWNER', phone: PHONE });
    mockPrisma.otp.findFirst.mockResolvedValue(null);
    mockPrisma.otp.create.mockResolvedValue({ id: 'otp1' });
    mockPrisma.smsLog.create.mockResolvedValue({});
    const result = await authService.requestOtp(PHONE);
    expect(result.resendAfter).toBe(60);
    expect(mockPrisma.otp.create).toHaveBeenCalled();
  });

  it('rejects an invalid OTP code', async () => {
    mockPrisma.otp.findFirst.mockResolvedValue(null);
    await expect(authService.verifyOtp(PHONE, '000000')).rejects.toMatchObject({ status: 400 });
  });

  it('increments attempts on a wrong OTP and accepts the correct one', async () => {
    mockPrisma.otp.findFirst.mockResolvedValue({ id: 'otp1', code: '123456', attempts: 0 });
    mockPrisma.otp.update.mockResolvedValue({});
    await expect(authService.verifyOtp(PHONE, '000000')).rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.otp.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { attempts: { increment: 1 } } })
    );
  });

  it('accepts a correct OTP and issues tokens', async () => {
    mockPrisma.otp.findFirst.mockResolvedValue({ id: 'otp1', code: '123456', attempts: 0 });
    mockPrisma.otp.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', phone: PHONE, role: 'BUSINESS_OWNER', name: 'John', isPinSet: true });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: 'shop1', name: 'Shop' });
    mockPrisma.refreshToken.create.mockResolvedValue({});
    const res = await authService.verifyOtp(PHONE, '123456');
    expect(res.accessToken).toBeTruthy();
    expect(res.user.role).toBe('BUSINESS_OWNER');
  });
});

describe('AuthService.setPin', () => {
  it('sets a PIN and returns a session', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', phone: PHONE, role: 'BUSINESS_OWNER', name: 'John', email: null, avatarUrl: null });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: 'shop1', name: 'Shop' });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.employee.updateMany.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});
    const res = await authService.setPin('u1', '1234');
    expect(res.accessToken).toBeTruthy();
  });

  it('rejects an unknown user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.setPin('x', '1234')).rejects.toMatchObject({ status: 404 });
  });
});

describe('AuthService.refreshAccessToken', () => {
  it('rotates tokens', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'r1', isRevoked: false, expiresAt: new Date(Date.now() + 100000), user: { id: 'u1', role: 'BUSINESS_OWNER' },
    });
    mockPrisma.shop.findFirst.mockResolvedValue({ id: 'shop1' });
    mockPrisma.refreshToken.update.mockResolvedValue({});
    mockPrisma.refreshToken.create.mockResolvedValue({});
    const res = await authService.refreshAccessToken('tok');
    expect(res.accessToken).toBeTruthy();
  });

  it('rejects a revoked refresh token', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'r1', isRevoked: true, expiresAt: new Date(Date.now() + 100000), user: { id: 'u1' },
    });
    await expect(authService.refreshAccessToken('tok')).rejects.toMatchObject({ status: 401 });
  });
});

describe('AuthService.logout & PIN reset', () => {
  it('revokes the refresh token on logout', async () => {
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    const res = await authService.logout('u1', 'tok');
    expect(res.message).toMatch(/Logged out/);
  });

  it('sends a PIN reset OTP', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', phone: PHONE });
    mockPrisma.otp.create.mockResolvedValue({});
    const res = await authService.requestPinReset(PHONE);
    expect(res.resendAfter).toBe(60);
  });

  it('rejects a reset for an unknown user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(authService.requestPinReset(PHONE)).rejects.toMatchObject({ status: 404 });
  });
});

describe('AuthService.changeEmployeePin', () => {
  it('changes the PIN when the current PIN is valid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', pinHash: await hashPin('1234') });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.employee.updateMany.mockResolvedValue({});
    const res = await authService.changeEmployeePin('u1', '1234', '5678');
    expect(res.message).toMatch(/PIN changed/);
  });

  it('rejects an incorrect current PIN', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', pinHash: await hashPin('1234') });
    await expect(authService.changeEmployeePin('u1', '0000', '5678')).rejects.toMatchObject({ status: 401 });
  });
});
