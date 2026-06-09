"use client";

import { Star, Quote } from "lucide-react";
import { TESTIMONIALS } from "../data";
import { THEME, FadeIn, DotsBg } from "../../components/theme";

const { BG2, BORDER, TEXT, MUTED } = THEME;

export default function TestimonialsSection() {
  return (
    <section style={{
      padding: "140px 40px", background: "#fff",
      position: "relative", overflow: "hidden",
    }}>
      <DotsBg opacity={0.04} id="dots-testi" />

      <div style={{ maxWidth: 1380, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 90 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, background: "#fef3c7", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "9px 20px" }}>
              <Star size={12} color="#d97706" fill="#d97706" />
              <span style={{ color: "#d97706", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>LOVED BY SHOP OWNERS</span>
            </div>
            <h2 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.08, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Trusted by repair shops<br />across Pakistan & beyond.
            </h2>
          </div>
        </FadeIn>

        {/* ── Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 24 }}>
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.09}>
              <div className="card-lift" style={{
                background: BG2, border: `1px solid ${BORDER}`, borderRadius: 20,
                padding: "36px 34px 40px",
                boxShadow: "0 4px 20px rgba(120,83,56,0.06)",
                position: "relative", overflow: "hidden",
              }}>
                {/* Quote icon */}
                <div style={{ position: "absolute", top: 20, right: 24, opacity: 0.08 }}>
                  <Quote size={52} color={t.color} />
                </div>

                {/* Stars */}
                <div style={{ display: "flex", gap: 3, marginBottom: 18 }}>
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} size={15} fill="#f59e0b" color="#f59e0b" />
                  ))}
                </div>

                {/* Metric chip */}
                <div style={{ display: "inline-block", background: `${t.color}15`, color: t.color, fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 8, border: `1px solid ${t.color}25`, marginBottom: 16, fontFamily: "'DM Sans',sans-serif", letterSpacing: "0.06em" }}>
                  {t.metric}
                </div>

                <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.9, marginBottom: 28, fontStyle: "italic", fontFamily: "'DM Serif Display',Georgia,serif", position: "relative" }}>
                  "{t.text}"
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: "50%",
                    background: `linear-gradient(135deg,${t.color}80,${t.color})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0,
                    boxShadow: `0 4px 14px ${t.color}35`,
                    fontFamily: "'DM Sans',sans-serif",
                  }}>{t.initials}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: TEXT, fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>{t.name}</div>
                    <div style={{ color: MUTED, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}