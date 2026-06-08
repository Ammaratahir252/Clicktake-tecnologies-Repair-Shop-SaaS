"use client";

/**
 * SUPER ADMIN DASHBOARD — /dashboard/super-admin
 *
 * Per blueprint Section 5.1 Role 1:
 * - Full access to ALL tenants and ALL data across the entire platform
 * - Manage tenant accounts: create, suspend, delete, change plans
 * - View ALL tickets across ALL shops (cross-tenant read)
 * - View platform-wide analytics: total revenue, active tenants, churn
 * - Configure system-wide feature flags and global settings
 * - Access audit logs across all tenants
 * - Impersonate any tenant admin for support (logged in audit trail)
 * - Manage subscription billing and payment webhooks
 * - View and manage all GPS leads platform-wide
 *
 * NOTE: This role is for Dibnow platform administrators ONLY.
 * It does NOT belong to any specific shop/tenant.
 */

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Store, Users, Ticket, BarChart3, Settings,
  FileText, MapPin, ShieldCheck, Globe,
  ChevronRight, Loader2, AlertTriangle,
  TrendingUp, Activity, DollarSign, UserCheck
} from "lucide-react";
import { ROLE_META } from "@/lib/rbac";

const MODULES = [
  {
    key: "tenants",
    icon: Store,
    title: "All Tenants",
    desc: "Manage, suspend, or delete shop accounts",
    href: "/dashboard/super-admin/tenants",
    color: "bg-blue-600",
  },
  {
    key: "users",
    icon: Users,
    title: "All Users",
    desc: "Platform-wide user management",
    href: "/dashboard/super-admin/users",
    color: "bg-purple-600",
  },
  {
    key: "tickets",
    icon: Ticket,
    title: "All Tickets",
    desc: "View repair tickets across all shops",
    href: "/dashboard/super-admin/tickets",
    color: "bg-emerald-600",
  },
  {
    key: "leads",
    icon: MapPin,
    title: "All Leads",
    desc: "GPS leads platform-wide view",
    href: "/dashboard/super-admin/leads",
    color: "bg-rose-500",
  },
  {
    key: "analytics",
    icon: BarChart3,
    title: "Platform Analytics",
    desc: "Revenue, churn rate, active tenants",
    href: "/dashboard/super-admin/analytics",
    color: "bg-amber-500",
  },
  {
    key: "audit",
    icon: FileText,
    title: "Audit Logs",
    desc: "Immutable activity log across all tenants",
    href: "/dashboard/super-admin/audit",
    color: "bg-slate-700",
  },
  {
    key: "impersonate",
    icon: UserCheck,
    title: "Impersonate Tenant",
    desc: "Support: act as any shop owner (logged)",
    href: "/dashboard/super-admin/impersonate",
    color: "bg-red-600",
  },
  {
    key: "settings",
    icon: Settings,
    title: "Platform Settings",
    desc: "Feature flags, global config, billing webhooks",
    href: "/dashboard/super-admin/settings",
    color: "bg-indigo-600",
  },
];

interface PlatformStats {
  totalTenants:   number;
  activeTenants:  number;
  totalUsers:     number;
  totalTickets:   number;
  totalRevenue:   number;
  totalLeads:     number;
}

export default function SuperAdminDashboard() {
  return (
    // Super Admin has NO tenant scope — they operate platform-wide
    <DashboardShell requiredRole="super_admin">
      {(user) => <SuperAdminContent user={user} />}
    </DashboardShell>
  );
}

function SuperAdminContent({ user }: { user: any }) {
  const [stats, setStats]           = useState<PlatformStats | null>(null);
  const [tenants, setTenants]       = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    // Platform-wide stats — super admin only endpoint
    api.get("/api/admin/platform-stats")
      .then((res) => setStats(res.data?.data))
      .catch((err) => setStatsError(err.response?.data?.message || "Could not load stats."))
      .finally(() => setLoadingStats(false));

    // All tenants list
    api.get("/api/admin/tenants")
      .then((res) => {
        const data = res.data?.data;
        setTenants(Array.isArray(data) ? data.slice(0, 10) : []);
      })
      .catch(() => {})
      .finally(() => setLoadingTenants(false));
  }, []);

  const kpis = [
    { label: "Total Shops",    value: stats?.totalTenants  ?? "—", icon: Store,       color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "Active Shops",   value: stats?.activeTenants ?? "—", icon: Activity,    color: "text-emerald-600",bg: "bg-emerald-50" },
    { label: "Total Users",    value: stats?.totalUsers    ?? "—", icon: Users,       color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Tickets",  value: stats?.totalTickets  ?? "—", icon: Ticket,      color: "text-amber-600",  bg: "bg-amber-50" },
    { label: "Total Revenue",  value: stats ? `$${stats.totalRevenue?.toLocaleString()}` : "—", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Leads",          value: stats?.totalLeads    ?? "—", icon: MapPin,      color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-8">

      {/* ── Platform-Wide Warning Banner ─────────────────────────────── */}
      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
        <ShieldCheck size={18} className="text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-black text-red-800">Super Admin — Platform Level Access</p>
          <p className="text-xs text-red-700 mt-0.5">
            You have full read/write access to ALL tenants. All impersonation actions are
            permanently logged in the immutable audit trail.
          </p>
        </div>
        <Globe size={16} className="text-red-400 ml-auto shrink-0" />
      </div>

      {/* ── KPI Stats Strip ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Platform Stats
        </h2>
        {statsError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-4">
            <AlertTriangle size={14} className="text-red-400" />
            <p className="text-xs font-semibold text-red-600">{statsError}</p>
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center border border-white shadow-sm`}>
              <Icon size={18} className={`${color} mx-auto mb-2`} />
              <p className={`text-xl font-black ${color}`}>
                {loadingStats ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : value}
              </p>
              <p className="text-[11px] text-slate-500 font-semibold mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Module Cards ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Admin Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODULES.map(({ key, icon: Icon, title, desc, href, color }) => (
            <a
              key={key}
              href={href}
              className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all group active:scale-[0.98]"
            >
              <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md`}>
                <Icon className="text-white w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      </section>

      {/* ── All Tenants Table ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store size={17} className="text-blue-600" />
            <h2 className="font-bold text-slate-800">Recent Tenants</h2>
          </div>
          <a
            href="/dashboard/super-admin/tenants"
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            View All <ChevronRight size={12} />
          </a>
        </div>

        {loadingTenants && (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <Loader2 className="animate-spin w-5 h-5" />
            <span className="text-sm">Loading tenants...</span>
          </div>
        )}

        {!loadingTenants && tenants.length === 0 && (
          <div className="text-center py-10">
            <Store className="mx-auto text-slate-200 w-8 h-8 mb-2" />
            <p className="text-sm text-slate-400">No tenants found.</p>
          </div>
        )}

        {!loadingTenants && tenants.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Shop Name", "Subdomain", "Plan", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest px-6 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenants.map((t, i) => (
                  <tr key={t._id ?? t.id ?? i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-800 text-sm">{t.name ?? t.shopName ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-500 text-sm font-mono text-xs">{t.subdomain ?? "—"}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        t.plan === "enterprise" ? "bg-indigo-100 text-indigo-700"
                        : t.plan === "growth"   ? "bg-purple-100 text-purple-700"
                        : "bg-slate-100 text-slate-600"
                      }`}>
                        {t.plan ?? "free"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        t.isActive !== false
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {t.isActive !== false ? "Active" : "Suspended"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
