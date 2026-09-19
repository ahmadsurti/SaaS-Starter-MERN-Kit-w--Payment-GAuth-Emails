import type { Request, Response } from 'express';
import stripe, { PRICE_IDS } from '../config/stripeConfig';
import Subscription from '../models/SubscriptionModel';
import User from '../models/UserModel';
import { frontEndUrl } from '../server';

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { priceId, isAnnual } = req.body;
    const userId = req.user?.id;

    // Validate that priceId is a recognized product tier
    const allowedPriceIds = [
      PRICE_IDS.standard.monthly,
      PRICE_IDS.standard.annual,
      PRICE_IDS.pro.monthly,
      PRICE_IDS.pro.annual,
    ].filter(Boolean);

    if (!priceId || !allowedPriceIds.includes(priceId)) {
      return res.status(400).json({ success: false, error: 'Invalid or unauthorized priceId' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    let customerId = user.stripeCustomerId;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (error: any) {
        if (error.code === 'resource_missing') {
          customerId = undefined;
        } else {
          throw error;
        }
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: userId.toString(),
        },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // ponytail: integration_identifier required on 2026-03-25.dahlia+ for Dashboard tracking
      integration_identifier: `saas-subscription-checkout-kxpwlmvb`,
      success_url: `${frontEndUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontEndUrl}/pricing`,
      metadata: {
        userId: userId.toString(),
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
        },
      },
    });
    res.status(200).json({ success: true, message: 'Checkout successfully created', sessionId: session.id, sessionUrl: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

export const getSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'User not logged in' });
    }
    const userId = user.id;
    const subscription = await Subscription.findOne({ userId, status: 'active' }).sort({ createdAt: -1 }).exec();

    if (!subscription) {
      return res.status(200).json({
        success: true,
        message: 'User is not subscribed yet',
        plan: 'free',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    }

    return res.status(200).json({
      success: true,
      plan: subscription.plan,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
};

export const createPortalSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = await User.findById(userId);

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontEndUrl}/editProfilePage`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
};