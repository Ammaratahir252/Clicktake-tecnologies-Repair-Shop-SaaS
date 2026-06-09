"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  Lock, Eye, EyeOff, KeyRound, Loader2,
  CheckCircle, ArrowLeft, AlertCircle, ShieldCheck, Wrench, ArrowRight
} from "lucide-react";

type Stage = "form" | "success" | "error";

/* ── Palette (matches landing page) ── */
const BG     = "#fdf6ee";
const BG2    = "#fef9f3";
const BG3    = "#f5ede0";
const ACCENT = "#1d4ed8";
const ACCENT2= "#1e3a8a";
const TEXT   = "#1c1917";
const MUTED  = "#78716c";
const BORDER = "#e7d9c8";

function checkStrength(pw: string): { ok: boolean; message: string; score: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length < 8) return { ok:false, message:"Minimum 8 characters", score };
  if (!/[A-Z]/.test(pw)) return { ok:false, message:"At least 1 uppercase letter", score };
  if (!/[0-9]/.test(pw)) return { ok:false, message:"At least 1 number", score };
  if (!/[^A-Za-z0-9]/.test(pw)) return { ok:false, message:"At least 1 special character", score };
  return { ok:true, message:"Strong password ✓", score };
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [token,       setToken]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading,   setIsLoading]   = useState(false);
  const [stage,       setStage]       = useState<Stage>("form");
  const [error,       setError]       = useState("");
  const [countdown,   setCountdown]   = useState(3);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  useEffect(() => {
    if (stage !== "success") return;
    if (countdown <= 0) { window.location.replace("/login"); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, countdown]);

  const strength = checkStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token.trim()) { setError("Reset token is required."); return; }
    if (newPassword !== confirmPw) { setError("Passwords do not match."); return; }
    if (!strength.ok) { setError(strength.message); return; }

    setIsLoading(true);
    try {
      await axios.post("/api/auth/reset-password", { token, newPassword });
      setStage("success");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Reset failed. Token may be expired or invalid.";
      setError(msg);
      if (msg.includes("expired") || msg.includes("invalid")) setStage("error");
    } finally {
      setIsLoading(false);
    }
  };

  /* Stage-based accent */
  const stageAccent  = stage==="success" ? "#065f46" : stage==="error" ? "#dc2626" : ACCENT;
  const stageAccent2 = stage==="success" ? "#022c22" : stage==="error" ? "#991b1b" : ACCENT2;
  const stageBadgeBg = stage==="success" ? "#d1fae5" : stage==="error" ? "rgba(239,68,68,0.08)" : "#dbeafe";
  const stageBadgeCl = stage==="success" ? "#065f46" : stage==="error" ? "#dc2626" : ACCENT;

  return (
    <div style={{ minHeight:"100vh",display:"flex",background:BG,fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      <style suppressHydrationWarning>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
        .shake{animation:shake 0.4s ease}
        .fade-up{animation:fadeUp 0.55s ease both}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:#bfdbfe;color:#1e3a8a;}
      `}</style>

      {/* ═══ LEFT PANEL ═══════════════════════════════════════════════════════ */}
      <div style={{ display:"none" }} className="hidden lg:flex lg:w-[45%]">
        <div style={{
          flex:1,display:"flex",flexDirection:"column",justifyContent:"space-between",
          padding:56,position:"relative",overflow:"hidden",
          background:`linear-gradient(160deg,${stageAccent} 0%,${stageAccent2} 55%,#0f172a 100%)`,
          transition:"background 0.5s ease",
        }}>
          <div style={{ position:"absolute",top:"-80px",right:"-80px",width:500,height:500,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.07)",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",top:"-40px",right:"-40px",width:340,height:340,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",bottom:"-60px",left:"5%",width:380,height:380,borderRadius:"50%",background:"radial-gradient(circle,rgba(255,255,255,0.06) 0%,transparent 70%)",pointerEvents:"none" }}/>
          <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.04 }} aria-hidden>
            <defs><pattern id="hatch4" patternUnits="userSpaceOnUse" width="40" height="40">
              <path d="M0 40L40 0M-5 5L5-5M35 45L45 35" stroke="#fff" strokeWidth="0.8" fill="none"/>
            </pattern></defs>
            <rect width="100%" height="100%" fill="url(#hatch4)"/>
          </svg>

          {/* Logo */}
          <div style={{ position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:52,height:52,background:"rgba(255,255,255,0.15)",borderRadius:16,border:"1px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 24px rgba(0,0,0,0.2)",transform:"rotate(-4deg)" }}>
              <Wrench color="#fff" size={22}/>
            </div>
            <div>
              <p style={{ color:"#fff",fontWeight:700,fontSize:22,letterSpacing:"-0.5px",lineHeight:1,fontFamily:"'DM Serif Display',Georgia,serif" }}>Dibnow</p>
              <p style={{ color:"rgba(255,255,255,0.45)",fontSize:10,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase" }}>RepairSaaS</p>
            </div>
          </div>

          {/* Content */}
          <div style={{ position:"relative",zIndex:1 }}>
            <h1 style={{ color:"#fff",fontWeight:700,fontSize:"clamp(30px,3.2vw,50px)",lineHeight:1.1,letterSpacing:"-1.2px",marginBottom:18,fontFamily:"'DM Serif Display',Georgia,serif" }}>
              {stage==="success" ? (
                <>Password<br/><em style={{ fontStyle:"italic",background:"linear-gradient(90deg,#86efac,#6ee7b7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>updated!</em></>
              ) : stage==="error" ? (
                <>Token<br/><em style={{ fontStyle:"italic",background:"linear-gradient(90deg,#fca5a5,#fcd34d)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>expired.</em></>
              ) : (
                <>Set a new<br/><em style={{ fontStyle:"italic",background:"linear-gradient(90deg,#93c5fd,#c4b5fd)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>password.</em></>
              )}
            </h1>
            <p style={{ color:"rgba(255,255,255,0.5)",fontSize:15,lineHeight:1.75,maxWidth:310,marginBottom:40 }}>
              {stage==="success"
                ? "You're all set! Your password has been successfully updated. Redirecting you to login."
                : stage==="error"
                  ? "Your reset token has expired. Request a new one from the forgot password page."
                  : "Create a strong password with at least 8 characters, including a number and special character."}
            </p>

            {/* Password tips (form state only) */}
            {stage === "form" && (
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {[
                  { text:"Minimum 8 characters" },
                  { text:"One uppercase letter" },
                  { text:"One number & special char" },
                ].map(({ text }) => (
                  <div key={text} style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:8,height:8,borderRadius:"50%",background:"rgba(147,197,253,0.7)",flexShrink:0 }}/>
                    <span style={{ color:"rgba(255,255,255,0.6)",fontSize:14,fontWeight:500 }}>{text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position:"relative",zIndex:1 }}>
            <p style={{ color:"rgba(255,255,255,0.2)",fontSize:12 }}>© 2026 DibnowRepairSaaS</p>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ══════════════════════════════════════════════════════ */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 32px",background:BG,overflowY:"auto" }}>

        {/* Mobile logo */}
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:32 }} className="lg:hidden">
          <div style={{ width:40,height:40,background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Wrench color="#fff" size={18}/>
          </div>
          <p style={{ color:TEXT,fontWeight:700,fontSize:18,fontFamily:"'DM Serif Display',Georgia,serif" }}>DibnowRepairSaaS</p>
        </div>

        <div style={{ width:"100%",maxWidth:420 }}>

          {/* Back */}
          {stage === "form" && (
            <div className="fade-up" style={{ marginBottom:28 }}>
              <Link href="/login" style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:13,fontWeight:700,color:MUTED,textDecoration:"none" }}
                onMouseEnter={e=>(e.currentTarget.style.color=TEXT)} onMouseLeave={e=>(e.currentTarget.style.color=MUTED)}>
                <ArrowLeft size={15}/> Back to Login
              </Link>
            </div>
          )}

          {/* Header badge + title */}
          <div className="fade-up" style={{ marginBottom:32,animationDelay:"0.05s" }}>
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:stageBadgeBg,border:`1px solid ${stageBadgeCl}25`,borderRadius:999,padding:"7px 16px",marginBottom:18 }}>
              {stage==="success" ? <CheckCircle size={13} color={stageBadgeCl}/>
               : stage==="error" ? <AlertCircle size={13} color={stageBadgeCl}/>
               : <ShieldCheck size={13} color={stageBadgeCl}/>}
              <span style={{ color:stageBadgeCl,fontSize:11,fontWeight:800,letterSpacing:"0.08em" }}>
                {stage==="success" ? "PASSWORD UPDATED" : stage==="error" ? "TOKEN EXPIRED" : "RESET PASSWORD"}
              </span>
            </div>
            <h2 style={{ color:TEXT,fontWeight:700,fontSize:"clamp(28px,4vw,42px)",lineHeight:1.1,letterSpacing:"-1.2px",marginBottom:10,fontFamily:"'DM Serif Display',Georgia,serif" }}>
              {stage==="success" ? "All done!" : stage==="error" ? "Token expired" : "New password"}
            </h2>
            <p style={{ color:MUTED,fontSize:15,lineHeight:1.6 }}>
              {stage==="success" ? `Redirecting to login in ${countdown}s…`
               : stage==="error" ? "Your token has expired. Request a new one."
               : "Enter your reset token and a strong new password."}
            </p>
          </div>

          {/* ── SUCCESS ── */}
          {stage === "success" && (
            <div className="fade-up" style={{ animationDelay:"0.1s",display:"flex",flexDirection:"column",gap:16 }}>
              <div style={{ background:"#fff",border:`1.5px solid ${BORDER}`,borderRadius:18,padding:28,textAlign:"center",boxShadow:"0 4px 20px rgba(28,25,23,0.06)" }}>
                <div style={{ width:60,height:60,borderRadius:"50%",background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
                  <CheckCircle size={30} color="#065f46"/>
                </div>
                <p style={{ fontWeight:800,color:TEXT,fontSize:17,marginBottom:8,fontFamily:"'DM Serif Display',Georgia,serif" }}>Password updated!</p>
                <p style={{ fontSize:14,color:MUTED,lineHeight:1.6 }}>You can now log in with your new password.</p>
              </div>
              <Link href="/login"
                style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"16px 24px",borderRadius:14,textDecoration:"none",fontWeight:800,fontSize:15,color:"#fff",fontFamily:"'DM Sans',sans-serif",background:`linear-gradient(135deg,${ACCENT} 0%,${ACCENT2} 100%)`,boxShadow:`0 10px 32px rgba(29,78,216,0.28)`,transition:"all 0.2s" }}>
                Go to Login <ArrowRight size={16}/>
              </Link>
            </div>
          )}

          {/* ── ERROR ── */}
          {stage === "error" && (
            <div className="fade-up shake" style={{ animationDelay:"0.1s",display:"flex",flexDirection:"column",gap:16 }}>
              <div style={{ background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:18,padding:28,textAlign:"center" }}>
                <div style={{ width:60,height:60,borderRadius:"50%",background:"rgba(239,68,68,0.1)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
                  <AlertCircle size={30} color="#dc2626"/>
                </div>
                <p style={{ fontWeight:800,color:TEXT,fontSize:17,marginBottom:8,fontFamily:"'DM Serif Display',Georgia,serif" }}>Token Expired</p>
                <p style={{ fontSize:14,color:MUTED,lineHeight:1.6 }}>Reset tokens expire after 1 hour. Please request a new one.</p>
              </div>
              <Link href="/forgot-password"
                style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"16px 24px",borderRadius:14,textDecoration:"none",fontWeight:800,fontSize:15,color:"#fff",fontFamily:"'DM Sans',sans-serif",background:`linear-gradient(135deg,#d97706 0%,#92400e 100%)`,boxShadow:`0 10px 32px rgba(217,119,6,0.25)`,transition:"all 0.2s" }}>
                <KeyRound size={17}/> Request New Token
              </Link>
            </div>
          )}

          {/* ── FORM ── */}
          {stage === "form" && (
            <div className="fade-up" style={{ animationDelay:"0.1s" }}>
              {error && (
                <div className="shake" style={{ padding:"13px 16px",borderRadius:14,fontSize:13,fontWeight:700,background:"rgba(239,68,68,0.07)",color:"#dc2626",border:"1px solid rgba(239,68,68,0.18)",marginBottom:20 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display:"flex",flexDirection:"column",gap:18 }}>

                {/* Token */}
                <div>
                  <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Reset Token</label>
                  <textarea rows={2} placeholder="Paste your reset token here..."
                    value={token} onChange={e => setToken(e.target.value.trim())} required
                    style={{ width:"100%",padding:"12px 14px",borderRadius:14,border:`1.5px solid ${BORDER}`,background:"#fff",color:TEXT,fontSize:12,fontFamily:"'DM Mono',Courier,monospace",outline:"none",resize:"none",transition:"all 0.2s",lineHeight:1.6 }}
                    onFocus={e=>{ e.target.style.borderColor=ACCENT; e.target.style.boxShadow=`0 0 0 3px rgba(29,78,216,0.12)` }}
                    onBlur={e=>{ e.target.style.borderColor=BORDER; e.target.style.boxShadow="none" }}
                  />
                  <p style={{ fontSize:11,color:MUTED,marginTop:5,marginLeft:2,fontWeight:600 }}>Token auto-fills from the reset link. Expires in 1 hour.</p>
                </div>

                {/* New Password */}
                <div>
                  <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>New Password</label>
                  <div style={{ position:"relative" }}>
                    <Lock size={15} style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                    <input type={showPw?"text":"password"} placeholder="Min 8 chars, 1 uppercase, 1 number…"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                      style={{ width:"100%",paddingLeft:44,paddingRight:48,paddingTop:14,paddingBottom:14,borderRadius:14,border:`1.5px solid ${BORDER}`,background:"#fff",color:TEXT,fontSize:14,fontWeight:500,outline:"none",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s" }}
                      onFocus={e=>{ e.target.style.borderColor=ACCENT; e.target.style.boxShadow=`0 0 0 3px rgba(29,78,216,0.12)` }}
                      onBlur={e=>{ e.target.style.borderColor=BORDER; e.target.style.boxShadow="none" }}
                    />
                    <button type="button" onClick={() => setShowPw(v=>!v)}
                      style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:MUTED }}>
                      {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                  {newPassword && (
                    <div style={{ marginTop:8,paddingLeft:2 }}>
                      <div style={{ display:"flex",gap:4,marginBottom:5 }}>
                        {[1,2,3,4].map(l => (
                          <div key={l} style={{ height:5,flex:1,borderRadius:99,transition:"all 0.3s",
                            background:strength.score>=l?(strength.score<3?"#f59e0b":"#22c55e"):BORDER }}/>
                        ))}
                      </div>
                      <p style={{ fontSize:11,fontWeight:700,color:strength.ok?"#22c55e":"#f59e0b" }}>{strength.message}</p>
                    </div>
                  )}
                </div>

                {/* Confirm */}
                <div>
                  <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Confirm Password</label>
                  <div style={{ position:"relative" }}>
                    <Lock size={15} style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                    <input type={showConfirm?"text":"password"} placeholder="Re-enter new password"
                      value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                      style={{ width:"100%",paddingLeft:44,paddingRight:48,paddingTop:14,paddingBottom:14,borderRadius:14,border:`1.5px solid ${BORDER}`,background:"#fff",color:TEXT,fontSize:14,fontWeight:500,outline:"none",fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s" }}
                      onFocus={e=>{ e.target.style.borderColor=ACCENT; e.target.style.boxShadow=`0 0 0 3px rgba(29,78,216,0.12)` }}
                      onBlur={e=>{ e.target.style.borderColor=BORDER; e.target.style.boxShadow="none" }}
                    />
                    <button type="button" onClick={() => setShowConfirm(v=>!v)}
                      style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:MUTED }}>
                      {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                  {confirmPw && (
                    <p style={{ fontSize:11,marginTop:6,marginLeft:2,fontWeight:700,color:confirmPw===newPassword?"#22c55e":"#ef4444" }}>
                      {confirmPw===newPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading}
                  style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"16px 24px",borderRadius:14,border:"none",cursor:isLoading?"not-allowed":"pointer",fontWeight:800,fontSize:15,color:"#fff",fontFamily:"'DM Sans',sans-serif",background:isLoading?"#94a3b8":`linear-gradient(135deg,${ACCENT} 0%,${ACCENT2} 100%)`,boxShadow:isLoading?"none":`0 10px 32px rgba(29,78,216,0.28)`,transition:"all 0.2s",opacity:isLoading?0.6:1,marginTop:4 }}>
                  {isLoading
                    ? <><Loader2 size={18} style={{ animation:"spin 1s linear infinite" }}/><span>Updating Password…</span></>
                    : <><ShieldCheck size={17}/><span>Reset My Password</span><ArrowRight size={15} style={{ opacity:0.7 }}/></>
                  }
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}