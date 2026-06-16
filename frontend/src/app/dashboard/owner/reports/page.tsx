"use client";

/**
 * OWNER REPORTS — /dashboard/owner/reports
 *
 * Sections:
 * 1. KPI Summary Cards  — revenue, tickets, avg repair value, outstanding
 * 2. Revenue by Month   — bar chart (mock data, CSS-only)
 * 3. Ticket Status Breakdown — donut-style pill chart
 * 4. Top Technicians    — ranked table by tickets closed
 * 5. Export Buttons     — CSV / Print (UI-only)
 */

import DashboardShell from "@/components/DashboardShell";
import {
  BarChart3, TrendingUp, Ticket, DollarSign,
  AlertCircle, Users, Download, Printer,
  CheckCircle2, Clock, Wrench, XCircle,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MONTHLY_REVENUE = [
  { month: "Jan", revenue: 142000 },
  { month: "Feb", revenue: 178500 },
  { month: "Mar", revenue: 164200 },
  { month: "Apr", revenue: 221000 },
  { month: "May", revenue: 198700 },
  { month: "Jun", revenue: 247300 },
  { month: "Jul", revenue: 233800 },
  { month: "Aug", revenue: 289100 },
  { month: "Sep", revenue: 271400 },
  { month: "Oct", revenue: 315600 },
  { month: "Nov", revenue: 298200 },
  { month: "Dec", revenue: 342800 },
];

const TICKET_STATUS = [
  { label: "Completed",   count: 412, color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-200", icon: CheckCircle2 },
  { label: "In Progress", count: 87,  color: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-100",    border: "border-blue-200",    icon: Wrench },
  { label: "Pending",     count: 53,  color: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-100",   border: "border-amber-200",   icon: Clock },
  { label: "Cancelled",   count: 21,  color: "bg-red-500",     text: "text-red-700",     bg: "bg-red-100",     border: "border-red-200",     icon: XCircle },
];

const TOP_TECHS = [
  { name: "Bilal Ahmed",   tickets: 134, revenue: 412500, rating: 4.9 },
  { name: "Sara Malik",    tickets: 118, revenue: 378200, rating: 4.8 },
  { name: "Usman Raza",    tickets: 97,  revenue: 291400, rating: 4.7 },
  { name: "Ayesha Khan",   tickets: 63,  revenue: 189700, rating: 4.6 },
];

const TOTAL_TICKETS = TICKET_STATUS.reduce((s, x) => s + x.count, 0);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `PKR ${n.toLocaleString("en-PK")}`;
}

const MAX_REVENUE = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  trend,
  trendUp,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
              trendUp
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
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

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  color,
  action,
  children,
}: {
  icon: any;
  title: string;
  color: string;
  action?: React.ReactNode;
  children: React.ReactNode;
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerReportsPage() {
  return (
    <DashboardShell requiredRole="owner">
      {() => <ReportsContent />}
    </DashboardShell>
  );
}

function ReportsContent() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Reports & Analytics</h1>
            <p className="text-sm text-muted-foreground">Full financial and operational overview · FY 2025</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-muted-foreground text-sm font-bold rounded-xl hover:border-border/70 hover:text-foreground transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={() => alert("CSV export requires backend integration.")}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:opacity-90 transition-all active:scale-[0.98] shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── 1. KPI Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Total Revenue"
          value="PKR 2.96M"
          sub="All-time collected"
          color="bg-emerald-600"
          trend="+18%"
          trendUp
        />
        <KpiCard
          icon={Ticket}
          label="Total Tickets"
          value={TOTAL_TICKETS.toString()}
          sub="Across all statuses"
          color="bg-blue-600"
          trend="+12%"
          trendUp
        />
        <KpiCard
          icon={TrendingUp}
          label="Avg Repair Value"
          value="PKR 5,130"
          sub="Per closed ticket"
          color="bg-indigo-600"
          trend="+5%"
          trendUp
        />
        <KpiCard
          icon={AlertCircle}
          label="Outstanding"
          value="PKR 84,200"
          sub="Unpaid invoices"
          color="bg-rose-600"
          trend="+3%"
          trendUp={false}
        />
      </div>

      {/* ── 2. Monthly Revenue Bar Chart ────────────────────────────────────── */}
      <Section icon={BarChart3} title="Monthly Revenue — 2025" color="bg-amber-500">
        <div className="flex items-end gap-2 h-48 overflow-x-auto pb-1">
          {MONTHLY_REVENUE.map((m) => {
            const pct = Math.round((m.revenue / MAX_REVENUE) * 100);
            const isCurrentMonth = m.month === "Jun"; // adjust as needed
            return (
              <div key={m.month} className="flex flex-col items-center gap-1.5 shrink-0 flex-1 min-w-[40px] group">
                <span className="text-[10px] font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {fmt(m.revenue)}
                </span>
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    isCurrentMonth
                      ? "bg-primary shadow-md"
                      : "bg-primary/30 group-hover:bg-primary/60"
                  }`}
                  style={{ height: `${pct}%` }}
                />
                <span className="text-[10px] font-bold text-muted-foreground">{m.month}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-right">
          Hover bars to see exact values · Current month highlighted
        </p>
      </Section>

      {/* ── 3. Ticket Status Breakdown ──────────────────────────────────────── */}
      <Section icon={Ticket} title="Ticket Status Breakdown" color="bg-blue-600">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {TICKET_STATUS.map(({ label, count, text, bg, border, icon: Icon }) => (
            <div
              key={label}
              className={`${bg} ${border} border rounded-2xl p-4 flex flex-col gap-2`}
            >
              <div className={`flex items-center gap-2 ${text}`}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
              </div>
              <p className={`text-3xl font-black ${text}`}>{count}</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {Math.round((count / TOTAL_TICKETS) * 100)}% of total
              </p>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className="space-y-3">
          {TICKET_STATUS.map(({ label, count, color }) => {
            const pct = Math.round((count / TOTAL_TICKETS) * 100);
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground w-24 shrink-0">{label}</span>
                <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`${color} h-full rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-black text-foreground w-8 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── 4. Top Technicians ──────────────────────────────────────────────── */}
      <Section icon={Users} title="Top Technicians" color="bg-purple-600">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted border-b border-border text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <th className="px-5 py-3">Rank</th>
                <th className="px-5 py-3">Technician</th>
                <th className="px-5 py-3">Tickets Closed</th>
                <th className="px-5 py-3">Revenue Generated</th>
                <th className="px-5 py-3">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TOP_TECHS.map((t, i) => (
                <tr key={t.name} className="hover:bg-muted/50 transition-colors text-sm">
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-black text-xs ${
                        i === 0
                          ? "bg-amber-400 text-amber-900"
                          : i === 1
                          ? "bg-slate-300 text-slate-700"
                          : i === 2
                          ? "bg-orange-300 text-orange-800"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-card-foreground">{t.name}</td>
                  <td className="px-5 py-4 font-semibold text-foreground">{t.tickets}</td>
                  <td className="px-5 py-4 font-semibold text-emerald-600">{fmt(t.revenue)}</td>
                  <td className="px-5 py-4">
                    <span className="text-amber-500 font-black">★ {t.rating}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── 5. Export / Print note ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 bg-muted/60 border border-border rounded-2xl p-4">
        <Download className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground">
          Data shown is mock / seeded. Connect to the live backend to pull real revenue, ticket counts,
          and technician stats. Export CSV and Print buttons are wired up — backend endpoint TBD.
        </p>
      </div>

    </div>
  );
}