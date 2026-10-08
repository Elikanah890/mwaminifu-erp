import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { verifyToken, JwtPayload } from '../utils/jwt.util';

// Public paths that remain reachable during maintenance mode.
const PUBLIC_PATHS = new Set([
  '/api/v1/config',
  '/api/v1/auth/admin/login',
  '/health',
]);

export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (PUBLIC_PATHS.has(req.path) || PUBLIC_PATHS.has(req.originalUrl)) {
      next();
      return;
    }

    const maintenanceMode = await settingsService.get('maintenanceMode');
    if (!maintenanceMode) {
      next();
      return;
    }

    let role: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = verifyToken(authHeader.split(' ')[1]) as JwtPayload;
        role = decoded.role;
      } catch {
        role = undefined;
      }
    }

    if (role === 'SYSTEM_OWNER' || role === 'AGENT') {
      next();
      return;
    }

    res.status(503).json({
      success: false,
      error: {
        code: 'MAINTENANCE',
        message: 'System is under maintenance. Please try again later.',
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    next();
  }
}