"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  BarChart3, TrendingUp, Ticket, DollarSign,
  AlertCircle, Users, Download, Printer,
  CheckCircle2, Clock, Wrench, XCircle,
  ArrowUpRight, Loader2,
} from "lucide-react";

const STATUS_COLOR_MAP: Record<string, { label: string; color: string; text: string; bg: string; border: string; icon: any }> = {
  received:      { label: "Received",      color: "bg-slate-500",   text: "text-slate-700",   bg: "bg-slate-100",   border: "border-slate-200",   icon: Clock        },
  diagnosed:     { label: "Diagnosed",     color: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-100",    border: "border-blue-200",    icon: Wrench       },
  estimate_sent: { label: "Estimate Sent", color: "bg-indigo-500",  text: "text-indigo-700",  bg: "bg-indigo-100",  border: "border-indigo-200",  icon: Clock        },
  approved:      { label: "Approved",      color: "bg-cyan-500",    text: "text-cyan-700",    bg: "bg-cyan-100",    border: "border-cyan-200",    icon: CheckCircle2 },
  in_repair:     { label: "In Repair",     color: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-100",   border: "border-amber-200",   icon: Wrench       },
  ready:         { label: "Ready",         color: "bg-emerald-400", text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", icon: CheckCircle2 },
  delivered:     { label: "Delivered",     color: "bg-emerald-600", text: "text-emerald-800", bg: "bg-emerald-100", border: "border-emerald-300", icon: CheckCircle2 },
  cancelled:     { label: "Cancelled",     color: "bg-red-500",     text: "text-red-700",     bg: "bg-red-100",     border: "border-red-200",     icon: XCircle      },
};

function KpiCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: any; label: string; value: string; sub?: string; color: string; trend?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            <ArrowUpRight className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, color, action, children }: {
  icon: any; title: string; color: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${color} w-8 h-8 rounded-xl flex items-center justify-center shrink-0`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-bold text-card-foreground">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function OwnerReportsPage() {
  return (
    <DashboardShell requiredRole="owner">
      {() => <ReportsContent />}
    </DashboardShell>
  );
}

function ReportsContent() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get("/api/analytics");
      setData(res.data?.data ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading analytics…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <BarChart3 size={40} className="mx-auto mb-3" />
        <p className="font-bold">Failed to load analytics. Please try again.</p>
      </div>
    );
  }

  const statusCounts: Record<string, number> = data.statusCounts ?? {};
  const totalTickets  = data.totalTickets ?? 0;
  const totalRevenue  = data.totalRevenue ?? 0;
  const deliveredCount = statusCounts["delivered"] ?? 0;
  const avgRepairValue = deliveredCount > 0 ? Math.round(totalRevenue / deliveredCount) : 0;
  const outstanding    = Object.entries(statusCounts)
    .filter(([k]) => !["delivered", "cancelled"].includes(k))
    .reduce((s, [, v]) => s + v, 0);

  const monthly: any[] = data.monthly ?? [];
  const maxRevenue = Math.max(...monthly.map((m) => m.revenue), 1);

  const statusEntries = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Full financial and operational overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-muted-foreground text-sm font-bold rounded-xl hover:text-foreground transition-all"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Total Revenue"
          value={`PKR ${(totalRevenue / 1000).toFixed(1)}K`}
          sub="All collected"
          color="bg-emerald-600"
        />
        <KpiCard
          icon={Ticket}
          label="Total Tickets"
          value={totalTickets.toString()}
          sub="Across all statuses"
          color="bg-blue-600"
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg Repair Value"
          value={avgRepairValue > 0 ? `PKR ${avgRepairValue.toLocaleString()}` : "—"}
          sub="Per closed ticket"
          color="bg-indigo-600"
        />
        <KpiCard
          icon={AlertCircle}
          label="Active Tickets"
          value={outstanding.toString()}
          sub="Not yet delivered"
          color="bg-rose-600"
        />
      </div>

      {/* Monthly Revenue Bar Chart */}
      <Section icon={BarChart3} title="Monthly Revenue" color="bg-amber-500">
        {monthly.length > 0 ? (
          <>
            <div className="flex items-end gap-2 h-48 overflow-x-auto pb-1">
              {monthly.map((m, i) => {
                const pct = Math.round((m.revenue / maxRevenue) * 100);
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 flex-1 min-w-[40px] group">
                    <span className="text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      PKR {(m.revenue / 1000).toFixed(0)}K
                    </span>
                    <div
                      className="w-full rounded-t-lg bg-primary/30 group-hover:bg-primary transition-all"
                      style={{ height: `${Math.max(pct, 3)}%` }}
                    />
                    <span className="text-[10px] font-bold text-muted-foreground">{m.month}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-right">Hover bars to see exact values</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No monthly data available yet.</p>
        )}
      </Section>

      {/* Ticket Status Breakdown */}
      <Section icon={Ticket} title="Ticket Status Breakdown" color="bg-blue-600">
        {statusEntries.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {statusEntries.slice(0, 4).map(([key, count]) => {
                const cfg = STATUS_COLOR_MAP[key] ?? { label: key, text: "text-foreground", bg: "bg-muted", border: "border-border", icon: Clock };
                const Icon = cfg.icon;
                return (
                  <div key={key} className={`${cfg.bg} ${cfg.border} border rounded-2xl p-4 flex flex-col gap-2`}>
                    <div className={`flex items-center gap-2 ${cfg.text}`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wide">{cfg.label}</span>
                    </div>
                    <p className={`text-3xl font-black ${cfg.text}`}>{count}</p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {Math.round((count / totalTickets) * 100)}% of total
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3">
              {statusEntries.map(([key, count]) => {
                const cfg = STATUS_COLOR_MAP[key] ?? { label: key, color: "bg-primary" };
                const pct = Math.round((count / totalTickets) * 100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-28 shrink-0">{cfg.label}</span>
                    <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                      <div className={`${cfg.color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-black text-foreground w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        )}
      </Section>

      {/* Top Technicians */}
      <Section icon={Users} title="Top Technicians" color="bg-purple-600">
        {data.topTechs && data.topTechs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <th className="px-5 py-3">Rank</th>
                  <th className="px-5 py-3">Technician</th>
                  <th className="px-5 py-3">Tickets Closed</th>
                  <th className="px-5 py-3">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topTechs.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors text-sm">
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                        i === 0 ? "bg-amber-400 text-amber-900" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-orange-800" : "bg-muted text-muted-foreground border border-border"
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-5 py-4 font-bold text-card-foreground">{t.name ?? "Unknown"}</td>
                    <td className="px-5 py-4 font-semibold text-foreground">{t.tickets}</td>
                    <td className="px-5 py-4 font-semibold text-emerald-600">
                      PKR {(t.revenue ?? 0).toLocaleString("en-PK")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No technician data available yet.</p>
        )}
      </Section>

      <div className="flex items-center gap-3 bg-muted/60 border border-border rounded-2xl p-4">
        <Download className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          All data is live from your tenant database. Revenue figures are based on ticket estimate amounts.
        </p>
      </div>
    </div>
  );
}
