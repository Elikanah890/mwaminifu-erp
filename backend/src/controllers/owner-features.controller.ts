import { Request, Response, NextFunction } from 'express';
import { capitalService } from '../services/capital.service';
import { recurringService } from '../services/recurring.service';
import { deviceService } from '../services/device.service';
import { inventoryService } from '../services/inventory.service';

export class CapitalController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await capitalService.list(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await capitalService.summary(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await capitalService.create(req.params.shopId, req.user!.userId, req.body);
      res.status(201).json({ success: true, data, message: 'Capital transaction recorded', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class RecurringController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recurringService.list(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recurringService.create(req.params.shopId, req.body);
      res.status(201).json({ success: true, data, message: 'Recurring expense created', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async toggle(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recurringService.toggle(req.params.shopId, req.params.id);
      res.json({ success: true, data, message: 'Recurring expense updated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await recurringService.remove(req.params.shopId, req.params.id);
      res.json({ success: true, message: 'Recurring expense deleted', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async generateDue(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recurringService.generateDue(req.params.shopId, req.user!.userId);
      res.json({ success: true, data, message: `${data.generated} expense(s) generated`, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class DeviceController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await deviceService.register(req.user!.userId, req.body.deviceId);
      res.status(201).json({ success: true, data, message: 'Device session registered', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const deviceId = (req.query.deviceId as string) || '';
      const data = await deviceService.listByDevice(deviceId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export class ProductUnitController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inventoryService.listUnitConfigs(req.params.productId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await inventoryService.createUnitConfig(req.params.productId, req.body, { isOwner: req.user!.role === 'BUSINESS_OWNER' });
      res.status(201).json({ success: true, data, message: 'Unit added', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await inventoryService.deleteUnitConfig(req.params.id);
      res.json({ success: true, message: 'Unit deleted', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export const capitalController = new CapitalController();
export const recurringController = new RecurringController();
export const deviceController = new DeviceController();
export const productUnitController = new ProductUnitController();
