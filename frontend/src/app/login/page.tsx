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
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [isLoading,   setIsLoading]   = useState(false);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [isLocked,    setIsLocked]    = useState(false);

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

  return (
    <div className="min-h-screen flex bg-background">

      {/* ═══ LEFT PANEL — Brand / Features ═══════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a1f35 0%, #212631 50%, #1D222B 100%)" }}
      >
        {/* Decorative blobs */}
        <div style={{ position:"absolute",top:"-80px",left:"-80px",width:"360px",height:"360px",
          background:"radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)",
          borderRadius:"50%", pointerEvents:"none" }} />
        <div style={{ position:"absolute",bottom:"-60px",right:"-60px",width:"300px",height:"300px",
          background:"radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
          borderRadius:"50%", pointerEvents:"none" }} />
        <div style={{ position:"absolute",top:"40%",right:"10%",width:"200px",height:"200px",
          background:"radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)",
          borderRadius:"50%", pointerEvents:"none" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div style={{ width:44,height:44,background:"linear-gradient(135deg,#3b82f6,#6366f1)",
              borderRadius:14, display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:"0 8px 24px rgba(59,130,246,0.35)" }}>
              <Wrench className="text-white w-5 h-5" />
            </div>
            <div>
              <p style={{ color:"#fff",fontWeight:900,fontSize:18,letterSpacing:"-0.5px",lineHeight:1 }}>
                Dibnow
              </p>
              <p style={{ color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:700,
                letterSpacing:"0.12em",textTransform:"uppercase" }}>
                RepairSaaS
              </p>
            </div>
          </div>
        </div>

        {/* Main hero text */}
        <div className="relative z-10">
          <h1 style={{ color:"#fff",fontWeight:900,fontSize:"clamp(32px,4vw,52px)",
            lineHeight:1.1,letterSpacing:"-1.5px",marginBottom:20 }}>
            Manage your<br />
            <span style={{ background:"linear-gradient(90deg,#60a5fa,#a78bfa)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
              repair shop
            </span><br />
            smarter.
          </h1>
          <p style={{ color:"rgba(255,255,255,0.5)",fontSize:16,lineHeight:1.7,maxWidth:360,marginBottom:40 }}>
            From intake to delivery — track every repair, manage your team,
            and keep customers in the loop.
          </p>

          {/* Feature pills */}
          <div className="flex flex-col gap-3">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div style={{ width:36,height:36,
                  background:"rgba(59,130,246,0.15)",borderRadius:10,
                  border:"1px solid rgba(59,130,246,0.25)",
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                  <Icon size={16} style={{ color:"#60a5fa" }} />
                </div>
                <span style={{ color:"rgba(255,255,255,0.75)",fontWeight:600,fontSize:14 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom credit */}
        <div className="relative z-10">
          <p style={{ color:"rgba(255,255,255,0.2)",fontSize:12 }}>
            © 2026 DibnowRepairSaaS · All rights reserved
          </p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Login Form ═════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-background min-h-screen">

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-8">
          <div style={{ width:36,height:36,background:"linear-gradient(135deg,#3b82f6,#6366f1)",
            borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <Wrench className="text-white w-4 h-4" />
          </div>
          <p className="text-foreground font-black text-lg">DibnowRepairSaaS</p>
        </div>

        <div className="w-full max-w-md">

          {/* Back to home */}
          <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={15} />
              Back to Home
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <div style={{ display:"inline-flex",alignItems:"center",gap:8,
              background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.2)",
              borderRadius:999,padding:"6px 14px",marginBottom:16 }}>
              <ShieldCheck size={13} className="text-blue-500" />
              <span style={{ color:"#60a5fa",fontSize:12,fontWeight:700,letterSpacing:"0.05em" }}>
                SECURE LOGIN
              </span>
            </div>
            <h2 className="text-foreground font-black text-3xl sm:text-4xl leading-tight mb-2"
                style={{ letterSpacing:"-1px" }}>
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm font-medium">
              Sign in to your repair shop portal to continue.
            </p>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className={`p-3.5 rounded-xl text-sm mb-5 font-semibold text-center shake border ${
              isLocked
                ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              {isLocked && "🔒 "}{errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border bg-card text-foreground
                             placeholder:text-muted-foreground text-sm font-medium outline-none
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Password
                </label>
                <Link href="/forgot-password"
                      className="text-xs font-semibold text-blue-500 hover:text-blue-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-border bg-card text-foreground
                             placeholder:text-muted-foreground text-sm font-medium outline-none
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                             transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || isLocked}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl
                         font-bold text-sm text-white transition-all duration-200
                         active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: isLoading || isLocked
                ? "rgba(100,116,139,0.4)"
                : "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                boxShadow: isLoading || isLocked ? "none" : "0 8px 24px rgba(59,130,246,0.35)" }}
            >
              {isLoading ? (
                <><Loader2 size={18} className="animate-spin" /><span>Signing in…</span></>
              ) : (
                <><LogIn size={18} /><span>Sign In</span><ArrowRight size={16} className="ml-1 opacity-70" /></>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground font-semibold">OR</span>
            <div className="flex-1 border-t border-border" />
          </div>

          {/* Register link */}
          <div className="text-center">
            <span className="text-muted-foreground text-sm">Don't have an account? </span>
            <Link href="/register"
                  className="text-blue-500 font-bold text-sm hover:text-blue-400 transition-colors underline-offset-4 hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}