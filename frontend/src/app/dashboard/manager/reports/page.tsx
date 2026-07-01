"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { TrendingUp, BarChart2, Users, Ticket, DollarSign, Download, Loader2 } from "lucide-react";

const BAR_COLORS = ["bg-primary", "bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-purple-400"];

const STATUS_LABELS: Record<string, string> = {
  received:      "Received",
  diagnosed:     "Diagnosed",
  estimate_sent: "Estimate Sent",
  approved:      "Approved",
  in_repair:     "In Repair",
  ready:         "Ready",
  delivered:     "Delivered",
  cancelled:     "Cancelled",
};

export default function ManagerReportsPage() {
  return (
    <DashboardShell requiredRole="manager">
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
        <span className="font-medium">Loading reports…</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <BarChart2 size={40} className="mx-auto mb-3" />
        <p className="font-bold">Failed to load analytics. Please try again.</p>
      </div>
    );
  }

  const statusCounts: Record<string, number> = data.statusCounts ?? {};
  const statusEntries = Object.entries(statusCounts).filter(([, v]) => v > 0);
  const totalStatus = statusEntries.reduce((s, [, v]) => s + v, 0);

  const activeTickets = Object.entries(statusCounts)
    .filter(([k]) => !["delivered", "cancelled"].includes(k))
    .reduce((s, [, v]) => s + v, 0);
  const completedTickets = statusCounts["delivered"] ?? 0;

  const avgRepairValue = completedTickets > 0
    ? Math.round(data.totalRevenue / completedTickets)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Reports</h1>
          <p className="text-muted-foreground font-medium mt-0.5">Business performance overview — all time</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/70 transition-all text-sm"
        >
          <Download size={16} />
          Print
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: `Rs. ${(data.totalRevenue / 1000).toFixed(0)}K`,
            icon: DollarSign,
            color: "text-emerald-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
          },
          {
            label: "Total Tickets",
            value: data.totalTickets,
            icon: Ticket,
            color: "text-primary",
            bg: "bg-primary/5",
          },
          {
            label: "Total Customers",
            value: data.customerCount,
            icon: Users,
            color: "text-purple-600",
            bg: "bg-purple-50 dark:bg-purple-900/20",
          },
          {
            label: "Avg Repair Value",
            value: avgRepairValue > 0 ? `Rs. ${avgRepairValue.toLocaleString()}` : "—",
            icon: TrendingUp,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon size={16} className={color} />
              </div>
            </div>
            <p className="text-2xl font-black text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Status Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <p className="font-bold text-foreground">Ticket Status Breakdown</p>
          {statusEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets found</p>
          ) : (
            statusEntries.map(([key, val]) => {
              const pct = Math.round((val / totalStatus) * 100);
              const colors: Record<string, string> = {
                received:      "bg-slate-400",
                diagnosed:     "bg-blue-400",
                estimate_sent: "bg-indigo-400",
                approved:      "bg-cyan-400",
                in_repair:     "bg-amber-400",
                ready:         "bg-emerald-400",
                delivered:     "bg-emerald-600",
                cancelled:     "bg-red-400",
              };
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{STATUS_LABELS[key] ?? key}</span>
                    <span className="font-bold text-foreground">{val} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${colors[key] ?? "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Monthly Revenue */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <p className="font-bold text-foreground">Monthly Revenue</p>
          {data.monthly && data.monthly.length > 0 ? (
            <div className="flex items-end gap-2 h-40 overflow-x-auto pb-1">
              {(() => {
                const maxRev = Math.max(...data.monthly.map((m: any) => m.revenue), 1);
                return data.monthly.map((m: any, i: number) => {
                  const pct = Math.round((m.revenue / maxRev) * 100);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 shrink-0 flex-1 min-w-[36px] group">
                      <span className="text-[9px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Rs. {(m.revenue / 1000).toFixed(0)}K
                      </span>
                      <div
                        className="w-full rounded-t-lg bg-primary/30 group-hover:bg-primary transition-all"
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      />
                      <span className="text-[9px] font-bold text-muted-foreground">{m.month}</span>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No monthly data yet</p>
          )}
        </div>
      </div>

      {/* Top Technicians */}
      {data.topTechs && data.topTechs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-primary" />
            <p className="font-bold text-foreground">Top Technicians</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Technician</th>
                  <th className="px-4 py-3">Tickets</th>
                  <th className="px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.topTechs.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                        i === 0 ? "bg-amber-400 text-amber-900" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-orange-800" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{t.name ?? "Unknown"}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{t.tickets}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">Rs. {(t.revenue ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
