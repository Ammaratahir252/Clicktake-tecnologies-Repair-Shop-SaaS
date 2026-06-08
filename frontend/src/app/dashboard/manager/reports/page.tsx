"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { TrendingUp, TrendingDown, BarChart2, Package, Users, Ticket, DollarSign, Download, Calendar } from "lucide-react";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

const MOCK_DATA = {
  today: {
    revenue: 66000,
    tickets: 8,
    newCustomers: 3,
    avgRepairTime: "2.4h",
    topService: "Screen Replacement",
    ticketsByStatus: { open: 4, in_progress: 3, closed: 1 },
    revenueByMethod: { cash: 28000, card: 22000, digital: 16000 },
  },
  week: {
    revenue: 312000,
    tickets: 42,
    newCustomers: 18,
    avgRepairTime: "3.1h",
    topService: "Battery Replacement",
    ticketsByStatus: { open: 12, in_progress: 15, closed: 15 },
    revenueByMethod: { cash: 140000, card: 98000, digital: 74000 },
  },
  month: {
    revenue: 1240000,
    tickets: 178,
    newCustomers: 67,
    avgRepairTime: "2.8h",
    topService: "Screen Replacement",
    ticketsByStatus: { open: 22, in_progress: 31, closed: 125 },
    revenueByMethod: { cash: 550000, card: 390000, digital: 300000 },
  },
  year: {
    revenue: 14800000,
    tickets: 2140,
    newCustomers: 820,
    avgRepairTime: "2.9h",
    topService: "Screen Replacement",
    ticketsByStatus: { open: 22, in_progress: 31, closed: 2087 },
    revenueByMethod: { cash: 6600000, card: 4700000, digital: 3500000 },
  },
};

const BAR_COLORS = ["bg-primary", "bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-purple-400"];

export default function ManagerReportsPage() {
  const [period, setPeriod] = useState<keyof typeof MOCK_DATA>("month");
  const data = MOCK_DATA[period];

  const maxRevBar = Math.max(...Object.values(data.revenueByMethod));

  return (
    <DashboardShell requiredRole="manager">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Reports</h1>
              <p className="text-muted-foreground font-medium mt-0.5">Business performance overview</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/70 transition-all text-sm">
              <Download size={16} />
              Export
            </button>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 bg-muted rounded-xl p-1 w-fit">
            {PERIODS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key as keyof typeof MOCK_DATA)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  period === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Revenue",
                value: `Rs. ${(data.revenue / 1000).toFixed(0)}K`,
                icon: DollarSign,
                color: "text-emerald-600",
                bg: "bg-emerald-50 dark:bg-emerald-900/20",
                trend: "+12%",
                up: true,
              },
              {
                label: "Tickets",
                value: data.tickets,
                icon: Ticket,
                color: "text-primary",
                bg: "bg-primary/5",
                trend: "+8%",
                up: true,
              },
              {
                label: "New Customers",
                value: data.newCustomers,
                icon: Users,
                color: "text-purple-600",
                bg: "bg-purple-50 dark:bg-purple-900/20",
                trend: "+5%",
                up: true,
              },
              {
                label: "Avg Repair Time",
                value: data.avgRepairTime,
                icon: Calendar,
                color: "text-amber-600",
                bg: "bg-amber-50 dark:bg-amber-900/20",
                trend: "-3%",
                up: false,
              },
            ].map(({ label, value, icon: Icon, color, bg, trend, up }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                    <Icon size={16} className={color} />
                  </div>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-red-500"}`}>
                    {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {trend}
                  </span>
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
              {Object.entries(data.ticketsByStatus).map(([key, val]) => {
                const total = Object.values(data.ticketsByStatus).reduce((a, b) => a + b, 0);
                const pct = Math.round((val / total) * 100);
                const colors: Record<string, string> = {
                  open: "bg-blue-400",
                  in_progress: "bg-amber-400",
                  closed: "bg-emerald-400",
                };
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground capitalize">{key.replace("_", " ")}</span>
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
              })}
            </div>

            {/* Revenue by Method */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <p className="font-bold text-foreground">Revenue by Payment Method</p>
              {Object.entries(data.revenueByMethod).map(([method, val], i) => {
                const pct = Math.round((val / maxRevBar) * 100);
                return (
                  <div key={method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground capitalize">{method}</span>
                      <span className="font-bold text-foreground">Rs. {(val / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${BAR_COLORS[i] ?? "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Service */}
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <BarChart2 size={22} className="text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">Top Service {period === "today" ? "Today" : `This ${period.charAt(0).toUpperCase() + period.slice(1)}`}</p>
              <p className="text-xl font-black text-foreground mt-0.5">{data.topService}</p>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
