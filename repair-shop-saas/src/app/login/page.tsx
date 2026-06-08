"use client";

import { useState } from "react";
import axios from "axios";
import { setToken } from "@/lib/auth.helper";
import { getRoleHome } from "@/lib/rbac";
import { Eye, EyeOff, Lock, Mail, LogIn, Loader2 } from "lucide-react";
import Link from "next/link";

/**
 * LOGIN PAGE — Role-Based Routing
 *
 * After login, each role goes to their own dashboard:
 *   super_admin → /dashboard/super-admin  (all tenants)
 *   owner       → /dashboard/owner        (full shop access)
 *   manager     → /dashboard/manager      (ops management)
 *   frontdesk   → /dashboard/frontdesk    (ticket intake only)
 *   technician  → /dashboard/technician   (assigned tickets only)
 *   customer    → /dashboard/customer     (self-service portal)
 *   driver      → /dashboard/driver       (delivery jobs only)
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setIsLocked(false);

    try {
      const response = await axios.post("/api/auth/login", { email, password });
      const token = response.data.data?.token || response.data.token;
      const user  = response.data.data?.user  || response.data.user;

      if (!token || !user) {
        setErrorMessage("Authentication failed: Invalid response from server.");
        return;
      }

      // Persist token + full user object (needed for x-tenant-id headers)
      setToken(token, user);

      // ── Send each role to their own dashboard ──────────────────────────
      const destination = getRoleHome(user.role);
      window.location.replace(destination);
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 423) {
        setIsLocked(true);
        setErrorMessage(message || "Account locked. Too many failed attempts. Try again in 15 minutes.");
      } else if (status === 401) {
        setErrorMessage(message || "Invalid credentials. Please verify your details.");
      } else {
        setErrorMessage(message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 text-black font-sans">
      <div className="bg-white p-10 rounded-[32px] shadow-2xl shadow-blue-100/50 w-full max-w-md border border-slate-100">
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-200">
            <LogIn className="text-white w-7 h-7" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-slate-500 mt-2 font-medium">Sign in to manage your shop portal</p>
        </div>

        {errorMessage && (
          <div className={`p-4 rounded-2xl text-sm mb-6 border text-center font-semibold ${
            isLocked 
              ? "bg-orange-50 text-orange-700 border-orange-200" 
              : "bg-red-50 text-red-600 border-red-100"
          }`}>
            {isLocked && "🔒 "}
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="group">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Business Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input type="email" placeholder="Enter business email"
                className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-black outline-none transition-all placeholder:text-slate-300"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className="group">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-400 uppercase ml-1 tracking-widest">Access Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input type={showPassword ? "text" : "password"} placeholder="Enter secure password"
                className="w-full p-4 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-black outline-none transition-all placeholder:text-slate-300"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading || isLocked}
            className="w-full bg-slate-900 text-white font-bold p-4 rounded-2xl hover:bg-blue-600 disabled:bg-slate-300 transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2">
            {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Authenticating...</span></>) : "Secure Login"}
          </button>
        </form>

        <div className="mt-10 text-center text-sm text-slate-400 font-semibold uppercase tracking-tighter">
          No account?{" "}
          <Link href="/register" className="text-blue-600 font-bold hover:text-blue-800 transition-colors underline-offset-4 hover:underline">
            Register Business
          </Link>
        </div>
      </div>
    </div>
  );
}