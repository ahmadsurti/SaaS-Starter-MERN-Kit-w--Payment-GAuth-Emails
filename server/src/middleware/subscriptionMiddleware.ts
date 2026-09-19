import { NextFunction, Request, Response } from 'express';
import Subscription from '../models/SubscriptionModel';

export async function ensurePro(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user;
  const userSubscription = await Subscription.findOne({ userId: user?._id, status: 'active' });
  const plan = userSubscription?.plan?.toLowerCase();

  if (plan !== 'pro') {
    res.status(403).json({ success: false, message: 'You need a Pro subscription to use this feature' });
    return;
  }
  next();
}

export async function ensureStandard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = req.user;
  const userSubscription = await Subscription.findOne({ userId: user?._id, status: 'active' });
  const plan = userSubscription?.plan?.toLowerCase();

  if (plan !== 'pro' && plan !== 'standard') {
    res.status(403).json({ success: false, message: 'You need a Standard or Pro subscription to use this feature' });
    return;
  }
  next();
}
