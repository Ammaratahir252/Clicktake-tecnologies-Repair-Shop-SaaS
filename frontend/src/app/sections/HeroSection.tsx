"use client";

import Link from "next/link";
import {
  Wrench, ArrowRight, Play, Star, TrendingUp, Bot,
  ChevronDown, Sparkles, CheckCircle, Zap,
} from "lucide-react";
import { STATS } from "../data";
import { THEME, HatchBg } from "../../components/theme";

const { BG, BG2, BG3, BORDER, ACCENT, ACCENT2, TEXT, MUTED } = THEME;

export default function HeroSection() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <section style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "130px 40px 110px", position: "relative", overflow: "hidden",
      background: `linear-gradient(160deg,${BG} 0%,${BG3} 60%,#ede8e0 100%)`,
    }}>
      <HatchBg opacity={0.04} />

      {/* Decorative circles */}
      {[520, 380, 240].map((size, i) => (
        <div key={size} style={{
          position: "absolute", top: `${8 + i * 6}%`, right: `${2 + i * 4}%`,
          width: size, height: size, borderRadius: "50%",
          border: `1px solid rgba(29,78,216,${0.06 + i * 0.04})`,
          pointerEvents: "none",
        }} />
      ))}
      {/* Blobs */}
      <div style={{ position: "absolute", top: "-8%", left: "-6%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle,rgba(29,78,216,0.06) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-4%", right: "-4%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(120,83,56,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />

      {/* ── Main Grid ── */}
      <div className="hero-cols" style={{
        maxWidth: 1380, margin: "0 auto", width: "100%",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center",
      }}>

        {/* ── LEFT COPY ── */}
        <div style={{ position: "relative", zIndex: 1 }}>

          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28,
            background: "rgba(29,78,216,0.08)", border: "1px solid rgba(29,78,216,0.2)",
            borderRadius: 999, padding: "9px 20px", animation: "fadeDown 0.6s ease",
          }}>
            <Sparkles size={13} color={ACCENT} />
            <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>
              #1 REPAIR SHOP PLATFORM IN PAKISTAN
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "clamp(44px,5.5vw,78px)", fontWeight: 700,
            letterSpacing: "-2.5px", lineHeight: 1.04, marginBottom: 24,
            animation: "fadeUp 0.7s ease 0.1s both", color: TEXT,
            fontFamily: "'DM Serif Display',Georgia,serif",
          }}>
            Run your repair<br />shop{" "}
            <em style={{
              background: `linear-gradient(90deg,${ACCENT} 0%,#7c3aed 55%,#c2410c 100%)`,
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 5s linear infinite",
              fontStyle: "italic",
            }}>10× smarter.</em>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: "clamp(16px,1.7vw,18px)", color: MUTED, lineHeight: 1.9,
            maxWidth: 500, marginBottom: 36, animation: "fadeUp 0.7s ease 0.2s both",
            fontFamily: "'DM Sans',sans-serif",
          }}>
            From first intake to final delivery — manage tickets, technicians,
            inventory, customers, and drivers from one beautifully designed platform.
            Built for repair shops of every size.
          </p>

          {/* Checkpoints */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 28px", marginBottom: 40, animation: "fadeUp 0.7s ease 0.25s both" }}>
            {["AI Diagnostics", "Live GPS Tracking", "Digital Signatures", "JazzCash & EasyPaisa"].map(item => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <CheckCircle size={14} color={ACCENT} />
                <span style={{ color: MUTED, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{item}</span>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 50, animation: "fadeUp 0.7s ease 0.3s both" }}>
            <Link href="/register" className="btn-blue"
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                color: "#fff", fontWeight: 700, fontSize: 16, textDecoration: "none",
                padding: "17px 34px", borderRadius: 13,
                boxShadow: `0 10px 30px rgba(29,78,216,0.3)`,
                fontFamily: "'DM Sans',sans-serif",
              }}>
              Start for free <ArrowRight size={18} />
            </Link>
            <button onClick={() => scrollTo("howitworks")}
              style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "rgba(255,255,255,0.6)", color: MUTED,
                fontWeight: 700, fontSize: 16,
                border: `1.5px solid ${BORDER}`, cursor: "pointer",
                padding: "17px 34px", borderRadius: 13,
                backdropFilter: "blur(8px)", transition: "all 0.2s",
                fontFamily: "'DM Sans',sans-serif",
              }}>
              <Play size={15} color={ACCENT} fill={ACCENT} /> See how it works
            </button>
          </div>

          {/* Social proof */}
          <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", animation: "fadeUp 0.7s ease 0.4s both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex" }}>
                {["AH", "FM", "UK", "MR", "SR"].map((a, i) => (
                  <div key={a} style={{
                    width: 32, height: 32, borderRadius: "50%",
                    border: `2.5px solid ${BG}`,
                    background: `hsl(${i * 55 + 210},56%,50%)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "#fff", fontWeight: 700,
                    marginLeft: i > 0 ? -9 : 0, zIndex: 5 - i, position: "relative",
                    fontFamily: "'DM Sans',sans-serif",
                  }}>{a[0]}</div>
                ))}
              </div>
              <span style={{ fontSize: 13, color: MUTED, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>500+ shops trust us</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[1, 2, 3, 4, 5].map(s => <Star key={s} size={14} fill="#f59e0b" color="#f59e0b" />)}
              <span style={{ fontSize: 13, color: MUTED, fontWeight: 600, marginLeft: 5, fontFamily: "'DM Sans',sans-serif" }}>4.9 / 5</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Dashboard Mockup ── */}
        <div className="desktop-only" style={{ position: "relative", animation: "fadeUp 0.9s ease 0.2s both" }}>
          <div style={{
            position: "absolute", inset: -30,
            background: "radial-gradient(ellipse,rgba(29,78,216,0.10) 0%,transparent 70%)",
            pointerEvents: "none", borderRadius: "50%",
          }} />

          <div style={{
            background: "#fff", borderRadius: 22, border: `1px solid ${BORDER}`,
            boxShadow: `0 50px 100px rgba(29,78,216,0.12),0 20px 40px rgba(120,83,56,0.08)`,
            overflow: "hidden", animation: "pulse3d 7s ease infinite",
          }}>
            {/* Browser chrome */}
            <div style={{ background: BG3, padding: "12px 18px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#fc5f57" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
              <div style={{ flex: 1, background: "#fff", borderRadius: 6, height: 22, marginLeft: 10, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 11px" }}>
                <span style={{ fontSize: 10, color: MUTED, fontWeight: 500, fontFamily: "'DM Sans',sans-serif" }}>app.dibnow.com/dashboard</span>
              </div>
            </div>

            {/* Dashboard body */}
            <div style={{ padding: 20, background: BG2 }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 2, fontFamily: "'DM Sans',sans-serif" }}>Good morning, Ahmed 👋</div>
                  <div style={{ fontSize: 10, color: MUTED, fontFamily: "'DM Sans',sans-serif" }}>Tuesday, 9 Jun 2026</div>
                </div>
                <div style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, borderRadius: 8, padding: "6px 13px", boxShadow: `0 4px 12px rgba(29,78,216,0.3)` }}>
                  <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>+ New Ticket</span>
                </div>
              </div>

              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginBottom: 16 }}>
                {[
                  { label: "Open",        val: "24",   bg: "#dbeafe", tc: "#1d4ed8", trend: "+3" },
                  { label: "In Progress", val: "11",   bg: "#ede9fe", tc: "#6d28d9", trend: "-1" },
                  { label: "Completed",   val: "87",   bg: "#d1fae5", tc: "#065f46", trend: "+12" },
                  { label: "Revenue",     val: "₨ 3.2K", bg: "#fef3c7", tc: "#92400e", trend: "+24%" },
                ].map(k => (
                  <div key={k.label} style={{ background: k.bg, borderRadius: 10, padding: "10px 9px", border: `1px solid ${k.tc}22` }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: k.tc, lineHeight: 1, fontFamily: "'DM Serif Display',Georgia,serif" }}>{k.val}</div>
                    <div style={{ fontSize: 8, color: MUTED, fontWeight: 600, marginTop: 3, lineHeight: 1.3, fontFamily: "'DM Sans',sans-serif" }}>{k.label}</div>
                    <div style={{ fontSize: 8, color: k.tc, fontWeight: 700, marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>{k.trend}</div>
                  </div>
                ))}
              </div>

              {/* Ticket rows */}
              {[
                { id: "#1042", device: "iPhone 15 Pro", issue: "Screen replacement", status: "In Progress", sc: "#6d28d9", sb: "#ede9fe" },
                { id: "#1041", device: "MacBook Air M2", issue: "Battery swollen",    status: "Pending",     sc: "#92400e", sb: "#fef3c7" },
                { id: "#1040", device: "Samsung S24",    issue: "Water damage",       status: "Completed",   sc: "#065f46", sb: "#d1fae5" },
              ].map(t => (
                <div key={t.id} style={{ background: "#fff", borderRadius: 10, padding: "10px 13px", marginBottom: 7, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Wrench size={13} color={ACCENT} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, fontFamily: "'DM Sans',sans-serif" }}>{t.device}</div>
                      <div style={{ fontSize: 9, color: MUTED, fontFamily: "'DM Sans',sans-serif" }}>{t.id} · {t.issue}</div>
                    </div>
                  </div>
                  <div style={{ background: t.sb, color: t.sc, fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: 20, border: `1px solid ${t.sc}22`, fontFamily: "'DM Sans',sans-serif" }}>{t.status}</div>
                </div>
              ))}

              {/* AI Assistant bar */}
              <div style={{ background: "#ede9fe", borderRadius: 10, padding: "10px 13px", display: "flex", alignItems: "center", gap: 9, border: "1px solid rgba(109,40,217,0.15)", marginTop: 4 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: "#6d28d9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Bot size={13} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6d28d9", fontFamily: "'DM Sans',sans-serif" }}>AI Diagnostic ready</div>
                  <div style={{ fontSize: 8.5, color: MUTED, fontFamily: "'DM Sans',sans-serif" }}>Ask about iPhone 15 Pro screen issue…</div>
                </div>
                <div style={{ marginLeft: "auto", background: "#6d28d9", borderRadius: 6, padding: "4px 10px" }}>
                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>Ask AI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating badge — Revenue */}
          <div style={{ position: "absolute", top: -20, right: -22, background: "#fff", borderRadius: 16, padding: "12px 18px", boxShadow: `0 16px 40px rgba(29,78,216,0.15)`, border: `1px solid ${BORDER}`, animation: "float 3.5s ease infinite" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <TrendingUp size={15} color="#065f46" />
              </div>
              <div>
                <div style={{ fontSize: 9, color: MUTED, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>This Month</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#065f46", fontFamily: "'DM Serif Display',Georgia,serif" }}>+24% ↑</div>
              </div>
            </div>
          </div>

          {/* Floating badge — Zap */}
          <div style={{ position: "absolute", bottom: -14, left: -22, background: "#fff", borderRadius: 14, padding: "11px 16px", boxShadow: `0 16px 40px rgba(109,40,217,0.14)`, border: `1px solid ${BORDER}`, animation: "float2 4s ease infinite" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={13} color="#065f46" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#065f46", fontFamily: "'DM Sans',sans-serif" }}>60% faster repairs ✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "rgba(253,246,238,0.93)", backdropFilter: "blur(20px)",
        borderTop: `1px solid ${BORDER}`, padding: "22px 40px",
      }}>
        <div style={{ maxWidth: 1380, margin: "0 auto", display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 20 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, animation: `fadeUp 0.6s ease ${0.5 + i * 0.1}s both` }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, letterSpacing: "-1px", lineHeight: 1, fontFamily: "'DM Serif Display',Georgia,serif" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, marginTop: 2, fontFamily: "'DM Sans',sans-serif" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll cue */}
      <div style={{ position: "absolute", bottom: 90, left: "50%", animation: "bounceCue 2.2s ease infinite", opacity: 0.3 }}>
        <ChevronDown size={22} color={MUTED} />
      </div>

      <style>{`
        @media(max-width:900px){
          .desktop-only{display:none!important;}
          .hero-cols{grid-template-columns:1fr!important;}
        }
      `}</style>
    </section>
  );
}