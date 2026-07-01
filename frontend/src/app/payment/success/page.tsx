"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, Loader2, Zap, Star, TrendingUp } from "lucide-react";
import Link from "next/link";

const PLAN_LABELS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  starter:    { label: "Starter",    color: "#0369a1", bg: "#e0f2fe", icon: Zap },
  pro:        { label: "Pro",        color: "#1d4ed8", bg: "#dbeafe", icon: Star },
  business:   { label: "Business",   color: "#6d28d9", bg: "#ede9fe", icon: TrendingUp },
  enterprise: { label: "Enterprise", color: "#c2410c", bg: "#ffedd5", icon: Star },
};

export default function PaymentSuccessPage() {
  const params   = useSearchParams();
  const router   = useRouter();
  const plan     = params.get("plan") ?? "pro";
  const sessionId = params.get("session_id");

  const [seconds, setSeconds] = useState(5);

  const planInfo = PLAN_LABELS[plan.toLowerCase()] ?? PLAN_LABELS.pro;
  const PlanIcon = planInfo.icon;

  // Countdown then redirect to dashboard
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          router.push("/login");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#f0fdf4 0%,#dcfce7 50%,#bbf7d0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          padding: "48px 40px",
          maxWidth: 480,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.10)",
        }}
      >
        {/* Success Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#16a34a,#22c55e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 8px 24px rgba(34,197,94,0.30)",
          }}
        >
          <CheckCircle2 size={40} color="#fff" />
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#14532d",
            marginBottom: 8,
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}
        >
          Payment Successful!
        </h1>

        <p style={{ color: "#4b5563", fontSize: 15, marginBottom: 28 }}>
          Your subscription is now active. Welcome aboard!
        </p>

        {/* Plan Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            borderRadius: 14,
            background: planInfo.bg,
            border: `2px solid ${planInfo.color}22`,
            marginBottom: 32,
          }}
        >
          <PlanIcon size={18} color={planInfo.color} />
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: planInfo.color,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {planInfo.label} Plan Activated
          </span>
        </div>

        {/* What's next */}
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 14,
            padding: "20px",
            marginBottom: 28,
            textAlign: "left",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 12,
            }}
          >
            What happens next
          </p>
          {[
            "Your shop account is fully activated",
            "Log in to access your dashboard",
            "A receipt has been emailed to you",
          ].map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: i < 2 ? 8 : 0,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={12} color="#16a34a" />
              </div>
              <span style={{ fontSize: 13, color: "#374151" }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Redirect info */}
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
          Redirecting to login in{" "}
          <span style={{ fontWeight: 800, color: "#374151" }}>{seconds}s</span>
          …
        </p>

        <Link
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            width: "100%",
            padding: "14px 24px",
            borderRadius: 12,
            background: "linear-gradient(135deg,#16a34a,#15803d)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            textDecoration: "none",
            boxShadow: "0 8px 24px rgba(22,163,74,0.30)",
          }}
        >
          Go to Login <ArrowRight size={16} />
        </Link>

        {sessionId && (
          <p
            style={{
              fontSize: 11,
              color: "#d1d5db",
              marginTop: 16,
              fontFamily: "monospace",
            }}
          >
            Session: {sessionId.slice(0, 20)}…
          </p>
        )}
      </div>
    </div>
  );
}
