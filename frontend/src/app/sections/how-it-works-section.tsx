"use client";

import {
  ClipboardList, UserCheck, Wrench, FileCheck, CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { HOW_IT_WORKS_STEPS } from "../data";
import { THEME, FadeIn, HatchBg } from "../../components/theme";

const { BG3, BORDER, ACCENT, ACCENT2, TEXT, MUTED } = THEME;

const ICON_MAP: Record<string, React.ElementType> = {
  ClipboardList, UserCheck, Wrench, FileCheck, CheckCircle2,
};

export default function HowItWorksSection() {
  return (
    <section id="howitworks" style={{
      padding: "140px 40px", background: BG3,
      position: "relative", overflow: "hidden",
    }}>
      <HatchBg opacity={0.03} />
      <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse,rgba(29,78,216,0.05) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 90 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, background: "rgba(29,78,216,0.08)", border: "1px solid rgba(29,78,216,0.18)", borderRadius: 999, padding: "9px 20px" }}>
              <ArrowRight size={12} color={ACCENT} />
              <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>HOW IT WORKS</span>
            </div>
            <h2 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.08, marginBottom: 20, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              A repair, from start<br />to finish.
            </h2>
            <p style={{ color: MUTED, fontSize: 18, maxWidth: 480, margin: "0 auto", lineHeight: 1.9, fontFamily: "'DM Sans',sans-serif" }}>
              See exactly how DibnowRepairSaaS handles every step of the repair workflow — no gaps, no guesswork.
            </p>
          </div>
        </FadeIn>

        {/* ── Steps ── */}
        <div style={{ position: "relative" }}>
          {/* Vertical connector line */}
          <div style={{
            position: "absolute", left: 39, top: 56, bottom: 56,
            width: 2,
            background: `linear-gradient(to bottom, ${ACCENT}33, ${ACCENT}10)`,
            borderRadius: 4,
          }} className="desktop-only" />

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {HOW_IT_WORKS_STEPS.map((step, i) => {
              const Icon = ICON_MAP[step.icon] ?? Wrench;
              const isLast = i === HOW_IT_WORKS_STEPS.length - 1;
              return (
                <FadeIn key={step.step} delay={i * 0.1}>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 28, alignItems: "flex-start" }}>

                    {/* Step number circle */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                      <div style={{
                        width: 80, height: 80, borderRadius: "50%",
                        background: step.bg, border: `2px solid ${step.color}33`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, position: "relative", zIndex: 1,
                        boxShadow: `0 8px 24px ${step.color}20`,
                      }}>
                        <Icon size={32} color={step.color} />
                      </div>
                    </div>

                    {/* Content card */}
                    <div className="card-lift" style={{
                      background: "#fff", border: `1px solid ${BORDER}`,
                      borderRadius: 18, padding: "30px 32px",
                      boxShadow: "0 4px 20px rgba(120,83,56,0.06)",
                      position: "relative", overflow: "hidden",
                    }}>
                      {/* Subtle bg glow */}
                      <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: `radial-gradient(circle,${step.bg} 0%,transparent 70%)`, pointerEvents: "none", opacity: 0.7 }} />

                      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, position: "relative" }}>
                        {/* Step label */}
                        <div style={{
                          background: step.bg, color: step.color,
                          fontSize: 11, fontWeight: 800,
                          padding: "5px 14px", borderRadius: 8,
                          letterSpacing: "0.09em", fontFamily: "'DM Sans',sans-serif",
                          border: `1px solid ${step.color}22`,
                          flexShrink: 0, alignSelf: "flex-start",
                          marginTop: 3,
                        }}>
                          STEP {step.step}
                        </div>

                        <div style={{ flex: 1 }}>
                          <h3 style={{ color: TEXT, fontWeight: 700, fontSize: 20, letterSpacing: "-0.4px", marginBottom: 10, fontFamily: "'DM Serif Display',Georgia,serif" }}>
                            {step.title}
                          </h3>
                          <p style={{ color: MUTED, fontSize: 15, lineHeight: 1.9, margin: 0, fontFamily: "'DM Sans',sans-serif" }}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>

        {/* ── CTA ── */}
        <FadeIn delay={0.3}>
          <div style={{ textAlign: "center", marginTop: 70 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
              color: "#fff", fontWeight: 700, fontSize: 15,
              padding: "16px 36px", borderRadius: 12, cursor: "pointer",
              boxShadow: `0 10px 28px rgba(29,78,216,0.3)`,
              fontFamily: "'DM Sans',sans-serif",
            }}
              onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>
              Get started today <ArrowRight size={17} />
            </div>
          </div>
        </FadeIn>
      </div>

      <style>{`
        @media(max-width:900px){
          .desktop-only{display:none!important;}
        }
      `}</style>
    </section>
  );
}