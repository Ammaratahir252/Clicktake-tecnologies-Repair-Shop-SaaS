import { NextResponse } from "next/server";
import { sendResponse } from "@/utils/apiResponse";

// ─── Static plan metadata (icons/copy only — NEVER prices) ────────────────
// Prices are always pulled live from Stripe below so this list can never
// drift out of sync with what you actually configured in the Stripe Dashboard.
const PLAN_META: Record<
  string,
  { label: string; desc: string; order: number }
> = {
  starter:    { label: "Starter",    desc: "1 location, basic features",     order: 1 },
  pro:        { label: "Pro",        desc: "5 staff, AI diagnostics",        order: 2 },
  business:   { label: "Business",   desc: "Unlimited staff, analytics",     order: 3 },
  enterprise: { label: "Enterprise", desc: "Multi-location, dedicated support", order: 4 },
};

const PLAN_PRICE_ENV: Record<string, string | undefined> = {
  starter:    process.env.STRIPE_PRICE_STARTER,
  pro:        process.env.STRIPE_PRICE_PRO,
  business:   process.env.STRIPE_PRICE_BUSINESS,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

export const dynamic = "force-dynamic"; // never cache — prices can change in Stripe

export async function GET() {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const planIds = Object.keys(PLAN_META).sort(
    (a, b) => PLAN_META[a].order - PLAN_META[b].order
  );

  // No Stripe configured yet — still return the plan list so the UI can render,
  // just without live pricing (falls back to "Contact us").
  if (!stripeKey || stripeKey.includes("your_stripe")) {
    return sendResponse(
      true,
      "Stripe not configured — showing plan list without live pricing",
      planIds.map((id) => ({
        id,
        label: PLAN_META[id].label,
        desc: PLAN_META[id].desc,
        priceFormatted: id === "starter" ? "Free" : "Contact us",
        amount: null,
        currency: null,
        interval: null,
        purchasable: false,
      }))
    );
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" as any });

  const plans = await Promise.all(
    planIds.map(async (id) => {
      const meta = PLAN_META[id];
      const priceId = PLAN_PRICE_ENV[id];

      // Starter is free by design — no Stripe price needed.
      if (id === "starter") {
        return {
          id,
          label: meta.label,
          desc: meta.desc,
          priceFormatted: "Free",
          amount: 0,
          currency: "usd",
          interval: null,
          purchasable: true,
        };
      }

      if (!priceId || priceId.includes("REPLACE_WITH")) {
        return {
          id,
          label: meta.label,
          desc: meta.desc,
          priceFormatted: "Contact us",
          amount: null,
          currency: null,
          interval: null,
          purchasable: false,
        };
      }

      try {
        // Live lookup — this is the single source of truth for price.
        // Whatever amount is set on this Price object in Stripe is exactly
        // what gets shown here AND exactly what gets charged at checkout.
        const price = await stripe.prices.retrieve(priceId);
        const amount = (price.unit_amount ?? 0) / 100;
        const currency = price.currency.toUpperCase();
        const interval = price.recurring?.interval ?? null;

        return {
          id,
          label: meta.label,
          desc: meta.desc,
          priceFormatted: `$${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)}/${interval === "year" ? "yr" : "mo"}`,
          amount,
          currency,
          interval,
          purchasable: true,
        };
      } catch (err: any) {
        console.error(`[billing/plans] Failed to fetch price for "${id}" (${priceId}):`, err.message);
        return {
          id,
          label: meta.label,
          desc: meta.desc,
          priceFormatted: "Unavailable",
          amount: null,
          currency: null,
          interval: null,
          purchasable: false,
        };
      }
    })
  );

  return sendResponse(true, "Plans fetched", plans);
}
