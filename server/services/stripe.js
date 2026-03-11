import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

if (!stripe) {
  console.warn(
    "WARNING: STRIPE_SECRET_KEY not found. Orb Store purchases will be disabled.",
  );
}
