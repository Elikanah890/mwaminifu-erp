import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscription.service';

export class SubscriptionController {
  async listPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.listPlans(false);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async getShopSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.getShopSubscription(req.params.shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  /**
   * Current subscription status for the authenticated user's shop. Never
   * blocked by subscription enforcement so the client can always read it and
   * prompt for renewal.
   */
  async status(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId =
        (req.query.shopId as string) ||
        req.params.shopId ||
        (req.user as { shopId?: string } | undefined)?.shopId;
      if (!shopId) {
        res.json({ success: true, data: null, timestamp: new Date().toISOString() });
        return;
      }
      const data = await subscriptionService.getShopSubscription(shopId);
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.subscribe(req.params.shopId, req.body);
      res.status(201).json({ success: true, data, message: 'Subscription activated', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async renew(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.renew(req.params.shopId, req.body || {});
      res.json({ success: true, data, message: 'Subscription renewed', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async upgrade(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.changePlan(req.params.shopId, req.body);
      res.json({ success: true, data, message: 'Plan changed', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await subscriptionService.cancel(req.params.shopId);
      res.json({ success: true, data, message: 'Subscription cancelled', timestamp: new Date().toISOString() });
    } catch (error) { next(error); }
  }
}

export const subscriptionController = new SubscriptionController();
