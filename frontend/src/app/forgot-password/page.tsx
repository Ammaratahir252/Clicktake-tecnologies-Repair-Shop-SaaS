"use client";

/**
 * FORGOT PASSWORD — /forgot-password
 *
 * Testing mode: token is shown on screen with a copy button.
 * Email delivery will be wired in later via Resend/Nodemailer.
 *
 * Flow:
 * 1. User enters email → POST /api/auth/forgot-password
 * 2. Backend creates SHA-256 hashed token + 1hr expiry in DB
 * 3. Raw token returned in response (testing mode)
 * 4. User copies token → clicks "Go to Reset Password"
 */

import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, KeyRound, Copy, CheckCheck, ArrowRight } from "lucide-react";

type Stage = "form" | "success";

export default function ForgotPasswordPage() {
  const [email, setEmail]         = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState("");
  const [stage, setStage]         = useState<Stage>("form");
  const [resetToken, setResetToken] = useState("");
  const [copied, setCopied]       = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await axios.post("/api/auth/forgot-password", { email });
      // Backend returns raw token in testing mode
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
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 text-black font-sans">
      <div className="bg-white p-10 rounded-[32px] shadow-2xl shadow-blue-100/50 w-full max-w-md border border-slate-100">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="bg-amber-500 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-amber-200">
            <KeyRound className="text-white w-7 h-7" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stage === "form" ? "Forgot Password" : "Check Your Token"}
          </h2>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            {stage === "form"
              ? "Enter your email and we'll generate a reset token."
              : "Copy this token to reset your password. Email delivery coming soon."}
          </p>
        </div>

        {/* ── Stage: Form ─────────────────────────────────────────────── */}
        {stage === "form" && (
          <>
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 border border-red-100 text-center font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">
                  Your Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="email"
                    placeholder="you@business.com"
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-400 focus:bg-white text-black outline-none transition-all placeholder:text-slate-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-500 text-white font-bold p-4 rounded-2xl hover:bg-amber-600 disabled:bg-slate-300 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>Generating Reset Link...</span></>
                ) : (
                  "Send Reset Token"
                )}
              </button>
            </form>
          </>
        )}

        {/* ── Stage: Success / Token Display ──────────────────────────── */}
        {stage === "success" && (
          <div className="space-y-5">
            {/* Token box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Your Reset Token (testing mode)
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-slate-700 break-all leading-relaxed select-all">
                  {resetToken}
                </code>
                <button
                  onClick={copyToken}
                  className="shrink-0 p-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all"
                  title="Copy token"
                >
                  {copied ? <CheckCheck size={18} className="text-emerald-600" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            {/* Info notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 font-semibold">
              ⚠️ This token expires in <strong>1 hour</strong>. Email delivery will replace this
              screen once a mail provider is configured (Resend/Nodemailer).
            </div>

            {/* CTA → reset password page */}
            <Link
              href={`/reset-password?token=${encodeURIComponent(resetToken)}`}
              className="w-full bg-blue-600 text-white font-bold p-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Go to Reset Password <ArrowRight size={16} />
            </Link>

            {/* Try different email */}
            <button
              onClick={() => { setStage("form"); setError(""); setResetToken(""); }}
              className="w-full text-sm text-slate-400 hover:text-slate-600 font-semibold transition-colors py-2"
            >
              Try a different email
            </button>
          </div>
        )}

        {/* ── Back to Login ────────────────────────────────────────────── */}
        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-semibold transition-colors"
          >
            <ArrowLeft size={14} /> Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}
