"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { setToken, isLoggedIn } from "@/lib/auth.helper";
import { Shield, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [checking, setChecking] = useState(true);

  // If already logged in as super_admin, go straight to admin dashboard
  useEffect(() => {
    try {
      if (isLoggedIn()) {
        const raw = localStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          if (u?.role === "super_admin") {
            window.location.replace("/dashboard/super-admin");
            return;
          }
        }
      }
    } catch {}
    setChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const user = res.data?.data?.user ?? res.data?.user;

      if (!user) throw new Error("No user data returned.");

      if (user.role !== "super_admin") {
        setError("Access denied. This portal is for platform administrators only.");
        setLoading(false);
        return;
      }

      const token = res.data?.data?.token ?? res.data?.token;
      setToken(token, {
        id:       user._id ?? user.id,
        _id:      user._id ?? user.id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        tenantId: user.tenantId ?? user._id ?? user.id,
      });

      window.location.replace("/dashboard/super-admin");
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message;
      if (msg?.toLowerCase().includes("invalid") || msg?.toLowerCase().includes("credentials")) {
        setError("Invalid email or password.");
      } else if (err.response?.status === 423) {
        setError("Account locked. Too many failed attempts.");
      } else {
        setError(msg || "Login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1117]">
        <Loader2 className="animate-spin text-slate-600 w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1117] px-4">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-900/40 mb-4">
            <Shield className="text-white w-7 h-7" />
          </div>
          <h1 className="text-white text-xl font-black tracking-tight">Platform Admin</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">DibnowRepairSaaS</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1f2e] border border-white/[0.07] rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white font-bold text-base mb-6">Sign in to admin panel</h2>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm font-medium leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full bg-[#0f1117] border border-white/10 text-white placeholder:text-slate-600 rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full bg-[#0f1117] border border-white/10 text-white placeholder:text-slate-600 rounded-xl pl-10 pr-11 py-3 text-sm font-medium focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-900/30 mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              ) : (
                <><Shield size={16} /> Access Admin Panel</>
              )}
            </button>
          </form>
        </div>

        {/* Silent footer — no public link */}
        <p className="text-center text-slate-700 text-xs mt-6 font-medium">
          Restricted access · All sessions are logged
        </p>
      </div>
    </div>
  );
}
