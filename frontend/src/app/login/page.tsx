"use client";

import { useState } from "react";
import axios from "axios";
import { setToken } from "@/lib/auth.helper";
import { getRoleHome } from "@/lib/rbac";
import { Eye, EyeOff, Lock, Mail, LogIn, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * ENHANCED LOGIN PAGE — Beautiful Design with Animations
 * 
 * Features:
 * - Smooth animations and transitions
 * - Gradient backgrounds
 * - Glass morphism effects
 * - Interactive hover states
 * - Role-based routing after login
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

      // Persist token + full user object
      setToken(token, user);

      // Redirect to role-specific dashboard
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md scale-in">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-[2.5rem] blur-2xl opacity-20"></div>
        
        <div className="relative bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/20">
          {/* Header */}
          <div className="text-center mb-8 slide-in-top">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl">
                <ShieldCheck className="text-white w-8 h-8" />
              </div>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-slate-700 font-medium flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Sign in to your repair shop portal
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className={`p-4 rounded-2xl text-sm mb-6 border text-center font-semibold shake ${
              isLocked 
                ? "bg-orange-50 text-orange-700 border-orange-200" 
                : "bg-red-50 text-red-600 border-red-100"
            }`}>
              {isLocked && "🔒 "}
              {errorMessage}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div className="group slide-in-left" style={{ animationDelay: "0.1s" }}>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-10 transition-opacity duration-300"></div>
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
                <input 
                  type="email" 
                  placeholder="your@email.com"
                  className="relative w-full p-4 pl-12 bg-slate-50/50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group slide-in-left" style={{ animationDelay: "0.2s" }}>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase ml-1 tracking-wider">
                  Password
                </label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs font-semibold text-blue-600 hover:text-purple-600 transition-colors duration-300"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-10 transition-opacity duration-300"></div>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter your password"
                  className="relative w-full p-4 pl-12 pr-12 bg-slate-50/50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors duration-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading || isLocked}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold p-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 slide-in-bottom"
              style={{ animationDelay: "0.3s" }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8 text-center text-sm slide-in-bottom" style={{ animationDelay: "0.4s" }}>
            <span className="text-slate-500 font-medium">Don't have an account? </span>
            <Link 
              href="/register" 
              className="text-blue-600 font-bold hover:text-purple-600 transition-colors duration-300 underline-offset-4 hover:underline"
            >
              Create Account
            </Link>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full blur-2xl opacity-20 animate-pulse" style={{ animationDelay: "1s" }}></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

// Made with Bob
