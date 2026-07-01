"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { THEME, FadeIn, HatchBg, DotsBg } from "../../components/theme";

const { ACCENT, ACCENT2 } = THEME;

export default function CTABanner() {
  return (
    <section style={{ padding: "100px 40px", background: "#fff", position: "relative", overflow: "hidden" }}>
      <DotsBg opacity={0.04} id="dots-cta" />
      <FadeIn>
        <div style={{
          maxWidth: 1100, margin: "0 auto", textAlign: "center",
          background: `linear-gradient(135deg,${ACCENT} 0%,${ACCENT2} 100%)`,
          borderRadius: 28, padding: "90px 60px",
          position: "relative", overflow: "hidden",
          boxShadow: `0 40px 100px rgba(29,78,216,0.28)`,
        }}>
          {/* Rings */}
          {[400, 280].map((size, i) => (
            <div key={size} style={{ position: "absolute", top: `${-size / 2 + 40 * i}px`, right: `${-size / 2 + 40 * i}px`, width: size, height: size, borderRadius: "50%", border: `1px solid rgba(255,255,255,${0.08 + i * 0.05})`, pointerEvents: "none" }} />
          ))}
          <div style={{ position: "absolute", bottom: -80, left: -60, width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <HatchBg opacity={0.06} />

          <div style={{ position: "relative" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "9px 20px" }}>
              <Zap size={13} color="#fef3c7" />
              <span style={{ color: "#fef3c7", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>START TODAY — NO CREDIT CARD NEEDED</span>
            </div>

            <h2 style={{ color: "#fff", fontWeight: 700, fontSize: "clamp(34px,5vw,60px)", letterSpacing: "-1.8px", lineHeight: 1.08, marginBottom: 18, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Ready to modernize<br />your repair shop?
            </h2>

            <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 18, lineHeight: 1.85, maxWidth: 480, margin: "0 auto 48px", fontFamily: "'DM Sans',sans-serif" }}>
              Join 500+ repair shops already using DibnowRepairSaaS to deliver faster, smarter repairs.
            </p>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link href="/register"
                style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#fff", color: ACCENT, fontWeight: 800, fontSize: 16, textDecoration: "none", padding: "17px 38px", borderRadius: 13, boxShadow: "0 12px 36px rgba(0,0,0,0.18)", fontFamily: "'DM Sans',sans-serif" }}>
                Create free account <ArrowRight size={17} />
              </Link>
              <Link href="/login"
                style={{ color: "rgba(255,255,255,0.72)", fontWeight: 700, fontSize: 15, textDecoration: "none", display: "flex", alignItems: "center", gap: 7, fontFamily: "'DM Sans',sans-serif" }}>
                Already have an account <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}