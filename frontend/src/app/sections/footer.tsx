"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Wrench, Mail, Phone } from "lucide-react";
import { THEME } from "../../components/theme";
import DemoRequestModal from "../../components/DemoRequestModal";
import { useBranding } from "@/lib/useBranding";

const { ACCENT, ACCENT2 } = THEME;

type FooterLink =
  | { label: string; kind: "anchor"; id: string }
  | { label: string; kind: "link"; href: string }
  | { label: string; kind: "demo" };

const FOOTER_COLS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", kind: "anchor", id: "features" },
      { label: "How It Works", kind: "anchor", id: "howitworks" },
      { label: "Pricing", kind: "anchor", id: "pricing" },
    ],
  },
  {
    heading: "Roles",
    links: [
      { label: "Shop Owners", kind: "anchor", id: "roles" },
      { label: "Managers", kind: "anchor", id: "roles" },
      { label: "Technicians", kind: "anchor", id: "roles" },
      { label: "Front Desk", kind: "anchor", id: "roles" },
      { label: "Drivers", kind: "anchor", id: "roles" },
      { label: "Customers", kind: "anchor", id: "roles" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", kind: "anchor", id: "about" },
      { label: "Shops", kind: "link", href: "/shops" },
      { label: "Contact", kind: "anchor", id: "contact" },
      { label: "Book a Demo", kind: "demo" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", kind: "link", href: "/privacy" },
      { label: "Terms of Service", kind: "link", href: "/terms" },
      { label: "Cookie Policy", kind: "link", href: "/cookie-policy" },
      { label: "GDPR", kind: "link", href: "/gdpr" },
      { label: "Security", kind: "link", href: "/security" },
    ],
  },
];



export default function Footer() {
  const [demoOpen, setDemoOpen] = useState(false);
  const branding = useBranding();
  const companyName = branding.companyName || "Dibnow";

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const linkStyle: React.CSSProperties = {
    color: "#57534e", fontSize: 13, fontWeight: 500, cursor: "pointer",
    transition: "color 0.2s", fontFamily: "'DM Sans',sans-serif",
    background: "none", border: "none", padding: 0, textAlign: "left",
    textDecoration: "none", display: "block", width: "fit-content",
  };

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
                position: "relative", width: 46, height: 46,
                background: branding.logoUrl ? "#fff" : `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                border: branding.logoUrl ? "1px solid rgba(255,255,255,0.15)" : "none",
                borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 6px 18px rgba(29,78,216,0.28)`, flexShrink: 0, overflow: "hidden",
              }}>
                {branding.logoUrl
                  ? <Image src={branding.logoUrl} alt={companyName} fill sizes="46px" style={{ objectFit: "contain" }} />
                  : <Wrench size={20} color="#fff" />}
              </div>
              <div>
                <span style={{ color: "#f5f0e8", fontWeight: 700, fontSize: 20, letterSpacing: "-0.4px", display: "block", fontFamily: "'DM Serif Display',Georgia,serif" }}>{companyName}</span>
                <span style={{ color: ACCENT, fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", display: "block", fontFamily: "'DM Sans',sans-serif" }}>RepairSaaS</span>
              </div>
            </Link>

            <p style={{ color: "#57534e", fontSize: 13, lineHeight: 1.9, maxWidth: 280, marginBottom: 22, fontFamily: "'DM Sans',sans-serif" }}>
              The all-in-one platform for modern repair shops. Built with love for technicians, managers, and customers across Pakistan & beyond.
            </p>

            {/* Contact quick */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
              <a href="mailto:support@dibnow.com" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
                <Mail size={13} color="#57534e" />
                <span style={{ color: "#57534e", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>support@dibnow.com</span>
              </a>
              <a href="tel:+92300" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
                <Phone size={13} color="#57534e" />
                <span style={{ color: "#57534e", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>+92 300 DIBNOW1</span>
              </a>
            </div>

            {/* Socials */}
            
          </div>

          {/* Link cols */}
          {FOOTER_COLS.map(col => (
            <div key={col.heading}>
              <h4 style={{ color: "#d6cdc4", fontWeight: 700, fontSize: 13, marginBottom: 22, letterSpacing: "0.04em", fontFamily: "'DM Serif Display',Georgia,serif" }}>
                {col.heading}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                {col.links.map(l => {
                  const commonProps = {
                    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => ((e.currentTarget as HTMLElement).style.color = "#d6cdc4"),
                    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => ((e.currentTarget as HTMLElement).style.color = "#57534e"),
                  };

                  if (l.kind === "link") {
                    return (
                      <Link key={l.label} href={l.href} style={linkStyle} {...commonProps}>
                        {l.label}
                      </Link>
                    );
                  }
                  if (l.kind === "demo") {
                    return (
                      <button key={l.label} onClick={() => setDemoOpen(true)} style={linkStyle} {...commonProps}>
                        {l.label}
                      </button>
                    );
                  }
                  return (
                    <button key={l.label} onClick={() => scrollTo(l.id)} style={linkStyle} {...commonProps}>
                      {l.label}
                    </button>
                  );
                })}
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

      <DemoRequestModal open={demoOpen} onClose={() => setDemoOpen(false)} />

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
