"use client";

import {
  Ticket, Bot, Truck, Package, BarChart3, Shield,
  CreditCard, MessageSquare, Smartphone, Zap,
} from "lucide-react";
import { FEATURES } from "../data";
import { THEME, FadeIn, DotsBg } from "../../components/theme";

const { BG2, BORDER, ACCENT, TEXT, MUTED } = THEME;

const ICON_MAP: Record<string, React.ElementType> = {
  Ticket, Bot, Truck, Package, BarChart3, Shield,
  CreditCard, MessageSquare, Smartphone,
};

export default function FeaturesSection() {
  return (
    <section id="features" style={{
      padding: "140px 40px", background: "#fff",
      position: "relative", overflow: "hidden",
    }}>
      <DotsBg opacity={0.05} id="dots-feat" />
      <div style={{ position: "absolute", top: -80, right: "10%", width: 500, height: 400, background: "radial-gradient(ellipse,rgba(29,78,216,0.05) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1380, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 90 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, background: "#dbeafe", border: "1px solid rgba(29,78,216,0.2)", borderRadius: 999, padding: "9px 20px" }}>
              <Zap size={12} color={ACCENT} />
              <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>EVERYTHING YOU NEED</span>
            </div>
            <h2 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.08, marginBottom: 20, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Powerful features,<br />built for repair shops.
            </h2>
            <p style={{ color: MUTED, fontSize: 18, maxWidth: 520, margin: "0 auto", lineHeight: 1.9, fontFamily: "'DM Sans',sans-serif" }}>
              Every tool your team needs to deliver exceptional repair service — all in one beautifully designed platform.
            </p>
          </div>
        </FadeIn>

        {/* ── Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 24 }}>
          {FEATURES.map((f, i) => {
            const Icon = ICON_MAP[f.icon] ?? Ticket;
            return (
              <FadeIn key={f.title} delay={i * 0.07}>
                <div className="card-lift" style={{
                  background: BG2, border: `1px solid ${BORDER}`, borderRadius: 20,
                  padding: "40px 36px 44px", height: "100%", cursor: "default",
                  boxShadow: "0 4px 20px rgba(120,83,56,0.06)",
                  position: "relative", overflow: "hidden",
                }}>
                  {/* Soft glow */}
                  <div style={{ position: "absolute", top: -30, right: -20, width: 160, height: 160, background: `radial-gradient(circle,${f.bg} 0%,transparent 70%)`, pointerEvents: "none", opacity: 0.6 }} />

                  {/* Icon */}
                  <div style={{ width: 58, height: 58, borderRadius: 16, background: f.bg, border: `1px solid ${f.color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, position: "relative" }}>
                    <Icon size={26} color={f.color} />
                  </div>

                  {/* Title + badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
                    <h3 style={{ color: TEXT, fontWeight: 700, fontSize: 19, letterSpacing: "-0.3px", fontFamily: "'DM Serif Display',Georgia,serif" }}>{f.title}</h3>
                    {f.badge && (
                      <span style={{ background: f.bg, color: f.color, fontSize: 10, fontWeight: 800, padding: "4px 11px", borderRadius: 999, border: `1px solid ${f.color}30`, letterSpacing: "0.07em", fontFamily: "'DM Sans',sans-serif" }}>{f.badge}</span>
                    )}
                  </div>

                  <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.9, margin: 0, fontFamily: "'DM Sans',sans-serif" }}>{f.desc}</p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}