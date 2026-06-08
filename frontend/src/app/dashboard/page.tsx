
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Wrench, Menu, X, ArrowRight, CheckCircle, Zap, Shield,
  BarChart3, Truck, Clock, Users, Star, ChevronDown,
  Ticket, Bot, Package, Store, MonitorSmartphone,
  Key, HeartHandshake, Play, Globe, Phone, Mail,
  TrendingUp, Award, Sparkles
} from "lucide-react";

function useInView(threshold = 0.1) {
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

function FadeIn({ children, delay = 0, className = "" }: {
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

const NAV_LINKS = [
  { label: "Features", href: "features" },
  { label: "Roles",    href: "roles"    },
  { label: "Pricing",  href: "pricing"  },
  { label: "Contact",  href: "contact"  },
];

const FEATURES = [
  { icon: Ticket,    color: "#1d4ed8", bg: "#dbeafe", title: "Smart Ticket Management",  desc: "Create, assign, and track every repair ticket from intake to delivery. Real-time status keeps your whole team in sync." },
  { icon: Bot,       color: "#6d28d9", bg: "#ede9fe", title: "AI Diagnostics",           desc: "GPT-4o-powered assistant helps technicians identify issues 60% faster with RAG-enhanced knowledge base.", badge: "AI" },
  { icon: Truck,     color: "#c2410c", bg: "#ffedd5", title: "Live Delivery Tracking",   desc: "End-to-end pickup & delivery with real-time GPS tracking for customers and drivers. Automated notifications." },
  { icon: Package,   color: "#065f46", bg: "#d1fae5", title: "Inventory Control",        desc: "Track parts, manage stock levels, get low-stock alerts. Barcode scanning and supplier management built in." },
  { icon: BarChart3, color: "#92400e", bg: "#fef3c7", title: "Analytics & Reports",      desc: "Revenue reports, technician performance, SLA tracking — all insights you need to grow your shop." },
  { icon: Shield,    color: "#be123c", bg: "#ffe4e6", title: "Role-Based Access",        desc: "Granular permissions for every role. Owners, managers, technicians, front desk, drivers, customers — full audit." },
];

const ROLES = [
  { icon: Store,             color: "#1d4ed8", bg: "#dbeafe", label: "Owner",      desc: "Full control over shop, team, and revenue analytics.", perks: ["Full dashboard", "Revenue reports", "Team management", "Multi-location"] },
  { icon: Key,               color: "#6d28d9", bg: "#ede9fe", label: "Manager",    desc: "Oversee operations, tickets, and inventory with smart tools.", perks: ["Ticket oversight", "Staff scheduling", "Inventory", "SLA monitoring"] },
  { icon: MonitorSmartphone, color: "#065f46", bg: "#d1fae5", label: "Front Desk", desc: "Handle intake, create tickets, process payments effortlessly.", perks: ["Customer intake", "Payments", "Ticket creation", "Print receipts"] },
  { icon: Wrench,            color: "#92400e", bg: "#fef3c7", label: "Technician", desc: "Get assigned tickets, log time, run AI diagnostics.", perks: ["Assigned queue", "Time logging", "AI diagnostics", "Parts requests"] },
  { icon: Truck,             color: "#c2410c", bg: "#ffedd5", label: "Driver",     desc: "Manage pickup & delivery with GPS and live comms.", perks: ["Job queue", "GPS navigation", "Customer contact", "Delivery confirm"] },
  { icon: HeartHandshake,    color: "#0369a1", bg: "#e0f2fe", label: "Customer",   desc: "Track repairs, sign estimates digitally, pay from anywhere.", perks: ["Repair tracking", "Digital sign", "Online payments", "History"] },
];

const STATS = [
  { value: "10K+", label: "Repairs Tracked",      icon: Ticket },
  { value: "98%",  label: "Customer Satisfaction", icon: Star   },
  { value: "6",    label: "Roles Supported",       icon: Users  },
  { value: "24/7", label: "Real-time Updates",     icon: Clock  },
];

const PRICING = [
  {
    name: "Starter", price: "$29", period: "/mo",
    desc: "Perfect for small shops just getting started.",
    features: ["Up to 5 staff accounts","Ticket management","Customer portal","Inventory basics","Email support","Mobile app"],
    cta: "Get Started Free", popular: false,
  },
  {
    name: "Pro", price: "$79", period: "/mo",
    desc: "Everything you need for a high-efficiency repair shop.",
    features: ["Unlimited staff","AI Diagnostics (GPT-4o)","Live delivery tracking","Advanced inventory","Analytics dashboard","Priority support 24/7","Custom branding"],
    cta: "Start Free Trial", popular: true,
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    desc: "Multi-location support with dedicated management.",
    features: ["Multi-tenant setup","Custom integrations","SLA guarantees","Dedicated manager","On-premise option","API access","White-label"],
    cta: "Contact Sales", popular: false,
  },
];

const TESTIMONIALS = [
  { name: "Ahmed Hassan",  role: "Owner, TechFix Lahore",        text: "DibnowRepairSaaS completely transformed our shop. Ticket management alone saved us 3 hours daily.", stars: 5, initials: "AH", color: "#1d4ed8" },
  { name: "Fatima Malik",  role: "Manager, QuickRepair Karachi",  text: "The AI diagnostics feature is incredible. Our technicians solve complex issues 50% faster than before.", stars: 5, initials: "FM", color: "#6d28d9" },
  { name: "Usman Khan",    role: "Owner, GadgetDoc Islamabad",    text: "The customer portal is a game changer. Customers love tracking their repairs in real time.", stars: 5, initials: "UK", color: "#065f46" },
];

/* ── Subtle cross-hatch SVG background ── */
const HatchBg = ({ opacity = 0.045 }: { opacity?: number }) => (
  <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity }} aria-hidden>
    <defs>
      <pattern id="hatch" patternUnits="userSpaceOnUse" width="40" height="40">
        <path d="M0 40L40 0M-5 5L5-5M35 45L45 35" stroke="#78350f" strokeWidth="0.8" fill="none"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hatch)"/>
  </svg>
);

/* ── Dot grid ── */
const DotsBg = ({ opacity = 0.08 }: { opacity?: number }) => (
  <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity }} aria-hidden>
    <defs>
      <pattern id="dotsm" patternUnits="userSpaceOnUse" width="24" height="24">
        <circle cx="1.5" cy="1.5" r="1.5" fill="#92400e"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dotsm)"/>
  </svg>
);

/* ── Wavy divider ── */
const WaveDivider = ({ flip = false, fill = "#fdf6ee" }: { flip?: boolean; fill?: string }) => (
  <div style={{ lineHeight:0,transform:flip?"scaleY(-1)":"none" }}>
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width:"100%",height:80,display:"block" }} aria-hidden>
      <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill={fill}/>
    </svg>
  </div>
);

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* palette */
  const BG      = "#fdf6ee";   /* warm cream */
  const BG2     = "#fef9f3";   /* lighter cream */
  const BG3     = "#f5ede0";   /* slightly darker cream */
  const ACCENT  = "#1d4ed8";   /* deep blue */
  const ACCENT2 = "#1e3a8a";   /* darker blue */
  const TEXT     = "#1c1917";
  const MUTED    = "#78716c";
  const BORDER   = "#e7d9c8";

  return (
    <div style={{ background: BG, color: TEXT, fontFamily:"'DM Serif Display','Playfair Display',Georgia,serif", overflowX:"hidden" }}>

      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      <style suppressHydrationWarning>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        html{scroll-behavior:smooth;}
        body{font-family:'DM Sans',system-ui,sans-serif;}
        h1,h2,h3,.serif{font-family:'DM Serif Display',Georgia,serif;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeDown{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes float2{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}
        @keyframes pulse3d{0%,100%{transform:perspective(1100px) rotateY(-7deg) rotateX(2deg)}50%{transform:perspective(1100px) rotateY(-3deg) rotateX(0deg)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes bounceCue{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(8px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .card-lift{transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.3s ease;}
        .card-lift:hover{transform:translateY(-8px) scale(1.015);box-shadow:0 28px 56px rgba(29,78,216,0.14)!important;}
        .btn-blue{transition:all 0.22s ease;}
        .btn-blue:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(29,78,216,0.35)!important;}
        .btn-outline:hover{background:rgba(29,78,216,0.07)!important;}
        .nav-btn:hover{color:#1d4ed8!important;}
        .hid{display:flex!important;}
        .mob{display:none!important;}
        @media(max-width:900px){.hero-cols{grid-template-columns:1fr!important;}.hid{display:none!important;}.mob{display:block!important;}}
        ::selection{background:#bfdbfe;color:#1e3a8a;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:${BG};}
        ::-webkit-scrollbar-thumb{background:${BORDER};border-radius:99px;}
      `}</style>

      {/* ══ NAVBAR ══════════════════════════════════════════ */}
      <header style={{
        position:"fixed",top:0,left:0,right:0,zIndex:100,
        background: scrolled ? `rgba(253,246,238,0.96)` : `rgba(253,246,238,0.75)`,
        backdropFilter:"blur(20px)",
        borderBottom: scrolled ? `1px solid ${BORDER}` : "1px solid transparent",
        transition:"all 0.3s ease",
        boxShadow: scrolled ? "0 2px 32px rgba(120,83,56,0.1)" : "none",
      }}>
        <div style={{ maxWidth:1320,margin:"0 auto",padding:"0 40px",display:"flex",alignItems:"center",justifyContent:"space-between",height:90 }}>

          <Link href="/" style={{ display:"flex",alignItems:"center",gap:14,textDecoration:"none" }}>
            <div style={{ width:52,height:52,background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,borderRadius:15,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 6px 22px rgba(29,78,216,0.28)`,transform:"rotate(-4deg)" }}>
              <Wrench size={23} color="#fff"/>
            </div>
            <div>
              <span className="serif" style={{ color:TEXT,fontWeight:700,fontSize:24,letterSpacing:"-0.5px",display:"block",lineHeight:1.1 }}>Dibnow</span>
              <span style={{ color:ACCENT,fontSize:10,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase",display:"block",fontFamily:"'DM Sans',sans-serif" }}>RepairSaaS</span>
            </div>
          </Link>

          <nav className="hid" style={{ alignItems:"center",gap:4 }}>
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)} className="nav-btn"
                style={{ background:"none",border:"none",cursor:"pointer",color:MUTED,fontWeight:600,fontSize:15,padding:"9px 18px",borderRadius:10,transition:"color 0.2s",fontFamily:"'DM Sans',sans-serif" }}>
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hid" style={{ alignItems:"center",gap:12 }}>
            <Link href="/login" className="btn-outline"
              style={{ color:MUTED,fontWeight:600,fontSize:14,textDecoration:"none",padding:"10px 20px",borderRadius:10,border:`1.5px solid ${BORDER}`,transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif" }}>
              Sign In
            </Link>
            <Link href="/register" className="btn-blue"
              style={{ background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none",padding:"11px 24px",borderRadius:10,boxShadow:`0 6px 22px rgba(29,78,216,0.28)`,fontFamily:"'DM Sans',sans-serif" }}>
              Get Started Free →
            </Link>
          </div>

          <button onClick={() => setMenuOpen(o => !o)} className="mob"
            style={{ background:"none",border:"none",cursor:"pointer",color:TEXT,padding:6 }}>
            {menuOpen ? <X size={26}/> : <Menu size={26}/>}
          </button>
        </div>

        {menuOpen && (
          <div style={{ background:BG,borderTop:`1px solid ${BORDER}`,padding:"18px 28px 28px",boxShadow:"0 12px 40px rgba(120,83,56,0.08)" }}>
            {NAV_LINKS.map(l => (
              <button key={l.label} onClick={() => scrollTo(l.href)}
                style={{ display:"block",width:"100%",background:"none",border:"none",cursor:"pointer",color:MUTED,fontWeight:600,fontSize:17,padding:"13px 0",textAlign:"left",borderBottom:`1px solid ${BORDER}`,fontFamily:"'DM Sans',sans-serif" }}>
                {l.label}
              </button>
            ))}
            <div style={{ display:"flex",gap:12,marginTop:18 }}>
              <Link href="/login" style={{ flex:1,textAlign:"center",color:MUTED,fontWeight:600,fontSize:14,textDecoration:"none",padding:"13px 0",borderRadius:10,border:`1.5px solid ${BORDER}`,fontFamily:"'DM Sans',sans-serif" }}>Sign In</Link>
              <Link href="/register" style={{ flex:1,textAlign:"center",background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none",padding:"13px 0",borderRadius:10,fontFamily:"'DM Sans',sans-serif" }}>Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{
        minHeight:"100vh",display:"flex",alignItems:"center",
        padding:"150px 40px 120px",position:"relative",overflow:"hidden",
        background:`linear-gradient(160deg,${BG} 0%,${BG3} 60%,#ede8e0 100%)`,
      }}>
        <HatchBg opacity={0.04}/>

        {/* Decorative rings */}
        <div style={{ position:"absolute",top:"8%",right:"2%",width:520,height:520,borderRadius:"50%",border:`1px solid rgba(29,78,216,0.08)`,pointerEvents:"none" }}/>
        <div style={{ position:"absolute",top:"12%",right:"6%",width:380,height:380,borderRadius:"50%",border:`1px solid rgba(29,78,216,0.12)`,pointerEvents:"none" }}/>
        <div style={{ position:"absolute",top:"18%",right:"11%",width:240,height:240,borderRadius:"50%",border:`1px solid rgba(29,78,216,0.16)`,pointerEvents:"none" }}/>
        {/* Soft blobs */}
        <div style={{ position:"absolute",top:"-8%",left:"-6%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(29,78,216,0.06) 0%,transparent 70%)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:"-4%",right:"-4%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(120,83,56,0.07) 0%,transparent 70%)",pointerEvents:"none" }}/>

        <div className="hero-cols" style={{ maxWidth:1320,margin:"0 auto",width:"100%",display:"grid",gridTemplateColumns:"1fr 1fr",gap:80,alignItems:"center" }}>

          {/* LEFT */}
          <div style={{ position:"relative",zIndex:1 }}>
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:30,
                          background:"rgba(29,78,216,0.08)",border:"1px solid rgba(29,78,216,0.2)",
                          borderRadius:999,padding:"9px 20px",animation:"fadeDown 0.6s ease" }}>
              <Sparkles size={14} color={ACCENT}/>
              <span style={{ color:ACCENT,fontSize:13,fontWeight:700,letterSpacing:"0.05em",fontFamily:"'DM Sans',sans-serif" }}>THE #1 REPAIR SHOP PLATFORM</span>
            </div>

            <h1 style={{ fontSize:"clamp(46px,5.5vw,80px)",fontWeight:700,letterSpacing:"-2.5px",lineHeight:1.04,marginBottom:26,animation:"fadeUp 0.7s ease 0.1s both",color:TEXT }}>
              Run your repair<br/>shop{" "}
              <em style={{
                background:`linear-gradient(90deg,${ACCENT} 0%,#7c3aed 55%,#c2410c 100%)`,
                backgroundSize:"200% auto",
                WebkitBackgroundClip:"text",
                WebkitTextFillColor:"transparent",
                animation:"shimmer 5s linear infinite",
                fontStyle:"italic",
              }}>
                10× smarter.
              </em>
            </h1>

            <p style={{ fontSize:"clamp(16px,1.7vw,19px)",color:MUTED,lineHeight:1.85,maxWidth:510,marginBottom:44,animation:"fadeUp 0.7s ease 0.2s both",fontFamily:"'DM Sans',sans-serif" }}>
              From first intake to final delivery — manage tickets, technicians, inventory,
              customers, and drivers from one beautiful platform. Built for repair shops of all sizes.
            </p>

            <div style={{ display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:52,animation:"fadeUp 0.7s ease 0.3s both" }}>
              <Link href="/register" className="btn-blue"
                style={{ display:"inline-flex",alignItems:"center",gap:10,background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                         color:"#fff",fontWeight:700,fontSize:17,textDecoration:"none",padding:"18px 36px",borderRadius:14,
                         boxShadow:`0 10px 32px rgba(29,78,216,0.3)`,fontFamily:"'DM Sans',sans-serif" }}>
                Start for free <ArrowRight size={19}/>
              </Link>
              <button onClick={() => scrollTo("features")}
                style={{ display:"inline-flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.6)",color:MUTED,fontWeight:700,
                         fontSize:17,border:`1.5px solid ${BORDER}`,cursor:"pointer",padding:"18px 36px",borderRadius:14,
                         backdropFilter:"blur(8px)",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif" }}>
                <Play size={17} color={ACCENT} fill={ACCENT}/> Watch demo
              </button>
            </div>

            {/* Trust */}
            <div style={{ display:"flex",alignItems:"center",gap:28,flexWrap:"wrap",animation:"fadeUp 0.7s ease 0.4s both" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ display:"flex" }}>
                  {["AH","FM","UK","MR"].map((a,i) => (
                    <div key={a} style={{ width:34,height:34,borderRadius:"50%",border:`2px solid ${BG}`,
                      background:`hsl(${i*60+210},58%,52%)`,display:"flex",alignItems:"center",
                      justifyContent:"center",fontSize:11,color:"#fff",fontWeight:700,
                      marginLeft:i>0?-10:0,zIndex:4-i,position:"relative",fontFamily:"'DM Sans',sans-serif" }}>{a[0]}</div>
                  ))}
                </div>
                <span style={{ fontSize:14,color:MUTED,fontWeight:600,fontFamily:"'DM Sans',sans-serif" }}>500+ shops trust us</span>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={15} fill="#f59e0b" color="#f59e0b"/>)}
                <span style={{ fontSize:14,color:MUTED,fontWeight:600,marginLeft:5,fontFamily:"'DM Sans',sans-serif" }}>4.9/5 rating</span>
              </div>
            </div>
          </div>

          {/* RIGHT — Dashboard mockup */}
          <div className="hid" style={{ position:"relative",animation:"fadeUp 0.9s ease 0.2s both" }}>
            {/* Shadow glow */}
            <div style={{ position:"absolute",inset:-30,background:"radial-gradient(ellipse,rgba(29,78,216,0.12) 0%,transparent 70%)",pointerEvents:"none",borderRadius:"50%" }}/>

            <div style={{
              background:"#fff",borderRadius:24,border:`1px solid ${BORDER}`,
              boxShadow:`0 50px 100px rgba(29,78,216,0.12),0 20px 40px rgba(120,83,56,0.08)`,
              overflow:"hidden",animation:"pulse3d 7s ease infinite",
            }}>
              {/* Browser chrome */}
              <div style={{ background:BG3,padding:"13px 18px",borderBottom:`1px solid ${BORDER}`,display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ width:11,height:11,borderRadius:"50%",background:"#fc5f57" }}/>
                <div style={{ width:11,height:11,borderRadius:"50%",background:"#febc2e" }}/>
                <div style={{ width:11,height:11,borderRadius:"50%",background:"#28c840" }}/>
                <div style={{ flex:1,background:"#fff",borderRadius:7,height:24,marginLeft:10,border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",padding:"0 12px" }}>
                  <span style={{ fontSize:11,color:MUTED,fontWeight:500,fontFamily:"'DM Sans',sans-serif" }}>app.dibnow.com/dashboard</span>
                </div>
              </div>
              {/* Dashboard body */}
              <div style={{ padding:22,background:BG2 }}>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18 }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:700,color:TEXT,marginBottom:2,fontFamily:"'DM Sans',sans-serif" }}>Good morning, Ahmed 👋</div>
                    <div style={{ fontSize:11,color:MUTED,fontFamily:"'DM Sans',sans-serif" }}>Monday, 8 Jun 2026</div>
                  </div>
                  <div style={{ background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,borderRadius:9,padding:"7px 14px",boxShadow:`0 4px 14px rgba(29,78,216,0.3)` }}>
                    <span style={{ color:"#fff",fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif" }}>+ New Ticket</span>
                  </div>
                </div>
                {/* KPIs */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:18 }}>
                  {[
                    { label:"Open",       val:"24", bg:"#dbeafe",  tc:"#1d4ed8" },
                    { label:"In Progress",val:"11", bg:"#ede9fe",  tc:"#6d28d9" },
                    { label:"Completed",  val:"87", bg:"#d1fae5",  tc:"#065f46" },
                    { label:"Revenue",    val:"$3.2K",bg:"#fef3c7",tc:"#92400e" },
                  ].map(k => (
                    <div key={k.label} style={{ background:k.bg,borderRadius:11,padding:"11px 10px",border:`1px solid ${k.tc}22` }}>
                      <div style={{ fontSize:17,fontWeight:800,color:k.tc,lineHeight:1,fontFamily:"'DM Serif Display',Georgia,serif" }}>{k.val}</div>
                      <div style={{ fontSize:9,color:MUTED,fontWeight:600,marginTop:4,lineHeight:1.3,fontFamily:"'DM Sans',sans-serif" }}>{k.label}</div>
                    </div>
                  ))}
                </div>
                {/* Ticket rows */}
                {[
                  { id:"#1042",device:"iPhone 15 Pro",issue:"Screen replacement",status:"In Progress",sc:"#6d28d9",sb:"#ede9fe" },
                  { id:"#1041",device:"MacBook Air M2",issue:"Battery swollen",  status:"Pending",    sc:"#92400e",sb:"#fef3c7" },
                  { id:"#1040",device:"Samsung S24",   issue:"Water damage",      status:"Completed",  sc:"#065f46",sb:"#d1fae5" },
                ].map(t => (
                  <div key={t.id} style={{ background:"#fff",borderRadius:11,padding:"11px 14px",marginBottom:8,border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <div style={{ width:34,height:34,borderRadius:9,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <Wrench size={15} color={ACCENT}/>
                      </div>
                      <div>
                        <div style={{ fontSize:12,fontWeight:700,color:TEXT,fontFamily:"'DM Sans',sans-serif" }}>{t.device}</div>
                        <div style={{ fontSize:10,color:MUTED,fontFamily:"'DM Sans',sans-serif" }}>{t.id} · {t.issue}</div>
                      </div>
                    </div>
                    <div style={{ background:t.sb,color:t.sc,fontSize:10,fontWeight:700,padding:"4px 11px",borderRadius:20,border:`1px solid ${t.sc}22`,fontFamily:"'DM Sans',sans-serif" }}>{t.status}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge 1 */}
            <div style={{ position:"absolute",top:-22,right:-26,background:"#fff",borderRadius:18,padding:"14px 20px",boxShadow:`0 16px 40px rgba(29,78,216,0.15)`,border:`1px solid ${BORDER}`,animation:"float 3.5s ease infinite" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:10,background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <TrendingUp size={17} color="#065f46"/>
                </div>
                <div>
                  <div style={{ fontSize:10,color:MUTED,fontWeight:600,fontFamily:"'DM Sans',sans-serif" }}>Revenue</div>
                  <div style={{ fontSize:17,fontWeight:800,color:"#065f46",fontFamily:"'DM Serif Display',Georgia,serif" }}>+24% ↑</div>
                </div>
              </div>
            </div>

            {/* Floating badge 2 */}
            <div style={{ position:"absolute",bottom:-16,left:-26,background:"#fff",borderRadius:16,padding:"12px 18px",boxShadow:`0 16px 40px rgba(109,40,217,0.14)`,border:`1px solid ${BORDER}`,animation:"float2 4s ease infinite" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ width:32,height:32,borderRadius:8,background:"#ede9fe",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <Bot size={15} color="#6d28d9"/>
                </div>
                <span style={{ fontSize:13,fontWeight:700,color:"#6d28d9",fontFamily:"'DM Sans',sans-serif" }}>AI Diagnosis Ready ✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ position:"absolute",bottom:0,left:0,right:0,background:"rgba(253,246,238,0.92)",backdropFilter:"blur(20px)",borderTop:`1px solid ${BORDER}`,padding:"28px 40px" }}>
          <div style={{ maxWidth:1320,margin:"0 auto",display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:20 }}>
            {STATS.map((s,i) => {
              const Icon = s.icon;
              return (
                <div key={s.label} style={{ display:"flex",alignItems:"center",gap:14,animation:`fadeUp 0.6s ease ${0.5+i*0.1}s both` }}>
                  <div style={{ width:48,height:48,borderRadius:13,background:"#dbeafe",border:`1px solid rgba(29,78,216,0.15)`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <Icon size={21} color={ACCENT}/>
                  </div>
                  <div>
                    <div className="serif" style={{ fontSize:28,fontWeight:700,color:TEXT,letterSpacing:"-1px",lineHeight:1 }}>{s.value}</div>
                    <div style={{ fontSize:12,color:MUTED,fontWeight:600,marginTop:2,fontFamily:"'DM Sans',sans-serif" }}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ position:"absolute",bottom:110,left:"50%",animation:"bounceCue 2.2s ease infinite",opacity:0.35 }}>
          <ChevronDown size={24} color={MUTED}/>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════ */}
      <section id="features" style={{ padding:"150px 40px",background:"#fff",position:"relative",overflow:"hidden" }}>
        <DotsBg opacity={0.05}/>
        <div style={{ position:"absolute",top:-80,right:"10%",width:500,height:400,background:"radial-gradient(ellipse,rgba(29,78,216,0.05) 0%,transparent 70%)",pointerEvents:"none" }}/>

        <div style={{ maxWidth:1320,margin:"0 auto",position:"relative",zIndex:1 }}>
          <FadeIn>
            <div style={{ textAlign:"center",marginBottom:100 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:22,background:"#dbeafe",border:"1px solid rgba(29,78,216,0.2)",borderRadius:999,padding:"10px 22px" }}>
                <Zap size={13} color={ACCENT}/>
                <span style={{ color:ACCENT,fontSize:13,fontWeight:700,letterSpacing:"0.06em",fontFamily:"'DM Sans',sans-serif" }}>EVERYTHING YOU NEED</span>
              </div>
              <h2 style={{ fontSize:"clamp(38px,5vw,66px)",fontWeight:700,color:TEXT,letterSpacing:"-2px",lineHeight:1.08,marginBottom:22 }}>
                Powerful features,<br/>built for repair shops.
              </h2>
              <p style={{ color:MUTED,fontSize:19,maxWidth:520,margin:"0 auto",lineHeight:1.85,fontFamily:"'DM Sans',sans-serif" }}>
                Every tool your team needs to deliver exceptional repair service, all in one place.
              </p>
            </div>
          </FadeIn>

          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:28 }}>
            {FEATURES.map((f,i) => {
              const Icon = f.icon;
              return (
                <FadeIn key={f.title} delay={i*0.08}>
                  <div className="card-lift" style={{
                    background:BG2,border:`1px solid ${BORDER}`,borderRadius:22,
                    padding:"42px 38px 46px",height:"100%",cursor:"default",
                    boxShadow:`0 4px 20px rgba(120,83,56,0.06)`,
                    position:"relative",overflow:"hidden",
                  }}>
                    <div style={{ position:"absolute",top:-30,right:-20,width:160,height:160,background:`radial-gradient(circle,${f.bg} 0%,transparent 70%)`,pointerEvents:"none",opacity:0.5 }}/>
                    <div style={{ width:62,height:62,borderRadius:18,background:f.bg,border:`1px solid ${f.color}22`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:26,position:"relative" }}>
                      <Icon size={28} color={f.color}/>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
                      <h3 style={{ color:TEXT,fontWeight:700,fontSize:20,letterSpacing:"-0.4px" }}>{f.title}</h3>
                      {f.badge && (
                        <span style={{ background:f.bg,color:f.color,fontSize:10,fontWeight:800,padding:"4px 12px",borderRadius:999,border:`1px solid ${f.color}30`,letterSpacing:"0.07em",fontFamily:"'DM Sans',sans-serif" }}>{f.badge}</span>
                      )}
                    </div>
                    <p style={{ color:MUTED,fontSize:15,lineHeight:1.85,margin:0,fontFamily:"'DM Sans',sans-serif" }}>{f.desc}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <WaveDivider fill={BG3}/>

      {/* ══ ROLES ═══════════════════════════════════════════ */}
      <section id="roles" style={{ padding:"150px 40px",background:BG3,position:"relative",overflow:"hidden" }}>
        <HatchBg opacity={0.035}/>
        <div style={{ maxWidth:1320,margin:"0 auto",position:"relative",zIndex:1 }}>
          <FadeIn>
            <div style={{ textAlign:"center",marginBottom:100 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:22,background:"rgba(29,78,216,0.08)",border:"1px solid rgba(29,78,216,0.18)",borderRadius:999,padding:"10px 22px" }}>
                <Users size={13} color={ACCENT}/>
                <span style={{ color:ACCENT,fontSize:13,fontWeight:700,letterSpacing:"0.06em",fontFamily:"'DM Sans',sans-serif" }}>BUILT FOR EVERY ROLE</span>
              </div>
              <h2 style={{ fontSize:"clamp(38px,5vw,66px)",fontWeight:700,color:TEXT,letterSpacing:"-2px",lineHeight:1.08,marginBottom:22 }}>
                One platform,<br/>every team member.
              </h2>
              <p style={{ color:MUTED,fontSize:19,maxWidth:520,margin:"0 auto",lineHeight:1.85,fontFamily:"'DM Sans',sans-serif" }}>
                Tailored dashboards and granular permissions for each role in your repair shop.
              </p>
            </div>
          </FadeIn>

          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:26 }}>
            {ROLES.map((r,i) => {
              const Icon = r.icon;
              return (
                <FadeIn key={r.label} delay={i*0.07}>
                  <div className="card-lift" style={{
                    background:"#fff",border:`1px solid ${BORDER}`,borderRadius:22,
                    padding:"34px 32px 38px",height:"100%",
                    boxShadow:`0 4px 20px rgba(120,83,56,0.06)`,
                    position:"relative",overflow:"hidden",
                  }}>
                    <div style={{ position:"absolute",top:-40,right:-20,width:180,height:180,background:`radial-gradient(circle,${r.bg} 0%,transparent 70%)`,pointerEvents:"none",opacity:0.6 }}/>
                    <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:18 }}>
                      <div style={{ width:56,height:56,borderRadius:16,background:r.bg,border:`1px solid ${r.color}22`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <Icon size={26} color={r.color}/>
                      </div>
                      <h3 style={{ color:TEXT,fontWeight:700,fontSize:22,letterSpacing:"-0.4px" }}>{r.label}</h3>
                    </div>
                    <p style={{ color:MUTED,fontSize:15,lineHeight:1.85,marginBottom:20,fontFamily:"'DM Sans',sans-serif" }}>{r.desc}</p>
                    <div style={{ borderTop:`1px solid ${BORDER}`,paddingTop:20,display:"flex",flexDirection:"column",gap:10 }}>
                      {r.perks.map(p => (
                        <div key={p} style={{ display:"flex",alignItems:"center",gap:10 }}>
                          <CheckCircle size={15} color={r.color}/>
                          <span style={{ color:MUTED,fontSize:14,fontWeight:500,fontFamily:"'DM Sans',sans-serif" }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn delay={0.2}>
            <div style={{ textAlign:"center",marginTop:64 }}>
              <Link href="/register"
                style={{ display:"inline-flex",alignItems:"center",gap:10,color:ACCENT,fontWeight:700,fontSize:16,textDecoration:"none",background:"rgba(29,78,216,0.07)",padding:"16px 34px",borderRadius:12,border:"1px solid rgba(29,78,216,0.2)",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif" }}>
                Choose your role and get started <ArrowRight size={18}/>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <WaveDivider fill="#fff" flip/>

      {/* ══ TESTIMONIALS ════════════════════════════════════ */}
      <section style={{ padding:"150px 40px",background:"#fff",position:"relative",overflow:"hidden" }}>
        <DotsBg opacity={0.04}/>
        <div style={{ maxWidth:1320,margin:"0 auto",position:"relative",zIndex:1 }}>
          <FadeIn>
            <div style={{ textAlign:"center",marginBottom:100 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:22,background:"#fef3c7",border:"1px solid rgba(245,158,11,0.3)",borderRadius:999,padding:"10px 22px" }}>
                <Star size={13} color="#d97706" fill="#d97706"/>
                <span style={{ color:"#d97706",fontSize:13,fontWeight:700,letterSpacing:"0.06em",fontFamily:"'DM Sans',sans-serif" }}>LOVED BY SHOP OWNERS</span>
              </div>
              <h2 style={{ fontSize:"clamp(38px,5vw,66px)",fontWeight:700,color:TEXT,letterSpacing:"-2px",lineHeight:1.08 }}>
                Trusted by repair shops<br/>across Pakistan & beyond.
              </h2>
            </div>
          </FadeIn>

          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:26 }}>
            {TESTIMONIALS.map((t,i) => (
              <FadeIn key={t.name} delay={i*0.1}>
                <div className="card-lift" style={{ background:BG2,border:`1px solid ${BORDER}`,borderRadius:22,padding:"38px 36px 42px",boxShadow:`0 4px 20px rgba(120,83,56,0.06)` }}>
                  <div style={{ display:"flex",gap:4,marginBottom:22 }}>
                    {Array.from({length:t.stars}).map((_,s) => (
                      <Star key={s} size={17} fill="#f59e0b" color="#f59e0b"/>
                    ))}
                  </div>
                  <p style={{ color:MUTED,fontSize:16,lineHeight:1.9,marginBottom:30,fontStyle:"italic",fontFamily:"'DM Serif Display',Georgia,serif" }}>"{t.text}"</p>
                  <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                    <div style={{ width:50,height:50,borderRadius:"50%",background:`linear-gradient(135deg,${t.color}90,${t.color})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:16,fontWeight:700,flexShrink:0,boxShadow:`0 4px 14px ${t.color}40`,fontFamily:"'DM Sans',sans-serif" }}>{t.initials}</div>
                    <div>
                      <div style={{ fontWeight:700,color:TEXT,fontSize:15,fontFamily:"'DM Sans',sans-serif" }}>{t.name}</div>
                      <div style={{ color:MUTED,fontSize:13,fontFamily:"'DM Sans',sans-serif" }}>{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider fill={BG3}/>

      {/* ══ PRICING ═════════════════════════════════════════ */}
      <section id="pricing" style={{ padding:"150px 40px",background:BG3,position:"relative",overflow:"hidden" }}>
        <HatchBg opacity={0.03}/>
        <div style={{ position:"absolute",top:-60,left:"50%",transform:"translateX(-50%)",width:800,height:400,background:"radial-gradient(ellipse,rgba(29,78,216,0.06) 0%,transparent 70%)",pointerEvents:"none" }}/>

        <div style={{ maxWidth:1180,margin:"0 auto",position:"relative",zIndex:1 }}>
          <FadeIn>
            <div style={{ textAlign:"center",marginBottom:100 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:22,background:"#d1fae5",border:"1px solid rgba(6,95,70,0.2)",borderRadius:999,padding:"10px 22px" }}>
                <Award size={13} color="#065f46"/>
                <span style={{ color:"#065f46",fontSize:13,fontWeight:700,letterSpacing:"0.06em",fontFamily:"'DM Sans',sans-serif" }}>SIMPLE PRICING</span>
              </div>
              <h2 style={{ fontSize:"clamp(38px,5vw,66px)",fontWeight:700,color:TEXT,letterSpacing:"-2px",lineHeight:1.08,marginBottom:22 }}>
                Transparent plans,<br/>no surprises.
              </h2>
              <p style={{ color:MUTED,fontSize:19,maxWidth:440,margin:"0 auto",fontFamily:"'DM Sans',sans-serif" }}>Start free, scale as you grow. Cancel anytime.</p>
            </div>
          </FadeIn>

          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:26,alignItems:"center" }}>
            {PRICING.map((p,i) => (
              <FadeIn key={p.name} delay={i*0.1}>
                <div style={{
                  position:"relative",
                  background: p.popular ? `linear-gradient(160deg,${ACCENT} 0%,${ACCENT2} 100%)` : "#fff",
                  border: p.popular ? "none" : `1px solid ${BORDER}`,
                  borderRadius:24,padding:"46px 40px",
                  transform: p.popular ? "scale(1.05)" : "none",
                  boxShadow: p.popular ? `0 40px 80px rgba(29,78,216,0.3),0 12px 32px rgba(29,78,216,0.2)` : `0 4px 20px rgba(120,83,56,0.06)`,
                }}>
                  {p.popular && (
                    <div style={{ position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",
                                  background:"#fef3c7",color:"#92400e",
                                  fontSize:11,fontWeight:800,padding:"7px 26px",borderRadius:999,
                                  whiteSpace:"nowrap",letterSpacing:"0.09em",boxShadow:"0 6px 18px rgba(245,158,11,0.25)",fontFamily:"'DM Sans',sans-serif" }}>
                      ★ MOST POPULAR
                    </div>
                  )}
                  <div style={{ display:"inline-block",background:p.popular?"rgba(255,255,255,0.15)":"#f5f0e8",color:p.popular?"#fff":MUTED,fontSize:11,fontWeight:800,padding:"6px 16px",borderRadius:8,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:22,border:p.popular?"1px solid rgba(255,255,255,0.2)":`1px solid ${BORDER}`,fontFamily:"'DM Sans',sans-serif" }}>{p.name}</div>
                  <div style={{ display:"flex",alignItems:"baseline",gap:4,marginBottom:10 }}>
                    <span className="serif" style={{ color:p.popular?"#fff":TEXT,fontWeight:700,fontSize:56,letterSpacing:"-2.5px",lineHeight:1 }}>{p.price}</span>
                    <span style={{ color:p.popular?"rgba(255,255,255,0.65)":MUTED,fontWeight:600,fontSize:16,fontFamily:"'DM Sans',sans-serif" }}>{p.period}</span>
                  </div>
                  <p style={{ color:p.popular?"rgba(255,255,255,0.7)":MUTED,fontSize:15,lineHeight:1.8,marginBottom:28,fontFamily:"'DM Sans',sans-serif" }}>{p.desc}</p>
                  <div style={{ borderTop:`1px solid ${p.popular?"rgba(255,255,255,0.15)":BORDER}`,paddingTop:28,marginBottom:34 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
                        <div style={{ width:22,height:22,borderRadius:"50%",background:p.popular?"rgba(255,255,255,0.15)":"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <CheckCircle size={13} color={p.popular?"#fff":ACCENT}/>
                        </div>
                        <span style={{ color:p.popular?"rgba(255,255,255,0.85)":MUTED,fontSize:14,fontWeight:500,fontFamily:"'DM Sans',sans-serif" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/register" style={{
                    display:"flex",alignItems:"center",justifyContent:"center",gap:9,
                    background:p.popular?"rgba(255,255,255,0.18)":"#dbeafe",
                    color:p.popular?"#fff":ACCENT,fontWeight:700,fontSize:15,textDecoration:"none",
                    padding:"16px 0",borderRadius:13,width:"100%",
                    border:p.popular?"1px solid rgba(255,255,255,0.25)":"none",
                    transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif",
                  }}>
                    {p.cta} <ArrowRight size={17}/>
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider fill="#fff" flip/>

      {/* ══ CTA BANNER ══════════════════════════════════════ */}
      <section style={{ padding:"120px 40px",background:"#fff",position:"relative",overflow:"hidden" }}>
        <DotsBg opacity={0.04}/>
        <FadeIn>
          <div style={{
            maxWidth:1100,margin:"0 auto",textAlign:"center",
            background:`linear-gradient(135deg,${ACCENT} 0%,${ACCENT2} 100%)`,
            borderRadius:32,padding:"100px 60px",
            position:"relative",overflow:"hidden",
            boxShadow:`0 40px 100px rgba(29,78,216,0.3)`,
          }}>
            {/* Decorative rings inside CTA */}
            <div style={{ position:"absolute",top:-80,right:-80,width:400,height:400,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",pointerEvents:"none" }}/>
            <div style={{ position:"absolute",top:-50,right:-50,width:280,height:280,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.15)",pointerEvents:"none" }}/>
            <div style={{ position:"absolute",bottom:-60,left:-60,width:360,height:360,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.08)",pointerEvents:"none" }}/>
            <HatchBg opacity={0.06}/>

            <div style={{ display:"inline-flex",alignItems:"center",gap:8,marginBottom:24,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:999,padding:"10px 22px",position:"relative" }}>
              <Zap size={14} color="#fef3c7"/>
              <span style={{ color:"#fef3c7",fontSize:13,fontWeight:700,letterSpacing:"0.06em",fontFamily:"'DM Sans',sans-serif" }}>START TODAY — NO CREDIT CARD NEEDED</span>
            </div>
            <h2 style={{ color:"#fff",fontWeight:700,fontSize:"clamp(36px,5vw,62px)",letterSpacing:"-1.8px",lineHeight:1.08,marginBottom:20,position:"relative" }}>
              Ready to modernize<br/>your repair shop?
            </h2>
            <p style={{ color:"rgba(255,255,255,0.72)",fontSize:19,lineHeight:1.85,maxWidth:490,margin:"0 auto 52px",position:"relative",fontFamily:"'DM Sans',sans-serif" }}>
              Join 500+ repair shops already using DibnowRepairSaaS to deliver faster, smarter repairs.
            </p>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:16,flexWrap:"wrap",position:"relative" }}>
              <Link href="/register"
                style={{ display:"inline-flex",alignItems:"center",gap:10,background:"#fff",color:ACCENT,fontWeight:800,fontSize:17,textDecoration:"none",padding:"18px 40px",borderRadius:14,boxShadow:"0 12px 36px rgba(0,0,0,0.2)",transition:"all 0.22s",fontFamily:"'DM Sans',sans-serif" }}>
                Create free account <ArrowRight size={18}/>
              </Link>
              <Link href="/login" style={{ color:"rgba(255,255,255,0.7)",fontWeight:700,fontSize:16,textDecoration:"none",display:"flex",alignItems:"center",gap:7,fontFamily:"'DM Sans',sans-serif" }}>
                Already have an account <ArrowRight size={16}/>
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ══ CONTACT ═════════════════════════════════════════ */}
      <section id="contact" style={{ padding:"120px 40px",background:BG3,position:"relative",overflow:"hidden" }}>
        <HatchBg opacity={0.03}/>
        <div style={{ maxWidth:960,margin:"0 auto",position:"relative",zIndex:1 }}>
          <FadeIn>
            <div style={{ textAlign:"center",marginBottom:64 }}>
              <h3 style={{ color:TEXT,fontWeight:700,fontSize:48,letterSpacing:"-1.5px",marginBottom:14 }}>Get in touch</h3>
              <p style={{ color:MUTED,fontSize:17,lineHeight:1.85,fontFamily:"'DM Sans',sans-serif" }}>Have questions? Our team is ready to help you get started.</p>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:22 }}>
              {[
                { icon:Mail,  label:"Email Us",     val:"support@dibnow.com",  color:"#1d4ed8", bg:"#dbeafe" },
                { icon:Phone, label:"Call Us",      val:"+1 (800) DIBNOW-1",   color:"#6d28d9", bg:"#ede9fe" },
                { icon:Globe, label:"Visit Website",val:"www.dibnow.com",       color:"#065f46", bg:"#d1fae5" },
              ].map(({ icon:Icon,label,val,color,bg }) => (
                <div key={label} className="card-lift" style={{ background:"#fff",border:`1px solid ${BORDER}`,borderRadius:20,padding:"36px 28px",textAlign:"center",boxShadow:`0 4px 18px rgba(120,83,56,0.06)` }}>
                  <div style={{ width:58,height:58,borderRadius:16,background:bg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",border:`1px solid ${color}20` }}>
                    <Icon size={24} color={color}/>
                  </div>
                  <div style={{ fontSize:11,color:MUTED,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:7,fontFamily:"'DM Sans',sans-serif" }}>{label}</div>
                  <div style={{ fontSize:15,color:TEXT,fontWeight:700,fontFamily:"'DM Sans',sans-serif" }}>{val}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════ */}
      <footer style={{ background:"#1c1917",padding:"90px 40px 40px",borderTop:"1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ maxWidth:1320,margin:"0 auto" }}>
          <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:52,marginBottom:72,borderBottom:"1px solid rgba(255,255,255,0.06)",paddingBottom:72 }}>
            <div>
              <Link href="/" style={{ display:"flex",alignItems:"center",gap:14,textDecoration:"none",marginBottom:22 }}>
                <div style={{ width:50,height:50,background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 6px 20px rgba(29,78,216,0.3)` }}>
                  <Wrench size={22} color="#fff"/>
                </div>
                <div>
                  <span className="serif" style={{ color:"#f5f0e8",fontWeight:700,fontSize:22,letterSpacing:"-0.5px",display:"block" }}>Dibnow</span>
                  <span style={{ color:ACCENT,fontSize:10,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase",display:"block",fontFamily:"'DM Sans',sans-serif" }}>RepairSaaS</span>
                </div>
              </Link>
              <p style={{ color:"#57534e",fontSize:14,lineHeight:1.9,maxWidth:280,fontFamily:"'DM Sans',sans-serif" }}>
                The all-in-one platform for modern repair shops. Built with love for technicians, owners, and customers.
              </p>
              <div style={{ display:"flex",gap:10,marginTop:24 }}>
                {["T","L","G"].map(s => (
                  <div key={s} style={{ width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#57534e",fontSize:13,fontWeight:700,transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif" }}>{s}</div>
                ))}
              </div>
            </div>
            {[
              { heading:"Product", links:["Features","Pricing","Changelog","Roadmap","Status"] },
              { heading:"Company", links:["About","Blog","Careers","Press","Contact"] },
              { heading:"Legal",   links:["Privacy Policy","Terms","Cookie Policy","GDPR","Security"] },
            ].map(col => (
              <div key={col.heading}>
                <h4 className="serif" style={{ color:"#d6cdc4",fontWeight:700,fontSize:14,marginBottom:26 }}>{col.heading}</h4>
                {col.links.map(l => (
                  <div key={l} style={{ marginBottom:14 }}>
                    <span style={{ color:"#57534e",fontSize:14,fontWeight:500,cursor:"pointer",transition:"color 0.2s",fontFamily:"'DM Sans',sans-serif" }}
                          onMouseEnter={e => (e.currentTarget.style.color="#d6cdc4")}
                          onMouseLeave={e => (e.currentTarget.style.color="#57534e")}>{l}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
            <span style={{ color:"#44403c",fontSize:13,fontFamily:"'DM Sans',sans-serif" }}>© 2026 DibnowRepairSaaS by Clicktake Technologies. All rights reserved.</span>
            <div style={{ display:"flex",alignItems:"center",gap:24 }}>
              <span style={{ color:"#44403c",fontSize:13,fontFamily:"'DM Sans',sans-serif" }}>Made with ❤️ in Pakistan</span>
              <div style={{ display:"flex",gap:7,alignItems:"center" }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 10px #22c55e" }}/>
                <span style={{ color:"#44403c",fontSize:12,fontFamily:"'DM Sans',sans-serif" }}>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
