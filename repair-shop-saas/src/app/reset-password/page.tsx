"use client";

/**
 * RESET PASSWORD — /reset-password
 *
 * Accepts:
 *  - ?token=xxx in the URL (auto-filled from forgot-password page)
 *  - New password + confirm password fields
 *
 * Calls POST /api/auth/reset-password → { token, newPassword }
 * On success → redirects to /login after 2 seconds.
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  Lock, Eye, EyeOff, KeyRound, Loader2,
  CheckCircle, ArrowLeft, AlertCircle
} from "lucide-react";

type Stage = "form" | "success" | "error";

// Password strength rules per blueprint M12 / FR-01-8
function checkStrength(pw: string): { ok: boolean; message: string } {
  if (pw.length < 8)            return { ok: false, message: "Minimum 8 characters" };
  if (!/[A-Z]/.test(pw))       return { ok: false, message: "At least 1 uppercase letter" };
  if (!/[0-9]/.test(pw))       return { ok: false, message: "At least 1 number" };
  if (!/[^A-Za-z0-9]/.test(pw))return { ok: false, message: "At least 1 special character" };
  return { ok: true, message: "Strong password ✓" };
}

export default function ResetPasswordPage() {
  const searchParams   = useSearchParams();
  const [token, setToken]             = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [stage, setStage]             = useState<Stage>("form");
  const [error, setError]             = useState("");
  const [countdown, setCountdown]     = useState(3);

  // Auto-fill token from URL query string
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
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 text-black font-sans">
      <div className="bg-white p-10 rounded-[32px] shadow-2xl shadow-blue-100/50 w-full max-w-md border border-slate-100">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl
            ${stage === "success" ? "bg-emerald-500 shadow-emerald-200"
            : stage === "error"   ? "bg-red-500 shadow-red-200"
            : "bg-blue-600 shadow-blue-200"}`}>
            {stage === "success" ? <CheckCircle className="text-white w-7 h-7" />
            : stage === "error"  ? <AlertCircle className="text-white w-7 h-7" />
            : <KeyRound className="text-white w-7 h-7" />}
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {stage === "success" ? "Password Updated!"
            : stage === "error"  ? "Token Expired"
            : "Reset Password"}
          </h2>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            {stage === "success"
              ? `Redirecting to login in ${countdown} second${countdown !== 1 ? "s" : ""}...`
            : stage === "error"
              ? "Your reset token has expired or is invalid."
            : "Enter your reset token and choose a new password."}
          </p>
        </div>

        {/* ── Success State ────────────────────────────────────────────── */}
        {stage === "success" && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
              <CheckCircle className="mx-auto text-emerald-500 w-10 h-10 mb-3" />
              <p className="font-bold text-emerald-800">Your password has been changed.</p>
              <p className="text-xs text-emerald-600 mt-1">
                You can now log in with your new password.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full bg-blue-600 text-white font-bold p-4 rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              Go to Login Now
            </Link>
          </div>
        )}

        {/* ── Expired Token State ──────────────────────────────────────── */}
        {stage === "error" && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
              <AlertCircle className="mx-auto text-red-400 w-10 h-10 mb-3" />
              <p className="font-bold text-red-800">Token expired or invalid.</p>
              <p className="text-xs text-red-600 mt-1">
                Reset tokens expire after 1 hour. Please request a new one.
              </p>
            </div>
            <Link
              href="/forgot-password"
              className="w-full bg-amber-500 text-white font-bold p-4 rounded-2xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
            >
              Request New Reset Token
            </Link>
          </div>
        )}

        {/* ── Form State ───────────────────────────────────────────────── */}
        {stage === "form" && (
          <>
            {error && !stage.startsWith("error") && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 border border-red-100 text-center font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Token field */}
              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">
                  Reset Token
                </label>
                <textarea
                  rows={2}
                  placeholder="Paste your reset token here..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-black outline-none transition-all placeholder:text-slate-300 text-xs font-mono resize-none"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">
                  Token auto-fills from the reset link. Tokens expire in 1 hour.
                </p>
              </div>

              {/* New Password */}
              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">
                  New Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                    className="w-full p-4 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-black outline-none transition-all placeholder:text-slate-300"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-4 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Strength indicator */}
                {newPassword && (
                  <p className={`text-xs mt-1.5 ml-1 font-semibold ${
                    strength.ok ? "text-emerald-600" : "text-amber-600"
                  }`}>
                    {strength.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="group">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter new password"
                    className="w-full p-4 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-black outline-none transition-all placeholder:text-slate-300"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Match indicator */}
                {confirmPw && (
                  <p className={`text-xs mt-1.5 ml-1 font-semibold ${
                    confirmPw === newPassword ? "text-emerald-600" : "text-red-500"
                  }`}>
                    {confirmPw === newPassword ? "Passwords match ✓" : "Passwords do not match"}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white font-bold p-4 rounded-2xl hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Updating Password...</span></>
                  : "Reset My Password"
                }
              </button>
            </form>
          </>
        )}

        {/* ── Back to Login ────────────────────────────────────────────── */}
        {stage === "form" && (
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 font-semibold transition-colors"
            >
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
