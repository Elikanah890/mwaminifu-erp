import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {
  async requestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      const result = await authService.requestOtp(phone);
      res.json({ success: true, data: result, message: 'OTP sent', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, otp } = req.body;
      const result = await authService.verifyOtp(phone, otp);
      res.json({ success: true, data: result, message: 'OTP verified', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async setPin(req: Request, res: Response, next: NextFunction) {
    try {
      const { pin } = req.body;
      const userId = req.user!.userId;
      const result = await authService.setPin(userId, pin);
      res.json({ success: true, data: result, message: 'PIN set successfully', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, pin } = req.body;
      const result = await authService.login(phone, pin);
      res.json({ success: true, data: result, message: 'Login successful', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async employeeLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, pin } = req.body;
      const result = await authService.employeeLogin(phone, pin);
      res.json({ success: true, data: result, message: 'Login successful', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async changeEmployeePin(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPin, pin } = req.body;
      const userId = req.user!.userId;
      const result = await authService.changeEmployeePin(userId, currentPin, pin);
      res.json({ success: true, data: result, message: 'PIN changed', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshAccessToken(refreshToken);
      res.json({ success: true, data: result, message: 'Token refreshed', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const userId = req.user!.userId;
      const result = await authService.logout(userId, refreshToken);
      res.json({ success: true, data: result, message: 'Logged out', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async resetPin(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      const result = await authService.requestPinReset(phone);
      res.json({ success: true, data: result, message: 'PIN reset OTP sent', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async adminLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;
      const result = await authService.adminLogin(username, password);
      res.json({ success: true, data: result, message: 'Login successful', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const prisma = (await import('../config/database')).default;
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true, phone: true, email: true, name: true, role: true,
          avatarUrl: true, isActive: true, createdAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' }, timestamp: new Date().toISOString() });
        return;
      }

      // Include the employee's permission set and the active shop so the mobile
      // client can rehydrate its client-side gating after an app restart without
      // another round trip.
      let permissions: string[] = [];
      let shop: { id: string; name: string } | null = null;

      if (user.role === 'EMPLOYEE') {
        const employee = await prisma.employee.findFirst({
          where: { userId: user.id, isActive: true },
          include: { shop: { select: { id: true, name: true } } },
        });
        if (employee) {
          permissions = (employee.permissions as string[]) || [];
          shop = { id: employee.shopId, name: employee.shop.name };
        }
      } else {
        const owned = await prisma.shop.findFirst({
          where: { ownerId: user.id, isArchived: false },
          select: { id: true, name: true },
        });
        shop = owned;
      }

      res.json({ success: true, data: { user, permissions, shop }, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  // Fresh permission set (always read from the DB, never from the JWT).
  async permissions(req: Request, res: Response, next: NextFunction) {
    try {
      const prisma = (await import('../config/database')).default;
      const { ALL_PERMISSIONS, expandPermissions } = await import('../config/permissions');
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { role: true } });
      if (user?.role === 'EMPLOYEE') {
        const employee = await prisma.employee.findFirst({
          where: { userId: req.user!.userId, isActive: true },
          select: { permissions: true, shopId: true },
        });
        // Expand legacy strings so the client's canonical `can()` checks match
        // exactly what the backend `requirePermission` enforces.
        const effective = Array.from(expandPermissions((employee?.permissions as string[]) || []));
        res.json({
          success: true,
          data: { role: user.role, permissions: effective, shopId: employee?.shopId ?? null },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      res.json({
        success: true,
        data: { role: user?.role, permissions: ALL_PERMISSIONS, shopId: req.user!.shopId ?? null },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const prisma = (await import('../config/database')).default;
      const { name, email } = req.body;
      const user = await prisma.user.update({
        where: { id: req.user!.userId },
        data: { name, email },
        select: { id: true, phone: true, email: true, name: true, role: true, avatarUrl: true },
      });
      res.json({ success: true, data: { user }, message: 'Profile updated', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
