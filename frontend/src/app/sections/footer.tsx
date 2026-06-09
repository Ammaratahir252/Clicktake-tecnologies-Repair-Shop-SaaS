"use client";

import Link from "next/link";
import { Wrench, X,  Mail, Phone } from "lucide-react";
import { THEME } from "../../components/theme";

const { ACCENT, ACCENT2 } = THEME;

const FOOTER_COLS = [
  {
    heading: "Product",
    links: ["Features", "How It Works", "Pricing", "Changelog", "Roadmap", "Status Page"],
  },
  {
    heading: "Roles",
    links: ["Shop Owners", "Managers", "Technicians", "Front Desk", "Drivers", "Customers"],
  },
  {
    heading: "Company",
    links: ["About Us", "Blog", "Careers", "Press Kit", "Partners", "Contact"],
  },
  {
    heading: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR", "Security"],
  },
];

const SOCIAL = [
  { icon: X,         label: "Twitter / X" },
  
];

export default function Footer() {
  return (
    <footer style={{ background: "#1c1917", padding: "80px 40px 36px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ maxWidth: 1380, margin: "0 auto" }}>

        {/* ── Top ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1fr",
          gap: 48,
          marginBottom: 64,
          paddingBottom: 64,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }} className="footer-grid">

          {/* Brand col */}
          <div>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", marginBottom: 20 }}>
              <div style={{
                width: 46, height: 46,
                background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 6px 18px rgba(29,78,216,0.28)`, flexShrink: 0,
              }}>
                <Wrench size={20} color="#fff" />
              </div>
              <div>
                <span style={{ color: "#f5f0e8", fontWeight: 700, fontSize: 20, letterSpacing: "-0.4px", display: "block", fontFamily: "'DM Serif Display',Georgia,serif" }}>Dibnow</span>
                <span style={{ color: ACCENT, fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", display: "block", fontFamily: "'DM Sans',sans-serif" }}>RepairSaaS</span>
              </div>
            </Link>

            <p style={{ color: "#57534e", fontSize: 13, lineHeight: 1.9, maxWidth: 280, marginBottom: 22, fontFamily: "'DM Sans',sans-serif" }}>
              The all-in-one platform for modern repair shops. Built with love for technicians, managers, and customers across Pakistan & beyond.
            </p>

            {/* Contact quick */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Mail size={13} color="#57534e" />
                <span style={{ color: "#57534e", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>support@dibnow.com</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <Phone size={13} color="#57534e" />
                <span style={{ color: "#57534e", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>+92 300 DIBNOW1</span>
              </div>
            </div>

            {/* Socials */}
            <div style={{ display: "flex", gap: 9 }}>
              {SOCIAL.map(({ icon: Icon, label }) => (
                <button key={label} aria-label={label} style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#57534e",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)";
                    (e.currentTarget as HTMLElement).style.color = "#d6cdc4";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.color = "#57534e";
                  }}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {FOOTER_COLS.map(col => (
            <div key={col.heading}>
              <h4 style={{ color: "#d6cdc4", fontWeight: 700, fontSize: 13, marginBottom: 22, letterSpacing: "0.04em", fontFamily: "'DM Serif Display',Georgia,serif" }}>
                {col.heading}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {col.links.map(l => (
                  <span
                    key={l}
                    style={{ color: "#57534e", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "color 0.2s", fontFamily: "'DM Sans',sans-serif" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#d6cdc4")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#57534e")}
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <span style={{ color: "#44403c", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>
            © 2026 DibnowRepairSaaS by Clicktake Technologies. All rights reserved.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            <span style={{ color: "#44403c", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>Made with ❤️ in Pakistan</span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
              <span style={{ color: "#44403c", fontSize: 11, fontFamily: "'DM Sans',sans-serif" }}>All systems operational</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:900px){
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media(max-width:600px){
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  );
}