import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.util';
import logger from '../utils/logger.util';
import prisma from '../config/database';

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token) as JwtPayload;

    // Re-validate the account on every request. Access tokens live for a long
    // time, so a token alone must never keep a disabled/deleted account (or a
    // revoked employee assignment) working.
    const account = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, role: true, isActive: true, deletedAt: true, isPhoneVerified: true },
    });

    if (!account || account.deletedAt || account.isActive === false) {
      res.status(401).json({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'This account is disabled. Contact support.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    let permissions = decoded.permissions;
    let shopId = decoded.shopId;
    const role = account.role;

    // Reload employee permissions/shop from DB so permission changes
    // take effect immediately (JWT permissions can be stale).
    if (role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: decoded.sub, isActive: true, deletedAt: null },
      });
      if (!employee) {
        res.status(403).json({
          success: false,
          error: { code: 'NO_ACTIVE_ASSIGNMENT', message: 'Your staff assignment is no longer active.' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      permissions = (employee.permissions as string[]) || [];
      shopId = employee.shopId;
    }

    // Restricted tokens issued before a mandatory password change may only be
    // used to change the password, log out, or read the current profile.
    if (decoded.mustChangePassword === true) {
      const path = req.originalUrl.split('?')[0];
      const allowed = new Set([
        '/api/v1/auth/change-password',
        '/api/v1/auth/logout',
        '/api/v1/users/me',
      ]);
      if (!allowed.has(path)) {
        res.status(403).json({
          success: false,
          error: { code: 'PASSWORD_CHANGE_REQUIRED', message: 'Change your password before continuing.' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    // Spec 4.7 — a business owner cannot use the app until their account has
    // been activated via the registration OTP.
    if (role === 'BUSINESS_OWNER' && account.isPhoneVerified === false) {
      res.status(403).json({
        success: false,
        error: { code: 'ACTIVATION_REQUIRED', message: 'Activate your account with the OTP sent by SMS.' },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    req.user = {
      userId: decoded.sub,
      role,
      shopId,
      permissions,
      sub: decoded.sub,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Invalid or expired token' },
      timestamp: new Date().toISOString(),
    });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token) as JwtPayload;
      req.user = {
        userId: decoded.sub,
        role: decoded.role,
        shopId: decoded.shopId,
        permissions: decoded.permissions,
        sub: decoded.sub,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    }
  } catch {
    // Token invalid or expired, continue without auth
  }
  next();
}
