"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Settings, Lock, ShieldCheck, Loader2, Save, CheckCircle2,
  AlertTriangle, Eye, EyeOff, Users as UsersIcon, Ticket, Receipt,
} from "lucide-react";

interface ManagerPermissions {
  editTeam: boolean;
  assignWork: boolean;
  recordRevenue: boolean;
}

const PERMISSION_ROWS: { key: keyof ManagerPermissions; label: string; icon: any; desc: string }[] = [
  { key: "editTeam",      label: "Edit staff accounts",       icon: UsersIcon, desc: "Add, edit, and remove staff accounts on the Team page" },
  { key: "assignWork",    label: "Assign tickets & leads",    icon: Ticket,    desc: "Assign a ticket or lead to any staff member" },
  { key: "recordRevenue", label: "Record cost & payments",    icon: Receipt,   desc: "Set actual job cost and record payments on completed tickets" },
];

export default function ManagerSettingsPage() {
  return (
    <DashboardShell requiredRole="manager">
      {(user) => <SettingsContent user={user} />}
    </DashboardShell>
  );
}

function SettingsContent({ user }: { user: any }) {
  // ── Your Permissions (read-only, owner-controlled) ──
  const [perms, setPerms] = useState<ManagerPermissions | null>(null);

  useEffect(() => {
    api
      .get("/api/tenant/branding")
      .then((res) => {
        const mp = res.data?.data?.branding?.managerPermissions ?? {};
        setPerms({
          editTeam: mp.editTeam ?? false,
          assignWork: mp.assignWork ?? true,
          recordRevenue: mp.recordRevenue ?? true,
        });
      })
      .catch(() => setPerms({ editTeam: false, assignWork: true, recordRevenue: true }));
  }, []);

  // ── Change Password ──
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
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
          <Settings className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Manage your account and see what your shop owner has enabled for you.</p>
        </div>
      </div>

      {/* ── Your Permissions ─────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-sm font-black text-foreground uppercase tracking-wide mb-1 flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" /> Your Permissions
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Set by your shop owner in Settings → Manager Permissions.</p>

        {!perms ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="animate-spin w-5 h-5" />
          </div>
        ) : (
          <div className="space-y-1">
            {PERMISSION_ROWS.map(({ key, label, icon: Icon, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <Icon size={16} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                  perms[key] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {perms[key] ? "Enabled" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Change Password ──────────────────────────────────────────── */}
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
    </div>
  );
}
