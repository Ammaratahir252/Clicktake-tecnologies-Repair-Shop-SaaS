"use client";

import { useState } from "react";
import axios from "axios";
import { setToken } from "@/lib/auth.helper";
import { getRoleHome } from "@/lib/rbac";
import {
  Eye, EyeOff, Lock, Mail, LogIn, Loader2,
  ShieldCheck, Wrench, ArrowRight, ArrowLeft, Zap, Clock, Star
} from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [isLocked,  setIsLocked]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setIsLocked(false);

    try {
      const res   = await axios.post("/api/auth/login", { email, password });
      const token = res.data.data?.token || res.data.token;
      const user  = res.data.data?.user  || res.data.user;

      if (!token || !user) { setErrorMsg("Authentication failed: Invalid server response."); return; }

      setToken(token, user);
      window.location.replace(getRoleHome(user.role));
    } catch (err: any) {
      const status  = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 423) { setIsLocked(true); setErrorMsg(message || "Account locked. Try again in 15 minutes."); }
      else if (status === 401) setErrorMsg(message || "Invalid credentials. Please check your details.");
      else setErrorMsg(message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Zap,   text: "Real-time repair tracking" },
    { icon: Clock, text: "Live job & delivery updates" },
    { icon: Star,  text: "Multi-role team management" },
  ];

  /* ── Palette (matches landing page) ── */
  const BG     = "#fdf6ee";
  const BG3    = "#f5ede0";
  const ACCENT = "#1d4ed8";
  const ACCENT2= "#1e3a8a";
  const TEXT   = "#1c1917";
  const MUTED  = "#78716c";
  const BORDER = "#e7d9c8";

  return (
    <div style={{ minHeight:"100vh", display:"flex", background: BG, fontFamily:"'DM Sans',system-ui,sans-serif" }}>

      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      <style suppressHydrationWarning>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
        .shake{animation:shake 0.4s ease}
        .fade-up{animation:fadeUp 0.6s ease both}
        .float-badge{animation:float 3.5s ease infinite}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:#bfdbfe;color:#1e3a8a;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:${BG};}
        ::-webkit-scrollbar-thumb{background:${BORDER};border-radius:99px;}
      `}</style>

      {/* ═══ LEFT PANEL — Brand ═══════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex"
        style={{
          width:"50%", flexDirection:"column", justifyContent:"space-between",
          padding:56, position:"relative", overflow:"hidden",
          background:`linear-gradient(160deg,${ACCENT} 0%,${ACCENT2} 55%,#0f172a 100%)`,
        }}
      >
        {/* Decorative rings */}
        <div style={{ position:"absolute",top:"-80px",right:"-80px",width:500,height:500,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.07)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",top:"-40px",right:"-40px",width:350,height:350,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",pointerEvents:"none" }}/>
        {/* Soft blobs */}
        <div style={{ position:"absolute",top:"30%",left:"-80px",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.06) 0%,transparent 70%)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:"-60px",right:"5%",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,0.2) 0%,transparent 70%)",pointerEvents:"none" }}/>

        {/* Hatch pattern */}
        <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.04 }} aria-hidden>
          <defs><pattern id="hatch" patternUnits="userSpaceOnUse" width="40" height="40">
            <path d="M0 40L40 0M-5 5L5-5M35 45L45 35" stroke="#fff" strokeWidth="0.8" fill="none"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#hatch)"/>
        </svg>

        {/* Logo */}
        <div style={{ position:"relative",zIndex:1 }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:52,height:52,background:"rgba(255,255,255,0.15)",borderRadius:16,
              border:"1px solid rgba(255,255,255,0.2)",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:"0 8px 24px rgba(0,0,0,0.2)",transform:"rotate(-4deg)" }}>
              <Wrench color="#fff" size={22}/>
            </div>
            <div>
              <p style={{ color:"#fff",fontWeight:800,fontSize:22,letterSpacing:"-0.5px",lineHeight:1,fontFamily:"'DM Serif Display',Georgia,serif" }}>Dibnow</p>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:10,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase" }}>RepairSaaS</p>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position:"relative",zIndex:1 }}>
          <h1 style={{ color:"#fff",fontWeight:700,fontSize:"clamp(34px,3.5vw,54px)",lineHeight:1.1,letterSpacing:"-1.5px",marginBottom:20,fontFamily:"'DM Serif Display',Georgia,serif" }}>
            Welcome back<br/>
            <em style={{ fontStyle:"italic",background:"linear-gradient(90deg,#93c5fd,#c4b5fd)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
              to your shop.
            </em>
          </h1>
          <p style={{ color:"rgba(255,255,255,0.55)",fontSize:16,lineHeight:1.8,maxWidth:340,marginBottom:44 }}>
            From intake to delivery — track every repair, manage your team, and keep customers in the loop.
          </p>

          {/* Feature pills */}
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            {features.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display:"flex",alignItems:"center",gap:14 }}>
                <div style={{ width:40,height:40,background:"rgba(255,255,255,0.1)",borderRadius:12,
                  border:"1px solid rgba(255,255,255,0.15)",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <Icon size={17} color="rgba(255,255,255,0.85)"/>
                </div>
                <span style={{ color:"rgba(255,255,255,0.8)",fontWeight:600,fontSize:14 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        

        {/* Footer */}
        <div style={{ position:"relative",zIndex:1 }}>
          <p style={{ color:"rgba(255,255,255,0.2)",fontSize:12 }}>© 2026 DibnowRepairSaaS · All rights reserved</p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Form ═══════════════════════════════════════════════ */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",background:BG,minHeight:"100vh",overflowY:"auto" }}>

        {/* Mobile logo */}
        <div style={{ display:"none",alignItems:"center",gap:12,marginBottom:32 }} className="lg:hidden mobile-logo">
          <div style={{ width:40,height:40,background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Wrench color="#fff" size={18}/>
          </div>
          <p style={{ color:TEXT,fontWeight:900,fontSize:18,fontFamily:"'DM Serif Display',Georgia,serif" }}>DibnowRepairSaaS</p>
        </div>

        <div style={{ width:"100%",maxWidth:440 }}>

          {/* Back */}
          <div className="fade-up" style={{ marginBottom:28 }}>
            <Link href="/" style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:13,fontWeight:700,color:MUTED,textDecoration:"none",transition:"color 0.2s" }}
              onMouseEnter={e=>(e.currentTarget.style.color=TEXT)} onMouseLeave={e=>(e.currentTarget.style.color=MUTED)}>
              <ArrowLeft size={15}/> Back to Home
            </Link>
          </div>

          {/* Heading */}
          <div className="fade-up" style={{ marginBottom:36,animationDelay:"0.05s" }}>
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,
              background:"#dbeafe",border:"1px solid rgba(29,78,216,0.2)",
              borderRadius:999,padding:"7px 16px",marginBottom:18 }}>
              <ShieldCheck size={13} color={ACCENT}/>
              <span style={{ color:ACCENT,fontSize:11,fontWeight:800,letterSpacing:"0.08em" }}>SECURE LOGIN</span>
            </div>
            <h2 style={{ color:TEXT,fontWeight:700,fontSize:"clamp(30px,4vw,44px)",lineHeight:1.1,letterSpacing:"-1.2px",marginBottom:10,fontFamily:"'DM Serif Display',Georgia,serif" }}>
              Welcome back
            </h2>
            <p style={{ color:MUTED,fontSize:15,fontWeight:500,lineHeight:1.6 }}>
              Sign in to your repair shop portal to continue.
            </p>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="shake" style={{
              padding:"14px 16px",borderRadius:14,fontSize:13,marginBottom:22,
              fontWeight:700,textAlign:"center",
              background: isLocked ? "rgba(249,115,22,0.08)" : "rgba(239,68,68,0.08)",
              color: isLocked ? "#ea580c" : "#dc2626",
              border: isLocked ? "1px solid rgba(249,115,22,0.2)" : "1px solid rgba(239,68,68,0.2)",
            }}>
              {isLocked && "🔒 "}{errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display:"flex",flexDirection:"column",gap:20 }}>

            {/* Email */}
            <div className="fade-up" style={{ animationDelay:"0.1s" }}>
              <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>
                Email Address
              </label>
              <div style={{ position:"relative" }}>
                <Mail size={15} style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                <input
                  type="email" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width:"100%",paddingLeft:44,paddingRight:16,paddingTop:14,paddingBottom:14,
                    borderRadius:14,border:`1.5px solid ${BORDER}`,background:"#fff",
                    color:TEXT,fontSize:14,fontWeight:500,outline:"none",
                    fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s" }}
                  onFocus={e=>{ e.target.style.borderColor=ACCENT; e.target.style.boxShadow=`0 0 0 3px rgba(29,78,216,0.12)` }}
                  onBlur={e=>{ e.target.style.borderColor=BORDER; e.target.style.boxShadow="none" }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="fade-up" style={{ animationDelay:"0.15s" }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8 }}>
                <label style={{ fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em" }}>
                  Password
                </label>
                <Link href="/forgot-password" style={{ fontSize:12,fontWeight:700,color:ACCENT,textDecoration:"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.opacity="0.75")} onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position:"relative" }}>
                <Lock size={15} style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                <input
                  type={showPw ? "text" : "password"} placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ width:"100%",paddingLeft:44,paddingRight:48,paddingTop:14,paddingBottom:14,
                    borderRadius:14,border:`1.5px solid ${BORDER}`,background:"#fff",
                    color:TEXT,fontSize:14,fontWeight:500,outline:"none",
                    fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s" }}
                  onFocus={e=>{ e.target.style.borderColor=ACCENT; e.target.style.boxShadow=`0 0 0 3px rgba(29,78,216,0.12)` }}
                  onBlur={e=>{ e.target.style.borderColor=BORDER; e.target.style.boxShadow="none" }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:MUTED,padding:4 }}>
                  {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="fade-up" style={{ animationDelay:"0.2s" }}>
              <button
                type="submit"
                disabled={isLoading || isLocked}
                style={{
                  width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,
                  padding:"16px 24px",borderRadius:14,border:"none",cursor: isLoading||isLocked ? "not-allowed" : "pointer",
                  fontWeight:800,fontSize:15,color:"#fff",fontFamily:"'DM Sans',sans-serif",
                  background: isLoading||isLocked ? "#94a3b8" : `linear-gradient(135deg,${ACCENT} 0%,${ACCENT2} 100%)`,
                  boxShadow: isLoading||isLocked ? "none" : `0 10px 32px rgba(29,78,216,0.28)`,
                  transition:"all 0.2s",opacity: isLoading||isLocked ? 0.6 : 1,
                }}
                onMouseEnter={e=>{ if(!isLoading&&!isLocked){ (e.currentTarget as HTMLButtonElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow=`0 14px 40px rgba(29,78,216,0.35)` }}}
                onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform="translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow=isLoading||isLocked?"none":`0 10px 32px rgba(29,78,216,0.28)` }}
              >
                {isLoading
                  ? <><Loader2 size={18} style={{ animation:"spin 1s linear infinite" }}/><span>Signing in…</span></>
                  : <><LogIn size={17}/><span>Sign In</span><ArrowRight size={15} style={{ opacity:0.7 }}/></>
                }
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="fade-up" style={{ display:"flex",alignItems:"center",gap:12,margin:"28px 0",animationDelay:"0.25s" }}>
            <div style={{ flex:1,borderTop:`1px solid ${BORDER}` }}/>
            <span style={{ fontSize:11,color:MUTED,fontWeight:700 }}>OR</span>
            <div style={{ flex:1,borderTop:`1px solid ${BORDER}` }}/>
          </div>

          {/* Register link */}
          <div className="fade-up" style={{ textAlign:"center",animationDelay:"0.3s" }}>
            <span style={{ color:MUTED,fontSize:14 }}>Don&apos;t have an account? </span>
            <Link href="/register" style={{ color:ACCENT,fontWeight:800,fontSize:14,textDecoration:"none" }}
              onMouseEnter={e=>(e.currentTarget.style.opacity="0.75")} onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
              Create Account →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}