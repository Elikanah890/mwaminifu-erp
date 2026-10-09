import prisma from '../config/database';
import { env, isTestingMode } from '../config/env';
import { hashPin, hashPassword, comparePin, comparePassword } from '../utils/bcrypt.util';
import { signAccessToken, signRefreshToken, signTempToken } from '../utils/jwt.util';
import { generateOtp } from '../utils/otp.util';
import { normalizePhone, phoneVariants } from '../utils/phone.util';
import { settingsService } from './settings.service';
import logger from '../utils/logger.util';
import { SmsService } from './sms.service';

const smsService = new SmsService();

// Refresh token DB TTL (60 days) - keep in sync with JWT_REFRESH_EXPIRY in .env
const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

/** Look up a user tolerating any common phone format (0754..., 255754..., +255...). */
async function findUserByPhone(phone: string) {
  return prisma.user.findFirst({ where: { phone: { in: phoneVariants(phone) } } });
}

async function otpSms(phone: string, code: string, purpose: string, minutes: number): Promise<void> {
  const appName = await settingsService.get('appName');
  const body =
    purpose === 'LOGIN'
      ? `${appName}: Your OTP is ${code}. Valid for ${minutes} minutes. Do not share.`
      : `${appName}: Your PIN reset OTP is ${code}. Valid for ${minutes} minutes.`;
  await smsService.send(phone, body, {
    purpose: purpose === 'LOGIN' ? 'LOGIN_OTP' : 'PIN_RESET_OTP',
  });
}

export class AuthService {
  async requestOtp(phone: string) {
    const canonical = normalizePhone(phone);
    const user = await findUserByPhone(phone);
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Phone number not registered. Contact your agent.' };
    }

    if (user.role === 'SYSTEM_OWNER' || user.role === 'AGENT') {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'This phone is not registered as a business owner or employee.' };
    }

    const recentOtp = await prisma.otp.findFirst({
      where: { phone: canonical, purpose: 'LOGIN', createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
    });
    // In mock/demo mode (no real SMS gateway) always issue a fresh OTP so
    // repeated test sign-ins work without waiting out the resend window.
    if (recentOtp && !env.MOCK_SMS) {
      return { resendAfter: 60 };
    }

    // Retire any previous unused login codes so only the newest one is valid.
    await prisma.otp.updateMany({
      where: { phone: canonical, purpose: 'LOGIN', isUsed: false },
      data: { isUsed: true },
    });

    const code = generateOtp();
    const minutes = await settingsService.get('otpLifetimeMinutes');
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    await prisma.otp.create({
      data: { phone: canonical, code, purpose: 'LOGIN', expiresAt, userId: user.id },
    });

    await otpSms(canonical, code, 'LOGIN', minutes);

    logger.info(`OTP sent to ${canonical}`);
    // In mock mode surface the code so testers/devs can proceed without SMS.
    return { message: 'OTP sent', resendAfter: 60, ...(env.MOCK_SMS ? { devOtp: code } : {}) };
  }

  async verifyOtp(phone: string, code: string, purpose: 'LOGIN' | 'PIN_RESET' = 'LOGIN') {
    const canonical = normalizePhone(phone);
    const user = await findUserByPhone(phone);
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Phone number not registered' };
    }

    // In mock/testing mode the fixed code always works, so an OTP request that
    // was rate-limited or an already-consumed code never blocks a login.
    const mockBypass = env.MOCK_SMS && code === generateOtp();
    if (!mockBypass) {
      // A first-time owner logs in with the OWNER_ACTIVATION code sent at
      // registration (Spec 4.7); accept that alongside the normal LOGIN code.
      const purposes = purpose === 'LOGIN' ? ['LOGIN', 'OWNER_ACTIVATION'] : [purpose];
      const otp = await prisma.otp.findFirst({
        where: { phone: canonical, purpose: { in: purposes }, isUsed: false, expiresAt: { gte: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      if (!otp) {
        const anyOtp = await prisma.otp.findFirst({
          where: { phone: canonical, purpose: { in: purposes } },
          orderBy: { createdAt: 'desc' },
        });
        if (anyOtp) {
          throw { status: 400, code: 'OTP_EXPIRED', message: 'OTP expired. Request a new one.' };
        }
        throw { status: 400, code: 'INVALID_OTP', message: 'Invalid or expired OTP' };
      }

      if (otp.attempts >= 5) {
        throw { status: 429, code: 'RATE_LIMITED', message: 'Too many OTP attempts. Request a new code.' };
      }

      if (otp.code !== code) {
        await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
        throw { status: 400, code: 'INVALID_OTP', message: 'Invalid OTP' };
      }
    }

    // Consume the code (mark any unused codes for this phone as used).
    await prisma.otp.updateMany({
      where: { phone: canonical, isUsed: false },
      data: { isUsed: true },
    });

    // Spec 4.7 — a successful OTP proves phone ownership and activates the
    // account (records the activation timestamp).
    if (!user.isPhoneVerified || !user.activationOtpVerifiedAt) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true, activationOtpVerifiedAt: new Date() },
      });
    }

    const tempToken = signTempToken({
      sub: user.id,
      role: user.role,
    });

    // Establish a full session for web admin OTP sign-in (business owners).
    // The mobile client continues to use `tempToken` for first-time PIN setup;
    // the extra fields below are safely ignored by older clients.
    const shops = await prisma.shop.findFirst({
      where: { ownerId: user.id, isArchived: false },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      shopId: shops?.id,
    });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      tempToken,
      expiresIn: 600,
      isPinSet: user.isPinSet,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
      shop: shops ? { id: shops.id, name: shops.name } : null,
    };
  }

  async setPin(userId: string, pin: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'User not found' };
    }

    const pinHash = await hashPin(pin);

    const shops = await prisma.shop.findFirst({
      where: { ownerId: userId, isArchived: false },
    });

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      shopId: shops?.id,
    });

    const refreshToken = signRefreshToken({
      sub: user.id,
      role: user.role,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { pinHash, isPinSet: true, isPhoneVerified: true },
    });

    // Clear any temporary PIN if this is an employee's first-time PIN setup
    await prisma.employee.updateMany({
      where: { userId },
      data: { tempPinHash: null },
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      shop: shops ? { id: shops.id, name: shops.name } : null,
    };
  }

  async login(phone: string, pin: string) {
    const user = await findUserByPhone(phone);
    if (!user) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' };
    }

    if (!user.isActive) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Account is disabled' };
    }

    // Spec 4.7 — a business owner must complete OTP activation before signing in.
    if (user.role === 'BUSINESS_OWNER' && user.isPhoneVerified === false) {
      throw {
        status: 403,
        code: 'ACTIVATION_REQUIRED',
        message: 'Activate your account with the OTP sent to your phone before signing in.',
      };
    }

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      throw {
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Account locked. Try again later.',
      };
    }

    if (!user.pinHash) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'PIN not set. Use OTP to set PIN.' };
    }

    const isValid = await comparePin(pin, user.pinHash);
    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const blockedUntil = attempts >= 5 ? new Date(Date.now() + 60 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: attempts, blockedUntil },
      });

      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid PIN' };
    }

    const shops = await prisma.shop.findFirst({
      where: { ownerId: user.id, isArchived: false },
    });

    let permissions: string[] = [];
    if (user.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id, isActive: true },
      });
      if (employee) {
        permissions = (employee.permissions as string[]) || [];
      }
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      shopId: shops?.id,
      permissions,
    });

    const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, blockedUntil: null, lastLoginAt: new Date() },
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      shop: shops ? { id: shops.id, name: shops.name } : null,
    };
  }

  async employeeLogin(phone: string, pin: string) {
    const user = await findUserByPhone(phone);
    if (!user || user.role !== 'EMPLOYEE') {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Phone or PIN is incorrect' };
    }

    if (!user.isActive) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Employee account is disabled' };
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, isActive: true },
      include: { shop: true },
    });

    if (!employee) {
      throw { status: 403, code: 'FORBIDDEN', message: 'No active assignment found' };
    }

    if (!user.pinHash && !user.isPinSet) {
      // First login with temp PIN
      const empWithTemp = await prisma.employee.findFirst({
        where: { userId: user.id, tempPinHash: { not: null } },
      });

      if (!empWithTemp) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'No temporary PIN found. Contact your employer.' };
      }

      const isValid = await comparePin(pin, empWithTemp.tempPinHash!);
      if (!isValid) {
        throw { status: 401, code: 'UNAUTHORIZED', message: 'Phone or PIN is incorrect' };
      }

      const tempToken = signTempToken({
        sub: user.id,
        role: user.role,
        shopId: employee.shopId,
        permissions: (employee.permissions as string[]) || [],
      });

      return {
        tempToken,
        expiresIn: 600,
        requirePinChange: true,
        user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      };
    }

    if (!user.pinHash) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'PIN not set' };
    }

    const isValid = await comparePin(pin, user.pinHash);
    if (!isValid) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Phone or PIN is incorrect' };
    }

    const permissions = (employee.permissions as string[]) || [];
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      shopId: employee.shopId,
      permissions,
    });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
      shop: { id: employee.shopId, name: employee.shop.name },
      permissions,
    };
  }

  async changeEmployeePin(userId: string, currentPin: string, newPin: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'User not found' };
    }

    // Support two paths:
    // 1. Already-onboarded employee changing their existing PIN.
    // 2. First-login employee with only a temporary PIN (no permanent pinHash yet).
    if (user.pinHash) {
      const isValid = await comparePin(currentPin, user.pinHash);
      if (!isValid) {
        throw { status: 401, code: 'UNAUTHORIZED', message: 'Current PIN is incorrect' };
      }
    } else {
      const empWithTemp = await prisma.employee.findFirst({
        where: { userId, tempPinHash: { not: null } },
      });
      if (!empWithTemp) {
        throw { status: 400, code: 'VALIDATION_ERROR', message: 'PIN not set yet' };
      }
      const isValid = await comparePin(currentPin, empWithTemp.tempPinHash!);
      if (!isValid) {
        throw { status: 401, code: 'UNAUTHORIZED', message: 'Current PIN is incorrect' };
      }
    }

    const pinHash = await hashPin(newPin);
    await prisma.user.update({
      where: { id: userId },
      data: { pinHash, isPinSet: true },
    });

    await prisma.employee.updateMany({
      where: { userId },
      data: { tempPinHash: null },
    });

    // Invalidate every existing session after a PIN change.
    await prisma.refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } });

    return { message: 'PIN changed successfully' };
  }

  /**
   * Change the password of a username/password account (System Owner or Agent).
   * Keeps the linked Agent record in sync.
   */
  async changeAdminPassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Account not found' };
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Current password is incorrect' };
    }
    if (!newPassword || newPassword.length < 6) {
      throw { status: 422, code: 'VALIDATION_ERROR', message: 'New password must be at least 6 characters' };
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } });

    if (user.role === 'AGENT' && user.agentId) {
      await prisma.agent.updateMany({ where: { id: user.agentId }, data: { passwordHash: hashed } });
    }

    // Invalidate every existing session after a credential change.
    await prisma.refreshToken.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } });

    return { message: 'Password changed successfully' };
  }

  async refreshAccessToken(refreshToken: string) {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      throw { status: 401, code: 'TOKEN_EXPIRED', message: 'Invalid or expired refresh token' };
    }

    const user = storedToken.user;

    // Re-validate the account on every refresh so disabled/deleted users and
    // role changes take effect immediately (P0-8).
    if (user.isActive === false || user.deletedAt) {
      await prisma.refreshToken.update({ where: { id: storedToken.id }, data: { isRevoked: true } });
      throw { status: 401, code: 'FORBIDDEN', message: 'Account is disabled or deleted' };
    }

    const shops = await prisma.shop.findFirst({
      where: { ownerId: user.id, isArchived: false },
    });

    let permissions: string[] = [];
    if (user.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id, isActive: true },
      });
      if (employee) {
        permissions = (employee.permissions as string[]) || [];
      }
    }

    const newAccessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      shopId: shops?.id,
      permissions,
    });
    const newRefreshToken = signRefreshToken({ sub: user.id, role: user.role });

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: { userId, token: refreshToken },
      data: { isRevoked: true },
    });
    return { message: 'Logged out successfully' };
  }

  async requestPinReset(phone: string) {
    const canonical = normalizePhone(phone);
    const user = await findUserByPhone(phone);
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Phone number not registered' };
    }

    const code = generateOtp();
    const minutes = await settingsService.get('otpLifetimeMinutes');
    await prisma.otp.create({
      data: {
        phone: canonical,
        code,
        purpose: 'PIN_RESET',
        expiresAt: new Date(Date.now() + minutes * 60 * 1000),
        userId: user.id,
      },
    });

    await otpSms(canonical, code, 'PIN_RESET', minutes);

    return { message: 'OTP sent', resendAfter: 60 };
  }

  async adminLogin(username: string, password: string) {
    const user = await prisma.user.findFirst({
      where: {
        username,
        role: { in: ['SYSTEM_OWNER', 'AGENT'] },
      },
    });

    if (!user || !user.passwordHash) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' };
    }

    if (!user.isActive || user.deletedAt) {
      throw { status: 403, code: 'FORBIDDEN', message: 'Account is disabled or deleted' };
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' };
    }

    // Spec 4.3 — the AGAC Owner account is limited to 2 concurrent sessions.
    // In testing mode we evict the oldest session instead of locking the owner out.
    const activeSessions = await prisma.refreshToken.findMany({
      where: { userId: user.id, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (user.role === 'SYSTEM_OWNER' && activeSessions.length >= 2) {
      if (isTestingMode) {
        await prisma.refreshToken.updateMany({
          where: { id: { in: activeSessions.slice(0, activeSessions.length - 1).map((t) => t.id) } },
          data: { isRevoked: true },
        });
      } else {
        throw {
          status: 409,
          code: 'SESSION_LIMIT',
          message: 'Maximum 2 active sessions. Log out on another device first.',
        };
      }
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = signRefreshToken({ sub: user.id, role: user.role });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

export const authService = new AuthService();
