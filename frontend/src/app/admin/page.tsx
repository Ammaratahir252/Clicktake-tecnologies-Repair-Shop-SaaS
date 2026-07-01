"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { setToken, isLoggedIn } from "@/lib/auth.helper";
import { getRoleHome } from "@/lib/rbac";
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
            window.location.replace(getRoleHome("super_admin"));
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
      // Use axios directly (not the api instance) to avoid the global 401 interceptor
      // that redirects to /login — wrong-password should show an error here, not redirect.
      const res  = await axios.post("/api/auth/login", { email, password });
      const user  = res.data?.data?.user  ?? res.data?.user;
      const token = res.data?.data?.token ?? res.data?.token;

      if (!user || !token) throw new Error("Invalid server response.");

      if (user.role !== "super_admin") {
        setError("Access denied. This portal is for platform administrators only.");
        setLoading(false);
        return;
      }

      setToken(token, {
        id:       user._id ?? user.id,
        _id:      user._id ?? user.id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        tenantId: user.tenantId ?? user._id ?? user.id,
      });

      window.location.replace(getRoleHome("super_admin"));
    } catch (err: any) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message ?? err.message;
      if (status === 423) {
        setError("Account locked. Too many failed attempts.");
      } else if (status === 401 || msg?.toLowerCase().includes("invalid") || msg?.toLowerCase().includes("credentials")) {
        setError("Invalid email or password.");
      } else {
        setError(msg || "Login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground w-6 h-6" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-red-600 flex items-center justify-center shadow-xl shadow-red-500/20 mb-4">
            <Shield className="text-white w-7 h-7" />
          </div>
          <h1 className="text-foreground text-xl font-black tracking-tight">Platform Admin</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">DibnowRepairSaaS</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <h2 className="text-card-foreground font-bold text-base mb-6">Sign in to admin panel</h2>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-destructive text-sm font-medium leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full bg-background border border-border text-foreground placeholder:text-muted-foreground rounded-xl pl-10 pr-11 py-3 text-sm font-medium focus:outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
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
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 mt-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Signing in…</>
              ) : (
                <><Shield size={16} /> Access Admin Panel</>
              )}
            </button>
          </form>
        </div>

        {/* Silent footer */}
        <p className="text-center text-muted-foreground/50 text-xs mt-6 font-medium">
          Restricted access · All sessions are logged
        </p>
      </div>
    </div>
  );
}
