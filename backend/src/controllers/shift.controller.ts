import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export class ShiftController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as { userId?: string } | undefined)?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const shifts = await prisma.shift.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 20,
      });

      res.json({ success: true, data: shifts, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async listByShop(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.params.shopId;
      const shifts = await prisma.shift.findMany({
        where: { shopId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { startedAt: 'desc' },
        take: 100,
      });
      res.json({ success: true, data: shifts, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async active(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req.user as { userId?: string } | undefined)?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const activeShift = await prisma.shift.findFirst({
        where: { userId, isActive: true },
        orderBy: { startedAt: 'desc' },
      });

      res.json({ success: true, data: activeShift, timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  async openShift(req: Request, res: Response, next: NextFunction) {
    try {
      const { openingCashBalance } = req.body || {};
      const user = req.user as { userId?: string; shopId?: string } | undefined;
      const userId = user?.userId;
      const shopId = user?.shopId;

      if (!shopId) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Shop context required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Check if user has an open shift today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingShift = await prisma.shift.findFirst({
        where: {
          userId,
          shopId,
          startedAt: { gte: today },
          closedAt: null,
        },
      });

      if (existingShift) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Shift already open' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const shift = await prisma.shift.create({
        data: {
          userId: userId!,
          shopId,
          openingCashBalance: openingCashBalance ? Number(openingCashBalance) : 0,
          startedAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: { shift },
        message: 'Shift opened successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      next(error);
    }
  }

  async closeShift(req: Request, res: Response, next: NextFunction) {
    try {
      const countedCash = (req.body as { countedCash?: number }).countedCash;
      const user = req.user as { userId?: string; shopId?: string } | undefined;
      const userId = user?.userId;
      const shopId = user?.shopId;

      if (!countedCash) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Counted cash amount required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Find the open shift
      const shift = await prisma.shift.findFirst({
        where: {
          userId,
          shopId,
          isActive: true,
        },
        orderBy: { startedAt: 'desc' },
      });

      if (!shift) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'No active shift found' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Calculate expected cash - get completed sales today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const salesToday = await prisma.sale.findMany({
        where: {
          shopId,
          userId,
          status: 'COMPLETED',
          saleDate: { gte: today },
        },
      });

      const totalSales = salesToday.reduce((sum: number, sale) => sum + (sale.grandTotal ?? 0), 0);
      const expectedCash = shift.openingCashBalance + totalSales;
      const discrepancy = countedCash - expectedCash;

      // Update shift with closing info
      await prisma.shift.update({
        where: { id: shift.id },
        data: {
          countedCash,
          expectedCash,
          discrepancy,
          isActive: false,
          closedAt: new Date(),
        },
      });

      // If there's a discrepancy, create notification
      if (discrepancy !== 0) {
        const ownerShop = await prisma.shop.findFirst({
          where: { ownerId: userId },
        });

        await prisma.notification.create({
          data: {
            userId: ownerShop?.ownerId || userId,
            title: 'Cash Discrepancy',
            body: `Shift closed with ${discrepancy > 0 ? 'overage' : 'shortage'} of $${Math.abs(discrepancy)}`,
            type: 'cash_discrepancy',
          },
        });
      }

      res.json({
        success: true,
        data: { shift, discrepancy },
        message: 'Shift closed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}

export const shiftController = new ShiftController();