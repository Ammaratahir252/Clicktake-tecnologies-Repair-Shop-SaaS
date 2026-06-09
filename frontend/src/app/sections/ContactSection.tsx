"use client";

import { Mail, Phone, Globe, MapPin, Clock, MessageCircle } from "lucide-react";
import { THEME, FadeIn, DotsBg } from "../../components/theme";

const { BG2, BORDER, ACCENT, ACCENT2, TEXT, MUTED } = THEME;

const CONTACT_ITEMS = [
  { icon: Mail,           label: "Email Us",      val: "support@dibnow.com",   color: "#1d4ed8", bg: "#dbeafe",  hint: "We reply within 4 hours" },
  { icon: Phone,          label: "Call / WhatsApp",val: "+92 300 DIBNOW1",      color: "#6d28d9", bg: "#ede9fe",  hint: "Mon–Sat, 9 AM–8 PM PKT" },
  { icon: Globe,          label: "Website",       val: "www.dibnow.com",        color: "#065f46", bg: "#d1fae5",  hint: "Docs, blog & status" },
  { icon: MapPin,         label: "Office",        val: "Gulberg III, Lahore",   color: "#c2410c", bg: "#ffedd5",  hint: "Pakistan" },
  { icon: Clock,          label: "Support Hours", val: "Mon–Sat 9 AM–8 PM",     color: "#92400e", bg: "#fef3c7",  hint: "PKT (UTC+5)" },
  { icon: MessageCircle,  label: "Live Chat",     val: "Available in-app",      color: "#0369a1", bg: "#e0f2fe",  hint: "Pro & Enterprise plans" },
];

export default function ContactSection() {
  return (
    <section id="contact" style={{
      padding: "120px 40px", background: "#fff",
      position: "relative", overflow: "hidden",
    }}>
      <DotsBg opacity={0.04} id="dots-contact" />
      <div style={{ position: "absolute", top: -60, right: "10%", width: 500, height: 400, background: "radial-gradient(ellipse,rgba(29,78,216,0.04) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 70 }}>
            <h2 style={{ fontSize: "clamp(34px,5vw,58px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.08, marginBottom: 16, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Get in touch
            </h2>
            <p style={{ color: MUTED, fontSize: 17, lineHeight: 1.85, maxWidth: 460, margin: "0 auto", fontFamily: "'DM Sans',sans-serif" }}>
              Have questions? Want a live demo? Our team is ready to help you get started — no sales pressure.
            </p>
          </div>
        </FadeIn>

        {/* ── Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          {CONTACT_ITEMS.map(({ icon: Icon, label, val, color, bg, hint }, i) => (
            <FadeIn key={label} delay={i * 0.07}>
              <div className="card-lift" style={{
                background: BG2, border: `1px solid ${BORDER}`, borderRadius: 18,
                padding: "32px 26px",
                boxShadow: "0 4px 18px rgba(120,83,56,0.06)",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: -15, right: -10, width: 100, height: 100, background: `radial-gradient(circle,${bg} 0%,transparent 70%)`, pointerEvents: "none", opacity: 0.8 }} />

                <div style={{ width: 50, height: 50, borderRadius: 14, background: bg, border: `1px solid ${color}20`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <Icon size={22} color={color} />
                </div>

                <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>{label}</div>
                <div style={{ fontSize: 15, color: TEXT, fontWeight: 700, marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>{val}</div>
                <div style={{ fontSize: 12, color: MUTED, fontFamily: "'DM Sans',sans-serif" }}>{hint}</div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* ── CTA strip ── */}
        <FadeIn delay={0.3}>
          <div style={{
            marginTop: 60, background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
            borderRadius: 22, padding: "48px 52px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 28,
            boxShadow: `0 24px 60px rgba(29,78,216,0.22)`,
          }}>
            <div>
              <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 26, letterSpacing: "-0.6px", marginBottom: 8, fontFamily: "'DM Serif Display',Georgia,serif" }}>
                Ready for a live demo?
              </h3>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontFamily: "'DM Sans',sans-serif" }}>
                Book a free 20-minute walkthrough with our team. We'll show you everything.
              </p>
            </div>
            <button style={{
              background: "#fff", color: ACCENT, fontWeight: 800, fontSize: 15,
              border: "none", cursor: "pointer", padding: "15px 32px",
              borderRadius: 12, boxShadow: "0 8px 22px rgba(0,0,0,0.18)",
              whiteSpace: "nowrap", fontFamily: "'DM Sans',sans-serif",
              transition: "all 0.2s",
            }}>
              Book a Demo →
            </button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}