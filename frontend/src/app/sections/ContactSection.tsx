"use client";

import { useState } from "react";
import { Mail, Phone, MessageCircle, Loader2, CheckCircle2, AlertTriangle, Send, Sparkles } from "lucide-react";
import { THEME, FadeIn, DotsBg } from "../../components/theme";
import DemoRequestModal from "../../components/DemoRequestModal";
import api from "@/lib/api";

const { BORDER, ACCENT, ACCENT2, TEXT, MUTED } = THEME;

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: MUTED,
  marginBottom: 6,
  fontFamily: "'DM Sans',sans-serif",
};

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const valid = name.trim() && /\S+@\S+\.\S+/.test(email) && message.trim();

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await api.post("/api/public/contact-us", {
        name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(),
      });
      setStatus("success");
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-card" style={{
      background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 24,
      padding: "44px 42px",
      boxShadow: "0 24px 60px rgba(120,83,56,0.10)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -70, right: -60, width: 200, height: 200, background: `radial-gradient(circle,rgba(29,78,216,0.08) 0%,transparent 70%)`, pointerEvents: "none" }} />

      <h3 style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 6, fontFamily: "'DM Serif Display',Georgia,serif", position: "relative" }}>
        Send us a message
      </h3>
      <p style={{ color: MUTED, fontSize: 14, marginBottom: 28, fontFamily: "'DM Sans',sans-serif", position: "relative" }}>
        We read every message and reply within a few hours.
      </p>

      {status === "success" ? (
        <div className="success-pop" style={{ display: "flex", alignItems: "center", gap: 10, background: "#d1fae5", borderRadius: 12, padding: "16px 20px" }}>
          <CheckCircle2 size={20} color="#065f46" />
          <span style={{ color: "#065f46", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
            Message sent — we'll get back to you shortly.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="hero-cols">
            <div>
              <label style={labelStyle}>Name *</label>
              <input className="contact-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              <input className="contact-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Subject</label>
            <input className="contact-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" />
          </div>
          <div>
            <label style={labelStyle}>Message *</label>
            <textarea
              className="contact-input"
              style={{ resize: "vertical", minHeight: 110 }}
              value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us how we can help…"
            />
          </div>

          {status === "error" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px" }}>
              <AlertTriangle size={15} color="#dc2626" />
              <span style={{ color: "#dc2626", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{errorMsg}</span>
            </div>
          )}

          <div>
            <button
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className="btn-blue"
              style={{
                background: valid ? `linear-gradient(135deg,${ACCENT},${ACCENT2})` : "#e7d9c8",
                color: "#fff", fontWeight: 700, fontSize: 15, border: "none",
                cursor: valid && !submitting ? "pointer" : "not-allowed",
                padding: "14px 30px", borderRadius: 12,
                display: "inline-flex", alignItems: "center", gap: 8,
                fontFamily: "'DM Sans',sans-serif",
              }}
            >
              {submitting ? <Loader2 size={16} className="spin-anim" /> : <Send size={15} />}
              {submitting ? "Sending…" : "Send Message"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .spin-anim { animation: spin 1s linear infinite; }
        .success-pop { animation: scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        .contact-input {
          width: 100%; padding: 13px 16px; border-radius: 10px;
          border: 1.5px solid ${BORDER}; font-size: 14px;
          font-family: 'DM Sans',sans-serif; color: ${TEXT};
          background: #fff; outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .contact-input:focus {
          border-color: ${ACCENT};
          box-shadow: 0 0 0 4px rgba(29,78,216,0.12);
        }
        .contact-card { transition: transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s ease; }
        .contact-card:hover { transform: translateY(-4px); box-shadow: 0 32px 72px rgba(120,83,56,0.14); }
      `}</style>
    </div>
  );
}

const FLOATERS = [
  { icon: Mail,          top: "4%",  left: "62%", color: "#1d4ed8", bg: "#dbeafe", anim: "float",  dur: "5s", delay: "0s"   },
  { icon: Phone,         top: "38%", left: "82%", color: "#6d28d9", bg: "#ede9fe", anim: "float2", dur: "6s", delay: "0.6s" },
  { icon: MessageCircle, top: "68%", left: "58%", color: "#0369a1", bg: "#e0f2fe", anim: "float",  dur: "5.5s", delay: "1.1s" },
];

export default function ContactSection() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section id="contact" style={{
      padding: "120px 40px", background: "#fff",
      position: "relative", overflow: "hidden",
    }}>
      <DotsBg opacity={0.04} id="dots-contact" />
      <div style={{ position: "absolute", top: -60, right: "10%", width: 500, height: 400, background: "radial-gradient(ellipse,rgba(29,78,216,0.04) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Split layout: copy left, form right ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="hero-cols">

          {/* Left — heading + copy + decorative floaters */}
          <div style={{ position: "relative" }}>
            {FLOATERS.map(({ icon: Icon, top, left, color, bg, anim, dur, delay }, i) => (
              <div
                key={i}
                className="contact-floater"
                style={{
                  position: "absolute", top, left,
                  width: 56, height: 56, borderRadius: 16,
                  background: bg, border: `1px solid ${color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 10px 26px ${color}22`,
                  animation: `${anim} ${dur} ease-in-out ${delay} infinite`,
                  zIndex: 0,
                }}
              >
                <Icon size={22} color={color} />
              </div>
            ))}

            <FadeIn>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 22, background: "rgba(29,78,216,0.08)", border: "1px solid rgba(29,78,216,0.18)", borderRadius: 999, padding: "9px 20px" }}>
                  <Sparkles size={12} color={ACCENT} />
                  <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>WE'D LOVE TO HEAR FROM YOU</span>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.08}>
              <h2 style={{ position: "relative", zIndex: 1, fontSize: "clamp(38px,5vw,62px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.05, marginBottom: 22, fontFamily: "'DM Serif Display',Georgia,serif" }}>
                Get in touch
              </h2>
            </FadeIn>

            <FadeIn delay={0.16}>
              <p style={{ position: "relative", zIndex: 1, color: MUTED, fontSize: 17, lineHeight: 1.9, maxWidth: 440, fontFamily: "'DM Sans',sans-serif" }}>
                Have questions? Want a live demo? Our team is ready to help you get started — no sales pressure, just real answers.
              </p>
            </FadeIn>

            <FadeIn delay={0.24}>
              <button
                onClick={() => setDemoOpen(true)}
                className="btn-blue"
                style={{
                  position: "relative", zIndex: 1, marginTop: 32,
                  background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                  color: "#fff", fontWeight: 700, fontSize: 15,
                  border: "none", cursor: "pointer", padding: "15px 32px",
                  borderRadius: 12, boxShadow: `0 12px 30px rgba(29,78,216,0.28)`,
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                Book a Demo →
              </button>
            </FadeIn>
          </div>

          {/* Right — form */}
          <FadeIn delay={0.15}>
            <ContactForm />
          </FadeIn>
        </div>
      </div>

      <DemoRequestModal open={demoOpen} onClose={() => setDemoOpen(false)} />

      <style>{`
        .contact-floater { animation-fill-mode: both; }
        @media(max-width:900px){
          .contact-floater { display: none; }
        }
      `}</style>
    </section>
  );
}
