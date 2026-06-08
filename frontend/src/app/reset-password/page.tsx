"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  Lock, Eye, EyeOff, KeyRound, Loader2,
  CheckCircle, ArrowLeft, AlertCircle, Sparkles, ShieldCheck
} from "lucide-react";

/**
 * ENHANCED RESET PASSWORD PAGE — Beautiful Design with Animations
 * 
 * Features:
 * - Smooth animations and transitions
 * - Gradient backgrounds
 * - Glass morphism effects
 * - Password strength indicator with visual feedback
 * - Multiple states (form, success, error) with smooth transitions
 */

type Stage = "form" | "success" | "error";

// Password strength rules
function checkStrength(pw: string): { ok: boolean; message: string; score: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (pw.length < 8) return { ok: false, message: "Minimum 8 characters", score };
  if (!/[A-Z]/.test(pw)) return { ok: false, message: "At least 1 uppercase letter", score };
  if (!/[0-9]/.test(pw)) return { ok: false, message: "At least 1 number", score };
  if (!/[^A-Za-z0-9]/.test(pw)) return { ok: false, message: "At least 1 special character", score };
  return { ok: true, message: "Strong password ✓", score };
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(3);

  // Auto-fill token from URL
  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  // Countdown redirect on success
  useEffect(() => {
    if (stage !== "success") return;
    if (countdown <= 0) {
      window.location.replace("/login");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, countdown]);

  const strength = checkStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token.trim()) {
      setError("Reset token is required. Copy it from the forgot-password page.");
      return;
    }
    if (newPassword !== confirmPw) {
      setError("Passwords do not match.");
      return;
    }
    if (!strength.ok) {
      setError(strength.message);
      return;
    }

    setIsLoading(true);
    try {
      await axios.post("/api/auth/reset-password", { token, newPassword });
      setStage("success");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Reset failed. Token may be expired or invalid.";
      setError(msg);
      if (msg.includes("expired") || msg.includes("invalid")) {
        setStage("error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Card */}
      <div className="relative w-full max-w-md">
        <div className={`absolute inset-0 rounded-[2.5rem] blur-2xl opacity-20 ${
          stage === "success" ? "bg-gradient-to-r from-green-400 to-emerald-500" :
          stage === "error" ? "bg-gradient-to-r from-red-400 to-orange-500" :
          "bg-gradient-to-r from-blue-400 to-purple-500"
        }`}></div>
        
        <div className="relative bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/20">

          {/* Header */}
          <div className="text-center mb-8 slide-in-top">
            <div className="relative inline-block mb-6">
              <div className={`absolute inset-0 rounded-2xl blur-lg opacity-50 animate-pulse ${
                stage === "success" ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                stage === "error" ? "bg-gradient-to-r from-red-400 to-orange-500" :
                "bg-gradient-to-r from-blue-500 to-purple-600"
              }`}></div>
              <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl ${
                stage === "success" ? "bg-gradient-to-r from-green-500 to-emerald-600" :
                stage === "error" ? "bg-gradient-to-r from-red-500 to-orange-600" :
                "bg-gradient-to-r from-blue-500 to-purple-600"
              }`}>
                {stage === "success" ? <CheckCircle className="text-white w-8 h-8" /> :
                 stage === "error" ? <AlertCircle className="text-white w-8 h-8" /> :
                 <KeyRound className="text-white w-8 h-8" />}
              </div>
            </div>

            <h2 className={`text-4xl font-black text-transparent bg-clip-text mb-2 ${
              stage === "success" ? "bg-gradient-to-r from-green-600 to-emerald-600" :
              stage === "error" ? "bg-gradient-to-r from-red-600 to-orange-600" :
              "bg-gradient-to-r from-blue-600 to-purple-600"
            }`}>
              {stage === "success" ? "Password Updated!" :
               stage === "error" ? "Token Expired" :
               "Reset Password"}
            </h2>
            <p className="text-slate-600 font-medium flex items-center justify-center gap-2">
              {stage === "success" ? (
                <>
                  <Sparkles className="w-4 h-4 text-green-500" />
                  Redirecting to login in {countdown}s...
                </>
              ) : stage === "error" ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Your reset token has expired
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-purple-500" />
                  Enter your token and new password
                </>
              )}
            </p>
          </div>

          {/* SUCCESS STATE */}
          {stage === "success" && (
            <div className="space-y-4 scale-in">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center slide-in-bottom">
                <CheckCircle className="mx-auto text-green-500 w-12 h-12 mb-3" />
                <p className="font-bold text-green-800 text-lg mb-1">Success!</p>
                <p className="text-sm text-green-600">
                  Your password has been changed. You can now log in with your new password.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold p-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Go to Login Now</span>
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </Link>
            </div>
          )}

          {/* ERROR STATE */}
          {stage === "error" && (
            <div className="space-y-4 scale-in">
              <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 text-center slide-in-bottom shake">
                <AlertCircle className="mx-auto text-red-500 w-12 h-12 mb-3" />
                <p className="font-bold text-red-800 text-lg mb-1">Token Expired</p>
                <p className="text-sm text-red-600">
                  Reset tokens expire after 1 hour. Please request a new one.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold p-4 rounded-2xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <KeyRound className="w-5 h-5" />
                <span>Request New Token</span>
              </Link>
            </div>
          )}

          {/* FORM STATE */}
          {stage === "form" && (
            <div className="scale-in">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 border border-red-200 text-center font-semibold shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Token Field */}
                <div className="group slide-in-left" style={{ animationDelay: "0.1s" }}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">
                    Reset Token
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Paste your reset token here..."
                    className="w-full p-4 bg-slate-50/50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white text-slate-900 outline-none transition-all placeholder:text-slate-400 text-xs font-mono resize-none"
                    value={token}
                    onChange={(e) => setToken(e.target.value.trim())}
                    required
                  />
                  <p className="text-xs text-slate-400 mt-1 ml-1">
                    Token auto-fills from the reset link. Expires in 1 hour.
                  </p>
                </div>

                {/* New Password */}
                <div className="group slide-in-left" style={{ animationDelay: "0.2s" }}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-10 transition-opacity duration-300"></div>
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                      className="relative w-full p-4 pl-12 pr-12 bg-slate-50/50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors duration-300"
                    >
                      {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {/* Strength Indicator */}
                  {newPassword && (
                    <div className="mt-2 pl-1">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map(level => (
                          <div 
                            key={level} 
                            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                              strength.score >= level 
                                ? strength.score < 3 
                                  ? 'bg-amber-400' 
                                  : 'bg-green-500' 
                                : 'bg-slate-200'
                            }`} 
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${strength.ok ? 'text-green-600' : 'text-amber-600'}`}>
                        {strength.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="group slide-in-left" style={{ animationDelay: "0.3s" }}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-10 transition-opacity duration-300"></div>
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors duration-300" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter new password"
                      className="relative w-full p-4 pl-12 pr-12 bg-slate-50/50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:bg-white text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors duration-300"
                    >
                      {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {/* Match Indicator */}
                  {confirmPw && (
                    <p className={`text-xs mt-2 ml-1 font-semibold ${
                      confirmPw === newPassword ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {confirmPw === newPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold p-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 slide-in-bottom"
                  style={{ animationDelay: "0.4s" }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>Reset My Password</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Back to Login */}
          {stage === "form" && (
            <div className="mt-8 text-center slide-in-bottom" style={{ animationDelay: "0.5s" }}>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors"
              >
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          )}

          {/* Decorative Elements */}
          <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 animate-pulse ${
            stage === "success" ? "bg-gradient-to-br from-green-400 to-emerald-500" :
            stage === "error" ? "bg-gradient-to-br from-red-400 to-orange-500" :
            "bg-gradient-to-br from-blue-400 to-purple-500"
          }`}></div>
          <div className={`absolute -bottom-4 -left-4 w-24 h-24 rounded-full blur-2xl opacity-20 animate-pulse ${
            stage === "success" ? "bg-gradient-to-br from-emerald-400 to-teal-500" :
            stage === "error" ? "bg-gradient-to-br from-orange-400 to-red-500" :
            "bg-gradient-to-br from-purple-400 to-pink-500"
          }`} style={{ animationDelay: "1s" }}></div>
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
