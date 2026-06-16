// ─── THEME TOKENS ─────────────────────────────────────────────────────────────
export const THEME = {
  BG:      "#fdf6ee",   // warm cream
  BG2:     "#fef9f3",   // lighter cream
  BG3:     "#f5ede0",   // slightly darker cream
  DARK:    "#1c1917",   // footer / dark bg
  ACCENT:  "#1d4ed8",   // deep blue
  ACCENT2: "#1e3a8a",   // darker blue
  TEXT:    "#1c1917",
  MUTED:   "#78716c",
  BORDER:  "#e7d9c8",
} as const;

// ─── SHARED CSS ───────────────────────────────────────────────────────────────
export const GLOBAL_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', system-ui, sans-serif; background: #fdf6ee; }
  h1,h2,h3,h4,.serif { font-family: 'DM Serif Display', Georgia, serif; }
  @keyframes fadeUp   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
  @keyframes fadeDown { from { opacity:0; transform:translateY(-16px) } to { opacity:1; transform:translateY(0) } }
  @keyframes float    { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-10px) } }
  @keyframes float2   { 0%,100%{ transform:translateY(0) rotate(-1deg) } 50%{ transform:translateY(-8px) rotate(1deg) } }
  @keyframes pulse3d  { 0%,100%{ transform:perspective(1100px) rotateY(-7deg) rotateX(2deg) } 50%{ transform:perspective(1100px) rotateY(-3deg) rotateX(0deg) } }
  @keyframes shimmer  { 0%{ background-position:200% center } 100%{ background-position:-200% center } }
  @keyframes bounceCue{ 0%,100%{ transform:translateX(-50%) translateY(0) } 50%{ transform:translateX(-50%) translateY(8px) } }
  @keyframes spin     { to { transform:rotate(360deg) } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(-20px) } to { opacity:1; transform:translateX(0) } }
  @keyframes scaleIn  { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
  .card-lift { transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease; }
  .card-lift:hover { transform: translateY(-8px) scale(1.015); box-shadow: 0 28px 56px rgba(29,78,216,0.14) !important; }
  .btn-blue { transition: all 0.22s ease; }
  .btn-blue:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(29,78,216,0.35) !important; }
  .btn-outline:hover { background: rgba(29,78,216,0.07) !important; }
  .nav-btn:hover { color: #1d4ed8 !important; }
  @media(max-width:900px){
    .hero-cols { grid-template-columns: 1fr !important; }
    .desktop-only { display: none !important; }
    .footer-grid { grid-template-columns: 1fr 1fr !important; }
  }
  ::selection { background: #bfdbfe; color: #1e3a8a; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #fdf6ee; }
  ::-webkit-scrollbar-thumb { background: #e7d9c8; border-radius: 99px; }
`;

// ─── BACKGROUND HELPERS ───────────────────────────────────────────────────────
export const HatchBg = ({ opacity = 0.045 }: { opacity?: number }) => (
  <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity }} aria-hidden>
    <defs>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="40" height="40">
        <path d="M0 40L40 0M-5 5L5-5M35 45L45 35" stroke="#78350f" strokeWidth="0.8" fill="none"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hatch)"/>
  </svg>
);

export const DotsBg = ({ opacity = 0.08, id = "dots" }: { opacity?: number; id?: string }) => (
  <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity }} aria-hidden>
    <defs>
      <pattern id={id} patternUnits="userSpaceOnUse" width="24" height="24">
        <circle cx="1.5" cy="1.5" r="1.5" fill="#92400e"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`}/>
  </svg>
);

export const WaveDivider = ({ flip = false, fill = "#fdf6ee" }: { flip?: boolean; fill?: string }) => (
  <div style={{ lineHeight:0, transform:flip?"scaleY(-1)":"none" }}>
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width:"100%",height:80,display:"block" }} aria-hidden>
      <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill={fill}/>
    </svg>
  </div>
);

// ─── FADE-IN HOOK ─────────────────────────────────────────────────────────────
import { useRef, useState, useEffect } from "react";

export function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setInView(true);
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}

export function FadeIn({ children, delay = 0, className = "" }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className={className} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(36px)",
      transition: `opacity 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}