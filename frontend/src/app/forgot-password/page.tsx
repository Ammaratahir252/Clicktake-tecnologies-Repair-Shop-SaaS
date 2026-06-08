"use client";

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, KeyRound, Copy, CheckCheck, ArrowRight, Sparkles, ShieldAlert } from "lucide-react";

/**
 * ENHANCED FORGOT PASSWORD PAGE — Beautiful Design with Animations
 * 
 * Features:
 * - Smooth transitions between stages
 * - Gradient backgrounds
 * - Glass morphism effects
 * - Interactive animations
 * - Token display with copy functionality
 */

type Stage = "form" | "success";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [resetToken, setResetToken] = useState("");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await axios.post("/api/auth/forgot-password", { email });
      const token = res.data?.data?.resetToken || res.data?.resetToken;
      if (token) {
        setResetToken(token);
        setStage("success");
      } else {
        setError("Reset link generated but token missing. Check backend logs.");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(resetToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select the text manually
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Card */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-[2.5rem] blur-2xl opacity-20"></div>
        
        <div className="relative bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/20">

          {/* Header */}
          <div className="text-center mb-8 slide-in-top">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-amber-500 to-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl">
                <KeyRound className="text-white w-8 h-8" />
              </div>
            </div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 mb-2">
              {stage === "form" ? "Forgot Password?" : "Check Your Token"}
            </h2>
            <p className="text-slate-600 font-medium text-sm flex items-center justify-center gap-2">
              {stage === "form" ? (
                <>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Enter your email to get a reset token
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                  Copy this token to reset your password
                </>
              )}
            </p>
          </div>

          {/* STAGE: Form */}
          {stage === "form" && (
            <div className="scale-in">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 border border-red-200 text-center font-semibold shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="group slide-in-left" style={{ animationDelay: "0.1s" }}>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1 tracking-wider">
                    Your Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl opacity-0 group-focus-within:opacity-10 transition-opacity duration-300"></div>
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-amber-500 transition-colors duration-300" />
                    <input
                      type="email"
                      placeholder="you@business.com"
                      className="relative w-full p-4 pl-12 bg-slate-50/50 border-2 border-slate-200 rounded-2xl focus:border-amber-500 focus:bg-white text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold p-4 rounded-2xl hover:from-amber-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 slide-in-bottom"
                  style={{ animationDelay: "0.2s" }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating Token...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-5 h-5" />
                      <span>Send Reset Token</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* STAGE: Success / Token Display */}
          {stage === "success" && (
            <div className="space-y-5 scale-in">
              {/* Token Display Box */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 slide-in-bottom" style={{ animationDelay: "0.1s" }}>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Your Reset Token (Testing Mode)
                </p>
                <div className="flex items-center gap-2 bg-white rounded-xl p-3 border border-amber-200">
                  <code className="flex-1 text-xs font-mono text-slate-700 break-all leading-relaxed select-all">
                    {resetToken}
                  </code>
                  <button
                    onClick={copyToken}
                    className="shrink-0 p-2 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-800 transition-all"
                    title="Copy token"
                  >
                    {copied ? (
                      <CheckCheck size={18} className="text-green-600" />
                    ) : (
                      <Copy size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Info Notice */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 text-xs text-orange-800 font-semibold slide-in-bottom" style={{ animationDelay: "0.2s" }}>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold mb-1">⏰ Token expires in 1 hour</p>
                    <p className="text-orange-700">Email delivery will replace this screen once a mail provider is configured (Resend/Nodemailer).</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <Link
                  href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold p-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 slide-in-bottom"
                  style={{ animationDelay: "0.3s" }}
                >
                  <span>Go to Reset Password</span>
                  <ArrowRight size={18} />
                </Link>

                <button
                  onClick={() => { 
                    setStage("form"); 
                    setError(""); 
                    setResetToken(""); 
                    setEmail("");
                  }}
                  className="w-full text-sm text-slate-500 hover:text-slate-700 font-semibold transition-colors py-2 slide-in-bottom"
                  style={{ animationDelay: "0.4s" }}
                >
                  Try a different email
                </button>
              </div>
            </div>
          )}

          {/* Back to Login */}
          <div className="mt-8 text-center slide-in-bottom" style={{ animationDelay: stage === "form" ? "0.3s" : "0.5s" }}>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors"
            >
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full blur-2xl opacity-20 animate-pulse" style={{ animationDelay: "1s" }}></div>
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
