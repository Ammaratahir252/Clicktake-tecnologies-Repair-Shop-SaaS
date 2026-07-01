"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { FAQS } from "../data";
import { THEME, FadeIn, HatchBg } from "../../components/theme";

const { BG3, BORDER, ACCENT, TEXT, MUTED } = THEME;

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" style={{
      padding: "140px 40px", background: BG3,
      position: "relative", overflow: "hidden",
    }}>
      <HatchBg opacity={0.03} />

      <div style={{ maxWidth: 860, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 70 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, background: "#dbeafe", border: "1px solid rgba(29,78,216,0.2)", borderRadius: 999, padding: "9px 20px" }}>
              <HelpCircle size={12} color={ACCENT} />
              <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>FREQUENTLY ASKED</span>
            </div>
            <h2 style={{ fontSize: "clamp(36px,5vw,60px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.08, marginBottom: 18, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Got questions?<br />We've got answers.
            </h2>
            <p style={{ color: MUTED, fontSize: 17, maxWidth: 460, margin: "0 auto", lineHeight: 1.9, fontFamily: "'DM Sans',sans-serif" }}>
              Everything you need to know before getting started. Can't find what you're looking for? Drop us a message.
            </p>
          </div>
        </FadeIn>

        {/* ── Accordion ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <FadeIn key={i} delay={i * 0.06}>
                <div style={{
                  background: "#fff",
                  border: `1.5px solid ${isOpen ? ACCENT + "40" : BORDER}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: isOpen ? `0 8px 28px rgba(29,78,216,0.10)` : "0 2px 10px rgba(120,83,56,0.04)",
                  transition: "all 0.25s ease",
                }}>
                  {/* Question row */}
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "22px 26px",
                      background: "none", border: "none", cursor: "pointer",
                      textAlign: "left", gap: 16,
                    }}
                  >
                    <span style={{
                      color: isOpen ? ACCENT : TEXT, fontWeight: 700, fontSize: 16,
                      lineHeight: 1.45, flex: 1,
                      fontFamily: "'DM Sans',sans-serif",
                      transition: "color 0.2s",
                    }}>
                      {faq.q}
                    </span>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: isOpen ? ACCENT : "#f5f0e8",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.25s ease",
                      border: `1px solid ${isOpen ? "transparent" : BORDER}`,
                    }}>
                      {isOpen
                        ? <ChevronUp size={17} color="#fff" />
                        : <ChevronDown size={17} color={MUTED} />}
                    </div>
                  </button>

                  {/* Answer */}
                  <div style={{
                    maxHeight: isOpen ? 400 : 0,
                    overflow: "hidden",
                    transition: "max-height 0.35s cubic-bezier(0.22,1,0.36,1)",
                  }}>
                    <div style={{
                      padding: "0 26px 24px",
                      borderTop: `1px solid ${BORDER}`,
                      paddingTop: 20,
                    }}>
                      <p style={{
                        color: MUTED, fontSize: 15, lineHeight: 1.9, margin: 0,
                        fontFamily: "'DM Sans',sans-serif",
                      }}>
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>

        {/* ── Still have questions ── */}
        <FadeIn delay={0.3}>
          <div style={{
            marginTop: 60, textAlign: "center",
            background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 20,
            padding: "42px 36px",
            boxShadow: "0 4px 20px rgba(120,83,56,0.06)",
          }}>
            <h3 style={{ color: TEXT, fontWeight: 700, fontSize: 22, marginBottom: 10, fontFamily: "'DM Serif Display',Georgia,serif" }}>Still have questions?</h3>
            <p style={{ color: MUTED, fontSize: 15, marginBottom: 26, fontFamily: "'DM Sans',sans-serif" }}>
              Our team replies within a few hours on weekdays. We're happy to give you a live walkthrough.
            </p>
            <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={{ background: `linear-gradient(135deg,${ACCENT},#1e3a8a)`, color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", padding: "13px 28px", borderRadius: 10, fontFamily: "'DM Sans',sans-serif", boxShadow: `0 8px 22px rgba(29,78,216,0.26)` }}
                onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}>
                Contact our team
              </button>
              <button style={{ background: "none", color: MUTED, fontWeight: 600, fontSize: 14, border: `1.5px solid ${BORDER}`, cursor: "pointer", padding: "13px 28px", borderRadius: 10, fontFamily: "'DM Sans',sans-serif" }}>
                Browse docs
              </button>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}