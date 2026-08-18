"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { Store, MapPin, ArrowRight, Search, Loader2 } from "lucide-react";
import Header from "../sections/Header";
import { THEME, GLOBAL_STYLES } from "../../components/theme";
import api from "@/lib/api";

const Footer = dynamic(() => import("../sections/footer"));

const { BORDER, ACCENT, ACCENT2, TEXT, MUTED } = THEME;

interface PublicShop {
  _id: string;
  name: string;
  subdomain: string;
  logo?: string;
  tagline?: string;
  city?: string;
  description?: string;
}

export default function ShopsPage() {
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/api/public/shops")
      .then((res) => setShops(res.data?.data ?? []))
      .catch(() => setShops([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      (s.city || "").toLowerCase().includes(q) ||
      (s.tagline || "").toLowerCase().includes(q)
    );
  }, [shops, search]);

  return (
    <>
      {/* Google Fonts now loaded once in app/layout.tsx's <head> instead of here. */}
      <style suppressHydrationWarning>{GLOBAL_STYLES}</style>

      <div style={{ background: "#fdf6ee", color: "#1c1917", overflowX: "hidden", minHeight: "100vh" }}>
        <Header />

        <section style={{ padding: "160px 40px 60px", background: "#fdf6ee" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20, background: "#dbeafe", border: "1px solid rgba(29,78,216,0.2)", borderRadius: 999, padding: "9px 20px" }}>
              <Store size={12} color={ACCENT} />
              <span style={{ color: ACCENT, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>SHOP DIRECTORY</span>
            </div>
            <h1 style={{ fontSize: "clamp(36px,5vw,58px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.08, marginBottom: 18, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Browse repair shops<br />already on the platform.
            </h1>
            <p style={{ color: MUTED, fontSize: 17, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.85, fontFamily: "'DM Sans',sans-serif" }}>
              Every shop below chose to be listed here. Visit their page to see services, hours, and reviews.
            </p>

            <div style={{ position: "relative", maxWidth: 440, margin: "0 auto" }}>
              <Search size={16} color={MUTED} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by shop name or city…"
                style={{
                  width: "100%", padding: "13px 16px 13px 44px", borderRadius: 999,
                  border: `1.5px solid ${BORDER}`, fontSize: 14, fontFamily: "'DM Sans',sans-serif",
                  color: TEXT, background: "#fff", outline: "none",
                }}
              />
            </div>
          </div>
        </section>

        <section style={{ padding: "0 40px 140px", background: "#fdf6ee" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "60px 0", color: MUTED, fontFamily: "'DM Sans',sans-serif" }}>
                <Loader2 size={18} className="spin-anim" /> Loading shops…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: MUTED, fontSize: 16, fontFamily: "'DM Sans',sans-serif" }}>
                  {shops.length === 0
                    ? "No shops have opted into the public directory yet — check back soon!"
                    : "No shops match your search."}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 22 }}>
                {filtered.map((shop) => (
                  <Link key={shop._id} href={`/shop/${shop.subdomain}`} className="card-lift" style={{
                    display: "block", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 20,
                    padding: "30px 26px", textDecoration: "none",
                    boxShadow: "0 4px 20px rgba(120,83,56,0.06)", height: "100%",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                      <div style={{
                        position: "relative", width: 52, height: 52, borderRadius: 14, background: "#eff6ff", border: `1px solid ${ACCENT}22`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden",
                      }}>
                        {shop.logo
                          ? <Image src={shop.logo} alt={shop.name} fill sizes="52px" style={{ objectFit: "cover" }} />
                          : <Store size={22} color={ACCENT} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h3 style={{ color: TEXT, fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px", fontFamily: "'DM Serif Display',Georgia,serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shop.name}</h3>
                        {shop.city && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <MapPin size={11} color={MUTED} />
                            <span style={{ fontSize: 12, color: MUTED, fontFamily: "'DM Sans',sans-serif" }}>{shop.city}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: "'DM Sans',sans-serif", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {shop.tagline || shop.description || "A repair shop on DibnowRepairSaaS."}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, color: ACCENT, fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>
                      Visit Shop <ArrowRight size={14} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <Footer />
      </div>

      <style>{`.spin-anim{animation:spin 1s linear infinite;}`}</style>
    </>
  );
}
