"use client";

import {
  Store, Key, MonitorSmartphone, Wrench,
  Truck, HeartHandshake, Users, CheckCircle, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { ROLES } from "../data";
import { THEME, FadeIn, HatchBg } from "../../components/theme";

const { BG3, BORDER, ACCENT, TEXT, MUTED } = THEME;

const ICON_MAP: Record<string, React.ElementType> = {
  Store, Key, MonitorSmartphone, Wrench, Truck, HeartHandshake,
};

export default function RolesSection() {
  return (
    <section id="roles" style={{
      padding: "140px 40px", background: "#fff",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -60, right: "8%", width: 500, height: 400, background: "radial-gradient(ellipse,rgba(29,78,216,0.04) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1380, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 90 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, background: "#dbeafe", border: "1px solid rgba(29,78,216,0.2)", borderRadius: 999, padding: "9px 20px" }}>
              <Users size={12} color={ACCENT} />
              <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>BUILT FOR EVERY ROLE</span>
            </div>
            <h2 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.08, marginBottom: 20, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              One platform,<br />every team member.
            </h2>
            <p style={{ color: MUTED, fontSize: 18, maxWidth: 520, margin: "0 auto", lineHeight: 1.9, fontFamily: "'DM Sans',sans-serif" }}>
              Tailored dashboards and granular permissions for each role in your repair shop. Everyone sees exactly what they need.
            </p>
          </div>
        </FadeIn>

        {/* ── Role Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 22 }}>
          {ROLES.map((r, i) => {
            const Icon = ICON_MAP[r.icon] ?? Store;
            return (
              <FadeIn key={r.label} delay={i * 0.07}>
                <div className="card-lift" style={{
                  background: BG3, border: `1px solid ${BORDER}`, borderRadius: 20,
                  padding: "32px 30px 36px", height: "100%",
                  boxShadow: "0 4px 20px rgba(120,83,56,0.06)",
                  position: "relative", overflow: "hidden",
                }}>
                  {/* Bg glow */}
                  <div style={{ position: "absolute", top: -40, right: -20, width: 180, height: 180, background: `radial-gradient(circle,${r.bg} 0%,transparent 70%)`, pointerEvents: "none", opacity: 0.7 }} />

                  {/* Role icon + title */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: r.bg, border: `1px solid ${r.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={24} color={r.color} />
                    </div>
                    <h3 style={{ color: TEXT, fontWeight: 700, fontSize: 20, letterSpacing: "-0.3px", fontFamily: "'DM Serif Display',Georgia,serif" }}>{r.label}</h3>
                  </div>

                  <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.85, marginBottom: 18, fontFamily: "'DM Sans',sans-serif" }}>{r.desc}</p>

                  {/* Perks */}
                  <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 18, display: "flex", flexDirection: "column", gap: 9 }}>
                    {r.perks.map(p => (
                      <div key={p} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <CheckCircle size={14} color={r.color} />
                        <span style={{ color: MUTED, fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans',sans-serif" }}>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>

        {/* ── CTA ── */}
        <FadeIn delay={0.2}>
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <Link href="/register"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                color: ACCENT, fontWeight: 700, fontSize: 15,
                textDecoration: "none",
                background: "rgba(29,78,216,0.07)", padding: "15px 32px",
                borderRadius: 11, border: "1px solid rgba(29,78,216,0.18)",
                transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif",
              }}>
              Choose your role and get started <ArrowRight size={17} />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}