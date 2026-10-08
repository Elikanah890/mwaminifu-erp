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

    let permissions = decoded.permissions;
    let shopId = decoded.shopId;

    // Reload employee permissions/shop from DB so permission changes
    // take effect immediately (JWT permissions can be stale).
    if (decoded.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findFirst({
        where: { userId: decoded.sub, isActive: true },
      });
      if (employee) {
        permissions = (employee.permissions as string[]) || [];
        shopId = employee.shopId;
      }
    }

    // Spec 4.7 — a business owner cannot use the app until their account has
    // been activated via the registration OTP.
    if (decoded.role === 'BUSINESS_OWNER') {
      const owner = await prisma.user.findUnique({
        where: { id: decoded.sub },
        select: { isPhoneVerified: true },
      });
      if (owner && owner.isPhoneVerified === false) {
        res.status(403).json({
          success: false,
          error: { code: 'ACTIVATION_REQUIRED', message: 'Activate your account with the OTP sent by SMS.' },
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    req.user = {
      userId: decoded.sub,
      role: decoded.role,
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
