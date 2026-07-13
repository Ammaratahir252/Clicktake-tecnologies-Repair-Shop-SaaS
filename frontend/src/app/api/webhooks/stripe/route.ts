import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Tenant from "@/models/tenant.model";

// Next.js needs the raw body for Stripe signature verification
export const dynamic = "force-dynamic";

// ─── Stripe plan name → tenant plan mapping ───────────────────────────────────
function toPlanEnum(plan: string): "free" | "pro" | "enterprise" {
  const p = plan.toLowerCase();
  if (p === "pro" || p === "business") return "pro";
  if (p === "enterprise") return "enterprise";
  return "free"; // starter maps to free tier in current schema
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    console.error("[webhook] Stripe keys not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-04-10" as any });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  // Get raw body buffer for signature verification
  const rawBody = await req.arrayBuffer();
  const buf = Buffer.from(rawBody);

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error("[webhook] Signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook signature error: ${err.message}` }, { status: 400 });
  }

  await connectDB();

  // ─── Handle relevant events ──────────────────────────────────────────────────
  try {
    switch (event.type) {

      // Payment went through — activate subscription
      case "checkout.session.completed": {
        const session = event.data.object;
        const { tenantId, plan } = session.metadata ?? {};
        if (tenantId && plan) {
          await Tenant.findByIdAndUpdate(tenantId, {
            plan: toPlanEnum(plan),
            isActive: true,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
          });
          console.log(`[webhook] Tenant ${tenantId} upgraded to ${plan}`);
        }
        break;
      }

      // Subscription renewed successfully
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (customerId) {
          await Tenant.findOneAndUpdate(
            { stripeCustomerId: customerId },
            { isActive: true }
          );
        }
        break;
      }

      // Payment failed — mark inactive
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (customerId) {
          await Tenant.findOneAndUpdate(
            { stripeCustomerId: customerId },
            { isActive: false }
          );
          console.warn(`[webhook] Payment failed for customer ${customerId}`);
        }
        break;
      }

      // Subscription cancelled — downgrade to free
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer;
        if (customerId) {
          await Tenant.findOneAndUpdate(
            { stripeCustomerId: customerId },
            { plan: "free", isActive: true, stripeSubscriptionId: null }
          );
          console.log(`[webhook] Subscription cancelled for customer ${customerId}`);
        }
        break;
      }

      default:
        // Unhandled event type — ignore safely
        break;
    }
  } catch (err: any) {
    console.error("[webhook] DB update error:", err.message);
    // Still return 200 so Stripe doesn't retry — log the error for manual fix
  }

  return NextResponse.json({ received: true });
}
