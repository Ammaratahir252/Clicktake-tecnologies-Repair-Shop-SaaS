"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  Mail, ArrowLeft, Loader2, KeyRound, Copy, CheckCheck,
  ArrowRight, Sparkles, ShieldAlert, Wrench, Clock, CheckCircle, ShieldCheck
} from "lucide-react";

type Stage = "form" | "success";

export default function ForgotPasswordPage() {
  const [email,      setEmail]      = useState("");
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState("");
  const [stage,      setStage]      = useState<Stage>("form");
  const [resetToken, setResetToken] = useState("");
  const [copied,     setCopied]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res   = await axios.post("/api/auth/forgot-password", { email });
      const token = res.data?.data?.resetToken || res.data?.resetToken;
      if (token) { setResetToken(token); setStage("success"); }
      else setError("Reset link generated but token missing. Check backend logs.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(resetToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  /* ── Palette (exact match to login page) ── */
  const BG     = "#fdf6ee";
  const BG2    = "#fef9f3";
  const BG3    = "#f5ede0";
  const ACCENT = "#1d4ed8";
  const ACCENT2= "#1e3a8a";
  const TEXT   = "#1c1917";
  const MUTED  = "#78716c";
  const BORDER = "#e7d9c8";

  const features = [
    { icon: Clock,        text: "Token expires in 1 hour",        color: "#93c5fd", bg: "rgba(147,197,253,0.12)" },
    { icon: ShieldAlert,  text: "One token per email request",     color: "#fcd34d", bg: "rgba(252,211,77,0.12)"  },
    { icon: CheckCircle,  text: "Safe & encrypted reset process",  color: "#86efac", bg: "rgba(134,239,172,0.12)" },
  ];

  return (
    <div style={{ minHeight:"100vh", display:"flex", background:BG, fontFamily:"'DM Sans',system-ui,sans-serif" }}>

      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      <style suppressHydrationWarning>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
        .shake{animation:shake 0.4s ease}
        .fade-up{animation:fadeUp 0.6s ease both}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:#bfdbfe;color:#1e3a8a;}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-track{background:${BG};}
        ::-webkit-scrollbar-thumb{background:${BORDER};border-radius:99px;}
      `}</style>

      {/* ═══ LEFT PANEL — Brand (identical structure to login) ═══════════════ */}
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

        {/* Logo — exact copy from login */}
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
            {stage === "form" ? (
              <>Forgot your<br/>
              <em style={{ fontStyle:"italic",background:"linear-gradient(90deg,#93c5fd,#fcd34d)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
                password?
              </em></>
            ) : (
              <>Token sent<br/>
              <em style={{ fontStyle:"italic",background:"linear-gradient(90deg,#86efac,#93c5fd)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
                successfully.
              </em></>
            )}
          </h1>
          <p style={{ color:"rgba(255,255,255,0.55)",fontSize:16,lineHeight:1.8,maxWidth:340,marginBottom:44 }}>
            {stage === "form"
              ? "No worries — enter your email and we'll generate a secure reset token for you right away."
              : "Your reset token is ready. Copy it and use it on the next screen to set a new password."}
          </p>

          {/* Feature pills — same style as login */}
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            {features.map(({ icon:Icon, text, color, bg }) => (
              <div key={text} style={{ display:"flex",alignItems:"center",gap:14 }}>
                <div style={{ width:40,height:40,background:bg,borderRadius:12,
                  border:`1px solid ${color}30`,
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <Icon size={17} color={color}/>
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

          {/* Back — same style as login */}
          <div className="fade-up" style={{ marginBottom:28 }}>
            <Link href="/login" style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:13,fontWeight:700,color:MUTED,textDecoration:"none",transition:"color 0.2s" }}
              onMouseEnter={e=>(e.currentTarget.style.color=TEXT)} onMouseLeave={e=>(e.currentTarget.style.color=MUTED)}>
              <ArrowLeft size={15}/> Back to Login
            </Link>
          </div>

          {/* Heading — same badge style as login */}
          <div className="fade-up" style={{ marginBottom:36,animationDelay:"0.05s" }}>
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,
              background: stage==="success" ? "#d1fae5" : "#fef3c7",
              border: stage==="success" ? "1px solid rgba(6,95,70,0.2)" : "1px solid rgba(245,158,11,0.25)",
              borderRadius:999,padding:"7px 16px",marginBottom:18 }}>
              <KeyRound size={13} color={stage==="success"?"#065f46":"#d97706"}/>
              <span style={{ color:stage==="success"?"#065f46":"#d97706",fontSize:11,fontWeight:800,letterSpacing:"0.08em" }}>
                {stage==="success" ? "TOKEN READY" : "PASSWORD RESET"}
              </span>
            </div>
            <h2 style={{ color:TEXT,fontWeight:700,fontSize:"clamp(30px,4vw,44px)",lineHeight:1.1,letterSpacing:"-1.2px",marginBottom:10,fontFamily:"'DM Serif Display',Georgia,serif" }}>
              {stage==="form" ? "Forgot password?" : "Check your token"}
            </h2>
            <p style={{ color:MUTED,fontSize:15,fontWeight:500,lineHeight:1.6 }}>
              {stage==="form"
                ? "Enter your email address and we'll send you a reset token."
                : "Copy this token and use it to reset your password."}
            </p>
          </div>

          {/* ── FORM stage ── */}
          {stage === "form" && (
            <div className="fade-up" style={{ animationDelay:"0.1s" }}>
              {error && (
                <div className="shake" style={{ padding:"14px 16px",borderRadius:14,fontSize:13,marginBottom:22,fontWeight:700,textAlign:"center",background:"rgba(239,68,68,0.08)",color:"#dc2626",border:"1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:20 }}>

                {/* Email — same field style as login */}
                <div>
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

                {/* Submit — exact same button style as login */}
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,
                      padding:"16px 24px",borderRadius:14,border:"none",cursor:isLoading?"not-allowed":"pointer",
                      fontWeight:800,fontSize:15,color:"#fff",fontFamily:"'DM Sans',sans-serif",
                      background:isLoading?"#94a3b8":`linear-gradient(135deg,${ACCENT} 0%,${ACCENT2} 100%)`,
                      boxShadow:isLoading?"none":`0 10px 32px rgba(29,78,216,0.28)`,
                      transition:"all 0.2s",opacity:isLoading?0.6:1,
                    }}
                    onMouseEnter={e=>{ if(!isLoading){ (e.currentTarget as HTMLButtonElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow=`0 14px 40px rgba(29,78,216,0.35)` }}}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform="translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow=isLoading?"none":`0 10px 32px rgba(29,78,216,0.28)` }}
                  >
                    {isLoading
                      ? <><Loader2 size={18} style={{ animation:"spin 1s linear infinite" }}/><span>Generating Token…</span></>
                      : <><KeyRound size={17}/><span>Send Reset Token</span><ArrowRight size={15} style={{ opacity:0.7 }}/></>
                    }
                  </button>
                </div>
              </form>

              {/* Divider — same as login */}
              <div style={{ display:"flex",alignItems:"center",gap:12,margin:"28px 0" }}>
                <div style={{ flex:1,borderTop:`1px solid ${BORDER}` }}/>
                <span style={{ fontSize:11,color:MUTED,fontWeight:700 }}>OR</span>
                <div style={{ flex:1,borderTop:`1px solid ${BORDER}` }}/>
              </div>

              <div style={{ textAlign:"center" }}>
                <span style={{ color:MUTED,fontSize:14 }}>Remember your password? </span>
                <Link href="/login" style={{ color:ACCENT,fontWeight:800,fontSize:14,textDecoration:"none" }}
                  onMouseEnter={e=>(e.currentTarget.style.opacity="0.75")} onMouseLeave={e=>(e.currentTarget.style.opacity="1")}>
                  Back to Sign In →
                </Link>
              </div>
            </div>
          )}

          {/* ── SUCCESS stage ── */}
          {stage === "success" && (
            <div className="fade-up" style={{ animationDelay:"0.1s",display:"flex",flexDirection:"column",gap:16 }}>

              {/* Token box */}
              <div style={{ background:"#fff",border:`1.5px solid ${BORDER}`,borderRadius:18,padding:20,boxShadow:"0 4px 20px rgba(28,25,23,0.06)" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
                  <div style={{ width:30,height:30,borderRadius:8,background:"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <ShieldAlert size={14} color="#d97706"/>
                  </div>
                  <p style={{ fontSize:11,fontWeight:800,color:"#d97706",textTransform:"uppercase",letterSpacing:"0.08em" }}>Your Reset Token</p>
                  <span style={{ marginLeft:"auto",fontSize:11,fontWeight:600,color:MUTED,background:BG3,padding:"3px 9px",borderRadius:99,border:`1px solid ${BORDER}` }}>Testing Mode</span>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:10,background:BG2,borderRadius:12,padding:"12px 14px",border:`1px solid ${BORDER}` }}>
                  <code style={{ flex:1,fontSize:11,fontFamily:"'DM Mono',Courier,monospace",color:TEXT,wordBreak:"break-all",lineHeight:1.6,userSelect:"all" }}>
                    {resetToken}
                  </code>
                  <button onClick={copyToken}
                    style={{ flexShrink:0,padding:"8px 10px",borderRadius:9,background:copied?"#d1fae5":"#dbeafe",border:copied?"1px solid rgba(6,95,70,0.2)":"1px solid rgba(29,78,216,0.2)",cursor:"pointer",transition:"all 0.2s" }}>
                    {copied ? <CheckCheck size={16} color="#065f46"/> : <Copy size={16} color={ACCENT}/>}
                  </button>
                </div>
              </div>

              {/* Notice */}
              <div style={{ background:"#fef3c7",border:"1px solid rgba(245,158,11,0.25)",borderRadius:14,padding:"14px 16px",display:"flex",gap:10,alignItems:"flex-start" }}>
                <Sparkles size={14} color="#d97706" style={{ flexShrink:0,marginTop:1 }}/>
                <div>
                  <p style={{ fontSize:12,fontWeight:800,color:"#92400e",marginBottom:4 }}>⏰ Token expires in 1 hour</p>
                  <p style={{ fontSize:12,color:"#a16207",lineHeight:1.55 }}>Email delivery will replace this once a mail provider is configured.</p>
                </div>
              </div>

              {/* CTA — same button style */}
              <Link href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"16px 24px",borderRadius:14,textDecoration:"none",fontWeight:800,fontSize:15,color:"#fff",fontFamily:"'DM Sans',sans-serif",background:`linear-gradient(135deg,${ACCENT} 0%,${ACCENT2} 100%)`,boxShadow:`0 10px 32px rgba(29,78,216,0.28)`,transition:"all 0.2s" }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLAnchorElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow=`0 14px 40px rgba(29,78,216,0.35)` }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLAnchorElement).style.transform="none"; (e.currentTarget as HTMLAnchorElement).style.boxShadow=`0 10px 32px rgba(29,78,216,0.28)` }}>
                <span>Go to Reset Password</span><ArrowRight size={16}/>
              </Link>

              <button onClick={() => { setStage("form"); setError(""); setResetToken(""); setEmail(""); }}
                style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:MUTED,fontWeight:700,padding:"8px 0",fontFamily:"'DM Sans',sans-serif" }}
                onMouseEnter={e=>(e.currentTarget.style.color=TEXT)} onMouseLeave={e=>(e.currentTarget.style.color=MUTED)}>
                ← Try a different email
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}