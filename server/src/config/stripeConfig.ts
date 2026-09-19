import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-08-26.dahlia',
});

export const PRICE_IDS = {
  standard: {
    monthly: process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID!,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
  },
};

export default stripe;
