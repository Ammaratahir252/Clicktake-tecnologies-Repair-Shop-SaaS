import { NextRequest, NextResponse } from "next/server";
import { sendResponse } from "@/utils/apiResponse";

// ─── Stripe Plan ID Map ────────────────────────────────────────────────────────
// These are the PRODUCT IDs you added in your Stripe dashboard.
// For Checkout we need PRICE IDs (price_xxx), not product IDs (prod_xxx).
// Map your 4 plans here once you create prices under each product.
// Until then, we store them as env vars STRIPE_PRICE_STARTER etc.
const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  starter:    process.env.STRIPE_PRICE_STARTER,
  pro:        process.env.STRIPE_PRICE_PRO,
  business:   process.env.STRIPE_PRICE_BUSINESS,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

export async function POST(req: NextRequest) {
  // Lazy-load stripe so the server doesn't crash if the key is missing
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey.includes("your_stripe")) {
    return sendResponse(false, "Stripe is not configured on the server.", null, 500);
  }

  let body: { plan: string; email?: string; tenantId?: string };
  try {
    body = await req.json();
  } catch {
    return sendResponse(false, "Invalid request body", null, 400);
  }

  const { plan, email, tenantId } = body;
  if (!plan) return sendResponse(false, "Plan is required", null, 400);

  const priceId = PLAN_PRICE_MAP[plan.toLowerCase()];
  if (!priceId) {
    return sendResponse(
      false,
      `Unknown plan "${plan}". Valid plans: starter, pro, business, enterprise`,
      null,
      400
    );
  }

  // Dynamic import keeps stripe out of the client bundle
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" as any });

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      ...(email ? { customer_email: email } : {}),
      line_items: [{ price: priceId, quantity: 1 }],
      // Pass tenantId as metadata so the webhook can link the subscription to the shop
      metadata: { tenantId: tenantId ?? "", plan },
      success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url:  `${appUrl}/payment/cancel`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return sendResponse(true, "Checkout session created", { url: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error("[billing/checkout]", err.message);
    return sendResponse(false, err.message ?? "Stripe error", null, 500);
  }
}
