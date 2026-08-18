"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useCallback } from "react";
import {
  TrendingUp, TrendingDown, Building2, Users, Ticket, DollarSign,
  BarChart2, Activity, Loader2, AlertTriangle, RefreshCw, Sparkles, X,
} from "lucide-react";

const PERIODS = [
  { key: "week",    label: "7 Days"  },
  { key: "month",   label: "30 Days" },
  { key: "quarter", label: "90 Days" },
];

interface TenantStat {
  _id:       string;
  name:      string;
  subdomain: string;
  plan:      string;
  isActive:  boolean;
  tickets:   number;
  revenue:   number;
  users:     number;
}

export default function SuperAdminAnalyticsPage() {
  return (
    <DashboardShell requiredRole={["super_admin", "admin"]}>
      {() => <AnalyticsContent />}
    </DashboardShell>
  );
}

function AnalyticsContent() {
  const [stats,   setStats]   = useState<TenantStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [period,  setPeriod]  = useState("month");
  const [drillTenant, setDrillTenant]   = useState<TenantStat | null>(null);
  const [shopStats,   setShopStats]     = useState<any>(null);
  const [shopLoading, setShopLoading]   = useState(false);
  const [aiReport,    setAiReport]      = useState("");
  const [aiLoading,   setAiLoading]     = useState(false);
  const [aiError,     setAiError]       = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/admin/analytics?period=${period}`);
      setStats(res.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const openDrilldown = async (tenant: TenantStat) => {
    setDrillTenant(tenant);
    setShopStats(null);
    setAiReport("");
    setAiError("");
    setShopLoading(true);
    try {
      const res = await api.get(`/api/analytics?tenantId=${tenant._id}`);
      setShopStats(res.data?.data ?? null);
    } catch {
      setShopStats(null);
    } finally {
      setShopLoading(false);
    }
  };

  const generateAiReport = async () => {
    if (!drillTenant) return;
    setAiLoading(true);
    setAiError("");
    setAiReport("");
    try {
      const res = await api.post("/api/admin/analytics/ai-report", { tenantId: drillTenant._id });
      setAiReport(res.data?.data?.report ?? "");
    } catch (err: any) {
      setAiError(err.response?.data?.message || "Failed to generate AI report.");
    } finally {
      setAiLoading(false);
    }
  };

  const totalRevenue  = stats.reduce((s, t) => s + t.revenue, 0);
  const totalTickets  = stats.reduce((s, t) => s + t.tickets, 0);
  const totalUsers    = stats.reduce((s, t) => s + t.users, 0);
  const activeTenants = stats.filter((t) => t.isActive).length;

  const planCounts = stats.reduce<Record<string, number>>((acc, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Platform Analytics</h1>
          <p className="text-muted-foreground font-medium mt-0.5">All tenants — live performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-destructive" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      )}

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",   value: loading ? "—" : `Rs. ${(totalRevenue / 1000).toFixed(1)}K`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Active Tenants",  value: loading ? "—" : activeTenants,                              icon: Building2,  color: "text-primary",    bg: "bg-primary/5"                           },
          { label: "Total Tickets",   value: loading ? "—" : totalTickets,                               icon: Ticket,     color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20"    },
          { label: "Total Staff",     value: loading ? "—" : totalUsers,                                 icon: Users,      color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/20"      },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon size={16} className={color} />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : value}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin w-8 h-8 mr-3" />
          <span className="font-medium">Loading analytics…</span>
        </div>
      ) : stats.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <BarChart2 size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No tenant data yet.</p>
        </div>
      ) : (
        <>
          {/* Plan Distribution + Revenue by Tenant */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan distribution */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <p className="font-bold text-foreground">Plan Distribution</p>
              {Object.entries(planCounts).map(([plan, count]) => {
                const pct = Math.round((count / stats.length) * 100);
                const colorMap: Record<string, string> = {
                  enterprise: "bg-indigo-500",
                  pro:        "bg-primary",
                  growth:     "bg-purple-500",
                  free:       "bg-slate-400",
                };
                return (
                  <div key={plan} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground capitalize">{plan}</span>
                      <span className="font-bold text-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colorMap[plan] ?? "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Revenue by tenant */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <p className="font-bold text-foreground">Tickets by Tenant</p>
              {[...stats]
                .sort((a, b) => b.tickets - a.tickets)
                .slice(0, 8)
                .map((t) => {
                  const pct = totalTickets > 0 ? Math.round((t.tickets / totalTickets) * 100) : 0;
                  return (
                    <div key={t._id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">{t.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            t.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>
                            {t.isActive ? "Active" : "Suspended"}
                          </span>
                          <span className="font-bold text-foreground">{t.tickets} tickets</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Tenant Activity Table */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <p className="font-bold text-foreground">Tenant Activity</p>
              <Activity size={16} className="text-muted-foreground" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Tenant", "Plan", "Tickets", "Revenue", "Staff", "Status"].map((h) => (
                      <th key={h} className={`px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide ${h === "Tickets" || h === "Revenue" || h === "Staff" ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...stats].sort((a, b) => b.tickets - a.tickets).map((t) => (
                    <tr
                      key={t._id}
                      onClick={() => openDrilldown(t)}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3.5 font-bold text-foreground">
                        <div>
                          <p>{t.name}</p>
                          <p className="text-xs font-normal text-muted-foreground font-mono">{t.subdomain}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          t.plan === "enterprise" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : t.plan === "pro"      ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {t.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-foreground">{t.tickets}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-foreground">
                        {t.revenue > 0 ? `Rs. ${(t.revenue / 1000).toFixed(1)}K` : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-foreground">{t.users}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          t.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {t.isActive ? "active" : "suspended"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {drillTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDrillTenant(null)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-foreground">{drillTenant.name}</h2>
                <p className="text-xs text-muted-foreground">{drillTenant.subdomain}.dibnow.com</p>
              </div>
              <button onClick={() => setDrillTenant(null)} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
                <X size={16} />
              </button>
            </div>

            {shopLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="animate-spin w-6 h-6 mr-3" /> Loading shop analytics…
              </div>
            ) : shopStats ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: "Tickets", value: shopStats.totalTickets },
                    { label: "Collected", value: `Rs. ${(shopStats.collectedRevenue / 1000).toFixed(1)}K` },
                    { label: "Quoted", value: `Rs. ${(shopStats.totalRevenue / 1000).toFixed(1)}K` },
                    { label: "Staff", value: shopStats.staffCount },
                    { label: "Customers", value: shopStats.customerCount },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted/50 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-foreground">{value}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status Breakdown</p>
                  {Object.entries(shopStats.statusCounts || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-sm">
                      <span className="capitalize text-foreground">{status.replace(/_/g, " ")}</span>
                      <span className="font-bold text-foreground">{count as number}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <button
                    onClick={generateAiReport}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-60"
                  >
                    {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generate AI Report
                  </button>
                  {aiError && <p className="text-sm text-destructive font-medium">{aiError}</p>}
                  {aiReport && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {aiReport}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Failed to load this shop&apos;s analytics.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
