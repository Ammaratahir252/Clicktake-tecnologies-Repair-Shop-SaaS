"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome, ROLE_META } from "@/lib/rbac";
import { Wrench, LogOut, Loader2, ShieldCheck, Store } from "lucide-react";
import api from "@/lib/api";

export interface DashboardUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

interface DashboardShellProps {
  requiredRole: string | string[];   // which role(s) this page is for
  children: (user: DashboardUser) => React.ReactNode;
}

/**
 * DashboardShell
 *
 * Shared wrapper for ALL role dashboards. Handles:
 *  - Reading user from localStorage
 *  - Role guard: if wrong role → redirect to correct dashboard
 *  - Renders top nav with role badge + logout
 *  - Passes verified user down to children via render prop
 */
export default function DashboardShell({ requiredRole, children }: DashboardShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { router.replace("/login"); return; }

    try {
      const parsed: DashboardUser = JSON.parse(raw);
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

      const normalizedRole = (parsed.role ?? '').toString().trim().toLowerCase();
      const normalizedAllowed = allowed.map(r => r.toString().trim().toLowerCase());

      if (!normalizedAllowed.includes(normalizedRole)) {
        router.replace(getRoleHome(normalizedRole));
        return;
      }

      setUser({ ...parsed, role: normalizedRole });
    } catch {
      router.replace("/login");
    }
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await api.post("/api/auth/logout"); } catch { }

    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "token=; Max-Age=0; path=/;";
    window.location.replace("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
      </div>
    );
  }

  const meta = ROLE_META[user.role] ?? ROLE_META["technician"];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-black">
      {/* ── Top Nav ────────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 w-8 h-8 rounded-xl flex items-center justify-center">
              <Wrench className="text-white w-4 h-4" />
            </div>
            <span className="font-black text-slate-900 text-lg tracking-tight">
              RepairShop <span className="text-blue-600">SaaS</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Role badge */}
            <div className={`hidden sm:flex items-center gap-1.5 border rounded-xl px-3 py-1.5 ${meta.bgColor}`}>
              <ShieldCheck size={14} className={meta.color} />
              <span className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>
                {meta.label}
              </span>
            </div>

            {/* User name */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800">{user.name}</span>
              <span className="text-xs text-slate-400 font-medium">{user.email}</span>
            </div>

            {/* Logout */}
            <button onClick={handleLogout} disabled={isLoggingOut}
              className="flex items-center gap-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-sm font-semibold px-3 py-2 rounded-xl transition-all">
              {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page Content ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* RBAC Banner */}
        {(() => {
          const banner = {
            owner: { color: "bg-blue-50 text-blue-800 border-blue-200", text: "Owner — Full Access" },
            manager: { color: "bg-purple-50 text-purple-800 border-purple-200", text: "Manager — No Audit Logs, No Settings" },
            technician: { color: "bg-amber-50 text-amber-800 border-amber-200", text: "Technician — Tickets Only" },
            frontdesk: { color: "bg-emerald-50 text-emerald-800 border-emerald-200", text: "Front Desk — Tickets & Customer Intake Only" }
          }[user.role as 'owner' | 'manager' | 'technician' | 'frontdesk'];

          if (banner) return (
            <div className={`mb-4 p-3 rounded-xl border text-sm font-bold flex items-center gap-2 ${banner.color}`}>
              <ShieldCheck size={18} />
              {banner.text}
            </div>
          );
          return null;
        })()}

        {/* Welcome banner */}
        <div className={`rounded-2xl border p-5 mb-8 flex items-center justify-between flex-wrap gap-3 ${meta.bgColor}`}>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              Welcome, {user.name.split(" ")[0]}! 👋
            </h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">{meta.description}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
            <Store size={13} />
            <span>Your Shop</span>
          </div>
        </div>

        {/* Role-specific content */}
        {children(user)}
      </div>
    </div>
  );
}
