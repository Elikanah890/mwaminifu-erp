import prisma from '../config/database';
import { env } from '../config/env';
import { hashPin, comparePin, comparePassword } from '../utils/bcrypt.util';
import { signAccessToken, signRefreshToken, signTempToken } from '../utils/jwt.util';
import { generateOtp } from '../utils/otp.util';
import { settingsService } from './settings.service';
import logger from '../utils/logger.util';
import { SmsService } from './sms.service';

const smsService = new SmsService();

// Refresh token DB TTL (60 days) - keep in sync with JWT_REFRESH_EXPIRY in .env
const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

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
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Account not found. Contact your agent.' };
    }

    if (user.role === 'SYSTEM_OWNER' || user.role === 'AGENT') {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'This phone is not registered as a business owner or employee.' };
    }

    const recentOtp = await prisma.otp.findFirst({
      where: { phone, purpose: 'LOGIN', createdAt: { gte: new Date(Date.now() - 60 * 1000) } },
    });
    // In mock/demo mode (no real SMS gateway) always issue a fresh OTP so
    // repeated test sign-ins work without waiting out the resend window.
    if (recentOtp && !env.MOCK_SMS) {
      return { resendAfter: 60 };
    }

    const code = generateOtp();
    const minutes = await settingsService.get('otpLifetimeMinutes');
    const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

    await prisma.otp.create({
      data: { phone, code, purpose: 'LOGIN', expiresAt, userId: user.id },
    });

    await otpSms(phone, code, 'LOGIN', minutes);

    logger.info(`OTP sent to ${phone}`);
    return { message: 'OTP sent', resendAfter: 60 };
  }

  async verifyOtp(phone: string, code: string, purpose: 'LOGIN' | 'PIN_RESET' = 'LOGIN') {
    // A first-time owner logs in with the OWNER_ACTIVATION code sent at
    // registration (Spec 4.7); accept that alongside the normal LOGIN code.
    const purposes = purpose === 'LOGIN' ? ['LOGIN', 'OWNER_ACTIVATION'] : [purpose];
    const otp = await prisma.otp.findFirst({
      where: { phone, purpose: { in: purposes }, isUsed: false, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    // Reject when there is no active OTP, or the attempt limit has been hit.
    if (!otp || otp.attempts >= 5) {
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid or expired OTP' };
    }

    // Count failed guesses against this OTP so a 6-digit code cannot be
    // brute-forced by repeated verify calls.
    if (otp.code !== code) {
      await prisma.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid or expired OTP' };
    }

    await prisma.otp.update({ where: { id: otp.id }, data: { isUsed: true } });

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'User not found' };
    }

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
    const user = await prisma.user.findUnique({ where: { phone } });
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
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || user.role !== 'EMPLOYEE') {
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid employee credentials' };
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
        throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid temporary PIN' };
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
      throw { status: 401, code: 'UNAUTHORIZED', message: 'Invalid PIN' };
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

    return { message: 'PIN changed successfully' };
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
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw { status: 404, code: 'NOT_FOUND', message: 'User not found' };
    }

    const code = generateOtp();
    const minutes = await settingsService.get('otpLifetimeMinutes');
    await prisma.otp.create({
      data: {
        phone,
        code,
        purpose: 'PIN_RESET',
        expiresAt: new Date(Date.now() + minutes * 60 * 1000),
        userId: user.id,
      },
    });

    await otpSms(phone, code, 'PIN_RESET', minutes);

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
    const activeSessions = await prisma.refreshToken.count({
      where: { userId: user.id, isRevoked: false, expiresAt: { gt: new Date() } },
    });
    if (user.role === 'SYSTEM_OWNER' && activeSessions >= 2) {
      throw {
        status: 409,
        code: 'SESSION_LIMIT',
        message: 'Maximum 2 active sessions. Log out on another device first.',
      };
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
