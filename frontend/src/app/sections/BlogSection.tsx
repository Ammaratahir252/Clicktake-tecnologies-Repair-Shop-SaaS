"use client";

import { BookOpen, ArrowRight, Clock } from "lucide-react";
import { BLOG_POSTS } from "../data";
import { THEME, FadeIn, DotsBg } from "../../components/theme";

const { BG2, BORDER, ACCENT, ACCENT2, TEXT, MUTED } = THEME;

export default function BlogSection() {
  return (
    <section id="blog" style={{
      padding: "140px 40px", background: "#fff",
      position: "relative", overflow: "hidden",
    }}>
      <DotsBg opacity={0.04} id="dots-blog" />

      <div style={{ maxWidth: 1380, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <FadeIn>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 70 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18, background: "#fef3c7", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 999, padding: "8px 18px" }}>
                <BookOpen size={12} color="#d97706" />
                <span style={{ color: "#d97706", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>FROM THE BLOG</span>
              </div>
              <h2 style={{ fontSize: "clamp(34px,4.5vw,60px)", fontWeight: 700, color: TEXT, letterSpacing: "-2px", lineHeight: 1.1, fontFamily: "'DM Serif Display',Georgia,serif" }}>
                Insights for repair<br />shop owners.
              </h2>
            </div>
            <button style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              color: ACCENT, fontWeight: 700, fontSize: 14, background: "none",
              border: `1.5px solid rgba(29,78,216,0.2)`, cursor: "pointer",
              padding: "12px 24px", borderRadius: 10,
              fontFamily: "'DM Sans',sans-serif",
            }}>
              View all posts <ArrowRight size={16} />
            </button>
          </div>
        </FadeIn>

        {/* ── Featured Post ── */}
        <FadeIn delay={0.1}>
          <div className="card-lift" style={{
            background: `linear-gradient(135deg,${ACCENT} 0%,${ACCENT2} 100%)`,
            borderRadius: 22, padding: "50px 48px",
            marginBottom: 28,
            boxShadow: `0 24px 60px rgba(29,78,216,0.22)`,
            position: "relative", overflow: "hidden",
          }}>
            {/* Decorative */}
            <div style={{ position: "absolute", top: -40, right: -40, width: 300, height: 300, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: -10, right: -10, width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", pointerEvents: "none" }} />

            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "5px 14px", borderRadius: 8, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>
                  {BLOG_POSTS[0].category}
                </span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 5 }}>
                  <Clock size={12} /> {BLOG_POSTS[0].readTime}
                </span>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>{BLOG_POSTS[0].date}</span>
              </div>
              <h3 style={{ color: "#fff", fontWeight: 700, fontSize: "clamp(22px,3vw,34px)", letterSpacing: "-1px", lineHeight: 1.2, marginBottom: 16, maxWidth: 680, fontFamily: "'DM Serif Display',Georgia,serif" }}>
                {BLOG_POSTS[0].title}
              </h3>
              <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 15, lineHeight: 1.9, maxWidth: 600, marginBottom: 28, fontFamily: "'DM Sans',sans-serif" }}>
                {BLOG_POSTS[0].excerpt}
              </p>
              <button style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700, fontSize: 14, border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer", padding: "13px 26px", borderRadius: 10, fontFamily: "'DM Sans',sans-serif" }}>
                Read article <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </FadeIn>

        {/* ── Other Posts ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 24 }}>
          {BLOG_POSTS.slice(1).map((post, i) => (
            <FadeIn key={post.title} delay={i * 0.09}>
              <div className="card-lift" style={{
                background: BG2, border: `1px solid ${BORDER}`, borderRadius: 20,
                padding: "32px 30px 36px", height: "100%",
                boxShadow: "0 4px 18px rgba(120,83,56,0.06)",
                position: "relative", overflow: "hidden", cursor: "pointer",
              }}>
                {/* Category glow */}
                <div style={{ position: "absolute", top: -20, right: -10, width: 120, height: 120, background: `radial-gradient(circle,${post.bg} 0%,transparent 70%)`, pointerEvents: "none", opacity: 0.7 }} />

                {/* Category chip */}
                <div style={{ display: "inline-block", background: post.bg, color: post.color, fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 7, border: `1px solid ${post.color}25`, marginBottom: 18, letterSpacing: "0.06em", fontFamily: "'DM Sans',sans-serif" }}>
                  {post.category}
                </div>

                <h3 style={{ color: TEXT, fontWeight: 700, fontSize: 17, letterSpacing: "-0.3px", lineHeight: 1.4, marginBottom: 12, fontFamily: "'DM Serif Display',Georgia,serif" }}>
                  {post.title}
                </h3>

                <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.85, marginBottom: 20, fontFamily: "'DM Sans',sans-serif" }}>
                  {post.excerpt}
                </p>

                {/* Meta */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg,${post.color}70,${post.color})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>{post.initials}</div>
                    <span style={{ color: MUTED, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>{post.date}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: MUTED, fontSize: 12, fontFamily: "'DM Sans',sans-serif" }}>
                    <Clock size={12} /> {post.readTime}
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}