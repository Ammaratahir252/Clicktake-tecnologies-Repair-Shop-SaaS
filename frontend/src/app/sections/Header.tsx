"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wrench, Menu, X, ChevronDown } from "lucide-react";
import { NAV_LINKS } from "../data";
import { THEME } from "../../components/theme";

const { BG, BORDER, ACCENT, ACCENT2, TEXT, MUTED } = THEME;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled]   = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? `rgba(253,246,238,0.97)` : `rgba(253,246,238,0.80)`,
      backdropFilter: "blur(24px)",
      borderBottom: scrolled ? `1px solid ${BORDER}` : "1px solid transparent",
      transition: "all 0.3s ease",
      boxShadow: scrolled ? "0 2px 40px rgba(120,83,56,0.10)" : "none",
    }}>
      <div style={{
        maxWidth: 1380, margin: "0 auto", padding: "0 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 80,
      }}>

        {/* ── Logo ── */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <div style={{
            width: 46, height: 46,
            background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
            borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 6px 20px rgba(29,78,216,0.28)`, transform: "rotate(-4deg)",
            flexShrink: 0,
          }}>
            <Wrench size={20} color="#fff" />
          </div>
          <div>
            <span style={{
              fontFamily: "'DM Serif Display',Georgia,serif",
              color: TEXT, fontWeight: 700, fontSize: 22, letterSpacing: "-0.5px",
              display: "block", lineHeight: 1.1,
            }}>Dibnow</span>
            <span style={{
              color: ACCENT, fontSize: 9, fontWeight: 700,
              letterSpacing: "0.24em", textTransform: "uppercase",
              display: "block", fontFamily: "'DM Sans',sans-serif",
            }}>RepairSaaS</span>
          </div>
        </Link>

        {/* ── Desktop Nav ── */}
        <nav className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {NAV_LINKS.map(l => (
            <button key={l.label} onClick={() => scrollTo(l.href)}
              className="nav-btn"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: MUTED, fontWeight: 600, fontSize: 14,
                padding: "8px 14px", borderRadius: 9,
                transition: "color 0.2s", fontFamily: "'DM Sans',sans-serif",
              }}>
              {l.label}
            </button>
          ))}
        </nav>

        {/* ── Desktop CTA ── */}
        <div className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/login"
            style={{
              color: MUTED, fontWeight: 600, fontSize: 13, textDecoration: "none",
              padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${BORDER}`,
              transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif",
              background: "transparent",
            }}>
            Sign In
          </Link>
          <Link href="/register" className="btn-blue"
            style={{
              background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
              color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none",
              padding: "10px 22px", borderRadius: 9,
              boxShadow: `0 6px 20px rgba(29,78,216,0.28)`,
              fontFamily: "'DM Sans',sans-serif",
            }}>
            Get Started Free →
          </Link>
        </div>

        {/* ── Mobile Hamburger ── */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ background: "none", border: "none", cursor: "pointer", color: TEXT, padding: 6, display: "none" }}
          className="mobile-menu-btn"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div style={{
          background: BG, borderTop: `1px solid ${BORDER}`,
          padding: "16px 24px 28px",
          boxShadow: "0 16px 48px rgba(120,83,56,0.10)",
        }}>
          {NAV_LINKS.map(l => (
            <button key={l.label} onClick={() => scrollTo(l.href)}
              style={{
                display: "block", width: "100%", background: "none", border: "none",
                cursor: "pointer", color: MUTED, fontWeight: 600, fontSize: 16,
                padding: "12px 0", textAlign: "left",
                borderBottom: `1px solid ${BORDER}`,
                fontFamily: "'DM Sans',sans-serif",
              }}>
              {l.label}
            </button>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
            <Link href="/login" style={{
              flex: 1, textAlign: "center", color: MUTED, fontWeight: 600, fontSize: 14,
              textDecoration: "none", padding: "13px 0", borderRadius: 10,
              border: `1.5px solid ${BORDER}`, fontFamily: "'DM Sans',sans-serif",
            }}>Sign In</Link>
            <Link href="/register" style={{
              flex: 1, textAlign: "center",
              background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
              color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none",
              padding: "13px 0", borderRadius: 10, fontFamily: "'DM Sans',sans-serif",
            }}>Get Started</Link>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:900px){
          .desktop-only{display:none!important;}
          .mobile-menu-btn{display:block!important;}
        }
      `}</style>
    </header>
  );
}