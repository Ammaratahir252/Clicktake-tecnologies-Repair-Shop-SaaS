"use client";

import Link from "next/link";
import { Award, CheckCircle, ArrowRight } from "lucide-react";
import { PRICING } from "../data";
import { THEME, FadeIn, HatchBg } from "../../components/theme";

const { BG3, BORDER, ACCENT, ACCENT2, TEXT, MUTED } = THEME;

export default function PricingSection() {
  return (
    <section id="pricing" style={{
      padding: "140px 40px", background: BG3,
      position: "relative", overflow: "hidden",
    }}>
      <HatchBg opacity={0.03} />
      <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 800, height: 400, background: "radial-gradient(ellipse,rgba(29,78,216,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 90 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, background: "#d1fae5", border: "1px solid rgba(6,95,70,0.2)", borderRadius: 999, padding: "9px 20px" }}>
              <Award size={12} color="#065f46" />
              <span style={{ color: "#065f46", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>SIMPLE PRICING</span>
            </div>
            <h2 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.08, marginBottom: 20, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Transparent plans,<br />no surprises.
            </h2>
            <p style={{ color: MUTED, fontSize: 18, maxWidth: 440, margin: "0 auto", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.8 }}>
              Start free, scale as you grow. Cancel anytime — no contracts, no fine print.
            </p>
          </div>
        </FadeIn>

        {/* ── Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 24, alignItems: "center" }}>
          {PRICING.map((p, i) => (
            <FadeIn key={p.name} delay={i * 0.1}>
              <div style={{
                position: "relative",
                background: p.popular ? `linear-gradient(160deg,${ACCENT} 0%,${ACCENT2} 100%)` : "#fff",
                border: p.popular ? "none" : `1px solid ${BORDER}`,
                borderRadius: 22, padding: "44px 38px",
                transform: p.popular ? "scale(1.04)" : "none",
                boxShadow: p.popular
                  ? `0 40px 80px rgba(29,78,216,0.3),0 12px 32px rgba(29,78,216,0.18)`
                  : "0 4px 20px rgba(120,83,56,0.06)",
                transition: "transform 0.3s ease",
              }}>
                {p.popular && (
                  <div style={{
                    position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)",
                    background: "#fef3c7", color: "#92400e",
                    fontSize: 10, fontWeight: 800, padding: "6px 24px", borderRadius: 999,
                    whiteSpace: "nowrap", letterSpacing: "0.1em",
                    boxShadow: "0 6px 18px rgba(245,158,11,0.25)", fontFamily: "'DM Sans',sans-serif",
                  }}>
                    ★ MOST POPULAR
                  </div>
                )}

                {/* Plan name chip */}
                <div style={{
                  display: "inline-block",
                  background: p.popular ? "rgba(255,255,255,0.15)" : "#f5f0e8",
                  color: p.popular ? "#fff" : MUTED,
                  fontSize: 10, fontWeight: 800, padding: "5px 15px", borderRadius: 7,
                  letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20,
                  border: p.popular ? "1px solid rgba(255,255,255,0.2)" : `1px solid ${BORDER}`,
                  fontFamily: "'DM Sans',sans-serif",
                }}>{p.name}</div>

                {/* Price */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 9 }}>
                  <span style={{ color: p.popular ? "#fff" : TEXT, fontWeight: 700, fontSize: 54, letterSpacing: "-2.5px", lineHeight: 1, fontFamily: "'DM Serif Display',Georgia,serif" }}>{p.price}</span>
                  <span style={{ color: p.popular ? "rgba(255,255,255,0.6)" : MUTED, fontWeight: 600, fontSize: 15, fontFamily: "'DM Sans',sans-serif" }}>{p.period}</span>
                </div>

                <p style={{ color: p.popular ? "rgba(255,255,255,0.7)" : MUTED, fontSize: 14, lineHeight: 1.8, marginBottom: 26, fontFamily: "'DM Sans',sans-serif" }}>{p.desc}</p>

                {/* Features */}
                <div style={{ borderTop: `1px solid ${p.popular ? "rgba(255,255,255,0.15)" : BORDER}`, paddingTop: 26, marginBottom: 32 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 12 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: p.popular ? "rgba(255,255,255,0.15)" : "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CheckCircle size={12} color={p.popular ? "#fff" : ACCENT} />
                      </div>
                      <span style={{ color: p.popular ? "rgba(255,255,255,0.85)" : MUTED, fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans',sans-serif" }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Link href={`/register?plan=${p.name.toLowerCase()}`} style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: p.popular ? "rgba(255,255,255,0.18)" : "#dbeafe",
                  color: p.popular ? "#fff" : ACCENT,
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  padding: "15px 0", borderRadius: 11, width: "100%",
                  border: p.popular ? "1px solid rgba(255,255,255,0.25)" : "none",
                  transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif",
                }}>
                  {p.cta} <ArrowRight size={16} />
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* ── Reassurance ── */}
        <FadeIn delay={0.3}>
          <div style={{ textAlign: "center", marginTop: 52 }}>
            <p style={{ color: MUTED, fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
              All plans include a <strong style={{ color: TEXT }}>14-day free trial</strong>. No credit card required. &nbsp;·&nbsp; Cancel anytime.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}