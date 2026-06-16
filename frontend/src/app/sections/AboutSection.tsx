"use client";

import { Wrench, Globe, Shield, Zap, ArrowRight, MapPin, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { TEAM, ABOUT_VALUES } from "../data";
import { THEME, FadeIn, HatchBg, DotsBg } from "../../components/theme";

const { BG3, BORDER, ACCENT, ACCENT2, TEXT, MUTED } = THEME;

const VALUE_ICON_MAP: Record<string, React.ElementType> = {
  Wrench, Globe, Shield, Zap,
};

export default function AboutSection() {
  return (
    <section id="about" style={{
      padding: "140px 40px", background: BG3,
      position: "relative", overflow: "hidden",
    }}>
      <HatchBg opacity={0.03} />

      <div style={{ maxWidth: 1380, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 90 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, background: "rgba(29,78,216,0.08)", border: "1px solid rgba(29,78,216,0.18)", borderRadius: 999, padding: "9px 20px" }}>
              <Users size={12} color={ACCENT} />
              <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>ABOUT US</span>
            </div>
            <h2 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.08, marginBottom: 20, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Built in Pakistan,<br />for repair shops everywhere.
            </h2>
            <p style={{ color: MUTED, fontSize: 18, maxWidth: 620, margin: "0 auto", lineHeight: 1.9, fontFamily: "'DM Sans',sans-serif" }}>
              DibnowRepairSaaS started as a frustration. Our founders ran repair shops in Lahore and Karachi and couldn't find software that actually worked for their teams. So they built it.
            </p>
          </div>
        </FadeIn>

        {/* ── Story + Stats ── */}
        <FadeIn delay={0.1}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center", marginBottom: 90 }} className="hero-cols">

            {/* Story */}
            <div>
              <h3 style={{ fontSize: 28, fontWeight: 700, color: TEXT, letterSpacing: "-0.8px", marginBottom: 20, fontFamily: "'DM Serif Display',Georgia,serif" }}>
                Our story
              </h3>
              <p style={{ color: MUTED, fontSize: 15, lineHeight: 2, marginBottom: 18, fontFamily: "'DM Sans',sans-serif" }}>
                In 2022, our co-founder Hamza was managing a repair shop in Lahore using a combination of WhatsApp, Excel, and sticky notes. Technicians missed jobs. Customers called asking for updates. Revenue reports were done by hand every Sunday night.
              </p>
              <p style={{ color: MUTED, fontSize: 15, lineHeight: 2, marginBottom: 18, fontFamily: "'DM Sans',sans-serif" }}>
                He and his technical co-founder Ali spent a year building the platform they wished existed — one that understood local payment methods, worked offline, ran on any phone, and was simple enough for front desk staff to learn in an afternoon.
              </p>
              <p style={{ color: MUTED, fontSize: 15, lineHeight: 2, fontFamily: "'DM Sans',sans-serif" }}>
                Today, DibnowRepairSaaS is used by 500+ shops across Pakistan, UAE, and the UK. We're growing because our customers grow with us.
              </p>
              <div style={{ display: "flex", gap: 16, marginTop: 28, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin size={15} color={ACCENT} />
                  <span style={{ color: MUTED, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>Lahore, Pakistan</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={15} color={ACCENT} />
                  <span style={{ color: MUTED, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>Founded 2022</span>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { val: "500+", label: "Active shops",       bg: "#dbeafe", color: "#1d4ed8" },
                { val: "10K+", label: "Repairs tracked",    bg: "#d1fae5", color: "#065f46" },
                { val: "3",    label: "Countries",          bg: "#ede9fe", color: "#6d28d9" },
                { val: "98%",  label: "Satisfaction rate",  bg: "#fef3c7", color: "#92400e" },
              ].map(s => (
                <div key={s.label} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 18, padding: "32px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 40, fontWeight: 700, color: s.color, letterSpacing: "-2px", lineHeight: 1, marginBottom: 8, fontFamily: "'DM Serif Display',Georgia,serif" }}>{s.val}</div>
                  <div style={{ fontSize: 13, color: MUTED, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* ── Values ── */}
        <FadeIn delay={0.15}>
          <h3 style={{ fontSize: 26, fontWeight: 700, color: TEXT, letterSpacing: "-0.6px", marginBottom: 32, textAlign: "center", fontFamily: "'DM Serif Display',Georgia,serif" }}>
            What we believe
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 20, marginBottom: 90 }}>
            {ABOUT_VALUES.map((v, i) => {
              const Icon = VALUE_ICON_MAP[v.icon] ?? Wrench;
              return (
                <FadeIn key={v.title} delay={i * 0.08}>
                  <div className="card-lift" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 18, padding: "30px 26px", boxShadow: "0 4px 18px rgba(120,83,56,0.06)" }}>
                    <div style={{ width: 50, height: 50, borderRadius: 14, background: v.bg, border: `1px solid ${v.color}22`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                      <Icon size={22} color={v.color} />
                    </div>
                    <h4 style={{ color: TEXT, fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px", marginBottom: 10, fontFamily: "'DM Serif Display',Georgia,serif" }}>{v.title}</h4>
                    <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.85, margin: 0, fontFamily: "'DM Sans',sans-serif" }}>{v.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </FadeIn>

        {/* ── Team ── */}
        <FadeIn delay={0.2}>
          <h3 style={{ fontSize: 26, fontWeight: 700, color: TEXT, letterSpacing: "-0.6px", marginBottom: 32, textAlign: "center", fontFamily: "'DM Serif Display',Georgia,serif" }}>
            Meet the team
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 22 }}>
            {TEAM.map((member, i) => (
              <FadeIn key={member.name} delay={i * 0.08}>
                <div className="card-lift" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 18, padding: "32px 26px", textAlign: "center", boxShadow: "0 4px 18px rgba(120,83,56,0.06)" }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: `linear-gradient(135deg,${member.color}80,${member.color})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 22, fontWeight: 700,
                    margin: "0 auto 18px",
                    boxShadow: `0 8px 22px ${member.color}35`,
                    fontFamily: "'DM Sans',sans-serif",
                  }}>{member.initials}</div>
                  <div style={{ fontWeight: 700, color: TEXT, fontSize: 16, marginBottom: 4, fontFamily: "'DM Serif Display',Georgia,serif" }}>{member.name}</div>
                  <div style={{ color: member.color, fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: "0.04em", fontFamily: "'DM Sans',sans-serif" }}>{member.role}</div>
                  <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.8, margin: 0, fontFamily: "'DM Sans',sans-serif" }}>{member.bio}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </FadeIn>
      </div>

      <style>{`
        @media(max-width:900px){
          .hero-cols{grid-template-columns:1fr!important;}
        }
      `}</style>
    </section>
  );
}