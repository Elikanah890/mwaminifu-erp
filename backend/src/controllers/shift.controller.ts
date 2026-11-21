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

      const shopId = (req.user as { shopId?: string } | undefined)?.shopId;
      const shifts = await prisma.shift.findMany({
        where: { userId, ...(shopId ? { shopId } : {}) },
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

      const shopId = (req.user as { shopId?: string } | undefined)?.shopId;
      const activeShift = await prisma.shift.findFirst({
        where: { userId, ...(shopId ? { shopId } : {}), isActive: true },
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
      // requireBodyShopAccess has already validated access and set params.shopId.
      const shopId = req.params.shopId || (req.body && req.body.shopId) || user?.shopId;

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
      const rawCounted = (req.body as { countedCash?: number | string }).countedCash;
      const countedCash = Number(rawCounted);
      const user = req.user as { userId?: string; shopId?: string } | undefined;
      const userId = user?.userId;
      // requireBodyShopAccess has already validated access and set params.shopId.
      const shopId = req.params.shopId || (req.body && req.body.shopId) || user?.shopId;

      if (!Number.isFinite(countedCash) || countedCash < 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'A valid counted cash amount is required' },
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

      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { id: true, ownerId: true, currency: true },
      });
      if (!shop) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Shop not found' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Expected cash = opening balance + this cashier's cash movements during
      // the shift (credit/mobile-money sales must not inflate expected cash).
      const cashier = await prisma.user.findUnique({
        where: { id: userId! },
        select: { name: true },
      });
      const cashMovement = await prisma.cashTransaction.aggregate({
        where: { shopId, userId, createdAt: { gte: shift.startedAt } },
        _sum: { amount: true },
      });
      const expectedCash = shift.openingCashBalance + (cashMovement._sum.amount ?? 0);
      const discrepancy = countedCash - expectedCash;

      const result = await prisma.$transaction(async (tx) => {
        const closed = await tx.shift.update({
          where: { id: shift.id },
          data: {
            countedCash,
            expectedCash,
            discrepancy,
            isActive: false,
            closedAt: new Date(),
          },
        });

        // Cash discrepancy belongs to the shop owner, not the cashier.
        if (Math.abs(discrepancy) >= 0.01) {
          const currency = shop.currency || 'TZS';
          await tx.notification.create({
            data: {
              userId: shop.ownerId,
              shopId: shop.id,
              title: 'Cash Discrepancy',
              body: `Shift closed by ${cashier?.name ?? 'cashier'} with ${discrepancy > 0 ? 'overage' : 'shortage'} of ${currency} ${Math.abs(discrepancy).toLocaleString()}`,
              type: 'cash_discrepancy',
            },
          });
        }

        return closed;
      });

      res.json({
        success: true,
        data: { shift: result, discrepancy },
        message: 'Shift closed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      next(error);
    }
  }
}

export const shiftController = new ShiftController();