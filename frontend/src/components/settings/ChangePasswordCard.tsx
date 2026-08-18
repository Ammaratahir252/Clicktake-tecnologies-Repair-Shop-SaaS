"use client";

import { useState } from "react";
import api from "@/lib/api";
import { Lock, Eye, EyeOff, Loader2, Save, CheckCircle2, AlertTriangle } from "lucide-react";

/** Shared "Change Password" card — used by every role's settings/profile page.
 * Hits the real, role-agnostic POST /api/auth/change-password endpoint. */
export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [changedPw, setChangedPw] = useState(false);
  const [pwError, setPwError] = useState("");

  const changePassword = async () => {
    setPwError("");
    if (!currentPassword || !newPassword) {
      setPwError("Both current and new password are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords don't match.");
      return;
    }
    setChangingPw(true);
    try {
      await api.post("/api/auth/change-password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangedPw(true);
      setTimeout(() => setChangedPw(false), 3000);
    } catch (err: any) {
      setPwError(err?.response?.data?.message ?? "Failed to change password.");
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <h2 className="text-sm font-black text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
        <Lock size={16} className="text-primary" /> Change Password
      </h2>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Current Password</label>
          <input
            type={showPw ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">New Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2.5 pr-11 bg-muted border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Confirm New Password</label>
          <input
            type={showPw ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {pwError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs font-semibold text-red-500">{pwError}</p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={changePassword}
            disabled={changingPw || changedPw}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${
              changedPw ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            {changingPw ? <Loader2 size={14} className="animate-spin" /> : changedPw ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {changedPw ? "Password Changed!" : changingPw ? "Saving…" : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
