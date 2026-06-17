"use client";

// ─── Dibnow RepairSaaS — Landing Page ─────────────────────────────────────────
// FILE STRUCTURE:
//   app/page.tsx                         ← THIS FILE (entry point, composes all)
//   app/data/index.ts                    ← All static data (features, roles, etc.)
//   app/components/theme.tsx             ← Theme tokens, shared helpers, FadeIn
//   app/sections/Header.tsx              ← Sticky nav with mobile menu
//   app/sections/HeroSection.tsx         ← Hero + dashboard mockup + stats bar
//   app/sections/FeaturesSection.tsx     ← 9-card feature grid
//   app/sections/HowItWorksSection.tsx   ← 5-step repair workflow
//   app/sections/RolesSection.tsx        ← 6 role cards with perks
//   app/sections/TestimonialsSection.tsx ← Customer testimonials
//   app/sections/PricingSection.tsx      ← 3-tier pricing
//   app/sections/AboutSection.tsx        ← Story, values, team
//   app/sections/BlogSection.tsx         ← Featured + 3 blog posts
//   app/sections/FAQSection.tsx          ← Animated accordion FAQ
//   app/sections/CTABanner.tsx           ← Full-width CTA strip
//   app/sections/ContactSection.tsx      ← 6 contact channels + demo booking
//   app/sections/Footer.tsx              ← Multi-col footer with socials

import dynamic from "next/dynamic";
import Header              from "./sections/Header";
import HeroSection         from "./sections/HeroSection";
import { GLOBAL_STYLES }   from ".././components/theme";

// Lazy-load all below-the-fold sections — they are not needed until the user scrolls
const FeaturesSection     = dynamic(() => import("./sections/FeaturesSection"));
const HowItWorksSection   = dynamic(() => import("./sections/how-it-works-section"));
const RolesSection        = dynamic(() => import("./sections/RolesSection"));
const TestimonialsSection = dynamic(() => import("./sections/TestimonialsSection"));
const PricingSection      = dynamic(() => import("./sections/PricingSection"));
const AboutSection        = dynamic(() => import("./sections/AboutSection"));
const FAQSection          = dynamic(() => import("./sections/FAQSection"));
const CTABanner           = dynamic(() => import("./sections/CTABanner"));
const ContactSection      = dynamic(() => import("./sections/ContactSection"));
const Footer              = dynamic(() => import("./sections/footer"));

/* Wave divider helper — keeps page.tsx clean */
const Wave = ({ fill, flip = false }: { fill: string; flip?: boolean }) => (
  <div style={{ lineHeight: 0, transform: flip ? "scaleY(-1)" : "none" }}>
    <svg viewBox="0 0 1440 72" preserveAspectRatio="none" style={{ width: "100%", height: 72, display: "block" }} aria-hidden>
      <path d="M0,36 C360,72 1080,0 1440,36 L1440,72 L0,72 Z" fill={fill} />
    </svg>
  </div>
);

export default function LandingPage() {
  return (
    <>
      {/* ── Google Fonts ── */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet" />

      {/* ── Global styles ── */}
      <style suppressHydrationWarning>{GLOBAL_STYLES}</style>

      {/* ── Page ── */}
      <div style={{ background: "#fdf6ee", color: "#1c1917", overflowX: "hidden" }}>

        {/* Fixed header always on top */}
        <Header />

        {/* ① Hero */}
        <HeroSection />

        {/* ② Features */}
        <Wave fill="#fff" flip />
        <FeaturesSection />

        {/* ③ How It Works */}
        <Wave fill="#f5ede0" />
        <HowItWorksSection />

        {/* ④ Roles */}
        <Wave fill="#fff" flip />
        <RolesSection />

        {/* ⑤ Testimonials */}
        <Wave fill="#f5ede0" />
        <TestimonialsSection />

        {/* ⑥ Pricing */}
        <Wave fill="#f5ede0" />
        <PricingSection />

        {/* ⑦ About */}
        <Wave fill="#f5ede0" flip />
        <AboutSection />

        {/* ⑧ FAQ */}
        <Wave fill="#f5ede0" />
        <FAQSection />

        {/* ⑩ CTA Banner */}
        <Wave fill="#fff" flip />
        <CTABanner />

        {/* ⑪ Contact */}
        <ContactSection />

        {/* ⑫ Footer */}
        <Footer />

      </div>
    </>
  );
}