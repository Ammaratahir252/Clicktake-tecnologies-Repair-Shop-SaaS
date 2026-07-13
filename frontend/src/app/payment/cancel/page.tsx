"use client";

import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#fff7ed 0%,#ffedd5 50%,#fed7aa 100%)",
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
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.10)",
        }}
      >
        {/* Cancel Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#d97706,#f59e0b)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 8px 24px rgba(217,119,6,0.30)",
          }}
        >
          <XCircle size={40} color="#fff" />
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#78350f",
            marginBottom: 8,
            fontFamily: "'DM Serif Display', Georgia, serif",
          }}
        >
          Payment Cancelled
        </h1>

        <p style={{ color: "#6b7280", fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          No worries — your account was not charged. You can choose a plan
          whenever you're ready.
        </p>

        <div
          style={{
            background: "#fef9c3",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 28,
            border: "1px solid #fde68a",
          }}
        >
          <p style={{ fontSize: 13, color: "#713f12", fontWeight: 600, lineHeight: 1.6 }}>
            💡 You can still log in and use the free plan, or upgrade any time
            from your dashboard.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link
            href="/#pricing"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "14px 24px",
              borderRadius: 12,
              background: "linear-gradient(135deg,#d97706,#b45309)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              textDecoration: "none",
              boxShadow: "0 8px 24px rgba(217,119,6,0.30)",
            }}
          >
            <RefreshCw size={16} /> Try Again
          </Link>

          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "14px 24px",
              borderRadius: 12,
              background: "#f3f4f6",
              color: "#374151",
              fontWeight: 700,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
