import { Request, Response } from 'express';
import Stripe from 'stripe';
import stripe, { PRICE_IDS } from '../config/stripeConfig';
import Subscription from '../models/SubscriptionModel';

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!sig) {
    return res.status(400).send('No stripe-signature header');
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      default:
        break;
    }
    res.send({ received: true });
  } catch {
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (!session.subscription) {
    console.error('No subscription found in checkout session');
    return;
  }
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId found in checkout session metadata');
    return;
  }
  await updateSubscriptionInDB(subscription, userId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (userId) {
    await updateSubscriptionInDB(subscription, userId);
  } else {
    // If metadata is stripped, update by stripeSubscriptionId without altering userId
    const existing = await Subscription.findOne({ stripeSubscriptionId: subscription.id });
    if (existing) {
      await updateSubscriptionInDB(subscription, existing.userId.toString());
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // Query by immutable stripeSubscriptionId, falling back to metadata.userId if present
  const query = subscription.id
    ? { stripeSubscriptionId: subscription.id }
    : { userId: subscription.metadata?.userId };

  if (query.stripeSubscriptionId || query.userId) {
    await Subscription.findOneAndUpdate(
      query,
      { status: 'canceled', stripeSubscriptionId: null, plan: 'free', currentPeriodEnd: new Date() },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleInvoicePaymentSucceeded(_invoice: Stripe.Invoice) {
  // Extend here for receipt emails, usage tracking, etc.
}

async function updateSubscriptionInDB(subscription: Stripe.Subscription, userId: string) {
  const firstItem = subscription.items?.data?.[0];
  const priceId = firstItem?.price?.id ?? '';
  const plan = getPlanFromPriceId(priceId);

  // On API 2026-08-26.dahlia current_period_start/end live on the SubscriptionItem.
  const currentPeriodStart = new Date((firstItem?.current_period_start ?? subscription.billing_cycle_anchor) * 1000);
  const currentPeriodEnd = new Date((firstItem?.current_period_end ?? subscription.billing_cycle_anchor) * 1000);

  // Cancel any other active subscriptions for this user (plan upgrades/downgrades)
  const existingSubscriptions = await Subscription.find({
    userId,
    status: 'active',
    stripeSubscriptionId: { $ne: subscription.id },
  });

  for (const sub of existingSubscriptions) {
    try {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: sub.stripeSubscriptionId },
        { status: 'canceled', canceledAt: new Date() },
      );
    } catch (error) {
      console.error('Error canceling old subscription:', error);
    }
  }

  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      userId,
      stripeSubscriptionId: subscription.id,
      priceId,
      status: subscription.status,
      plan,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    { upsert: true, new: true },
  );
}

function getPlanFromPriceId(priceId: string): string {
  if (Object.values(PRICE_IDS.pro).includes(priceId)) return 'pro';
  if (Object.values(PRICE_IDS.standard).includes(priceId)) return 'standard';
  return 'free';
}
