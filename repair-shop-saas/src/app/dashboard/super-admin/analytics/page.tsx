"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { TrendingUp, TrendingDown, Building2, Users, Ticket, DollarSign, Globe, BarChart2, Activity } from "lucide-react";

const PERIODS = [
  { key: "week", label: "7 Days" },
  { key: "month", label: "30 Days" },
  { key: "quarter", label: "90 Days" },
];

const MOCK_TENANTS_ACTIVITY = [
  { name: "TechFix Lahore", plan: "Pro", tickets: 178, revenue: 1240000, growth: "+14%", up: true, status: "active" },
  { name: "MobileZone Karachi", plan: "Starter", tickets: 92, revenue: 640000, growth: "+8%", up: true, status: "active" },
  { name: "iRepair Islamabad", plan: "Pro", tickets: 134, revenue: 980000, growth: "-3%", up: false, status: "active" },
  { name: "GadgetCure Peshawar", plan: "Starter", tickets: 44, revenue: 295000, growth: "+22%", up: true, status: "trial" },
  { name: "SmartFix Multan", plan: "Pro", tickets: 89, revenue: 670000, growth: "+5%", up: true, status: "active" },
];

export default function SuperAdminAnalyticsPage() {
  const [period, setPeriod] = useState("month");

  const totalRevenue = MOCK_TENANTS_ACTIVITY.reduce((s, t) => s + t.revenue, 0);
  const totalTickets = MOCK_TENANTS_ACTIVITY.reduce((s, t) => s + t.tickets, 0);
  const activeTenants = MOCK_TENANTS_ACTIVITY.filter((t) => t.status === "active").length;

  return (
    <DashboardShell requiredRole="super_admin">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Platform Analytics</h1>
              <p className="text-muted-foreground font-medium mt-0.5">All tenants — performance overview</p>
            </div>
            <div className="flex gap-2 bg-muted rounded-xl p-1">
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
          </div>

          {/* Global KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Revenue", value: `Rs. ${(totalRevenue / 1000000).toFixed(1)}M`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", trend: "+11%", up: true },
              { label: "Active Tenants", value: activeTenants, icon: Building2, color: "text-primary", bg: "bg-primary/5", trend: "+2", up: true },
              { label: "Total Tickets", value: totalTickets, icon: Ticket, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20", trend: "+9%", up: true },
              { label: "Total Users", value: "247", icon: Users, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", trend: "+18", up: true },
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

          {/* Plan Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <p className="font-bold text-foreground">Plan Distribution</p>
              {[
                { label: "Pro", count: 3, color: "bg-primary" },
                { label: "Starter", count: 2, color: "bg-blue-400" },
                { label: "Trial", count: 1, color: "bg-amber-400" },
              ].map(({ label, count, color }) => {
                const pct = Math.round((count / MOCK_TENANTS_ACTIVITY.length) * 100);
                return (
                  <div key={label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{label}</span>
                      <span className="font-bold text-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tenant Revenue Bar */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
              <p className="font-bold text-foreground">Revenue by Tenant</p>
              {MOCK_TENANTS_ACTIVITY.map((t) => {
                const pct = Math.round((t.revenue / totalRevenue) * 100);
                return (
                  <div key={t.name} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-foreground">{t.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${t.up ? "text-emerald-600" : "text-red-500"}`}>{t.growth}</span>
                        <span className="font-bold text-foreground">Rs. {(t.revenue / 1000).toFixed(0)}K</span>
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
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Tenant</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Plan</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Tickets</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Revenue</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Growth</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_TENANTS_ACTIVITY.map((t) => (
                    <tr key={t.name} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-foreground">{t.name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          t.plan === "Pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>{t.plan}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-foreground">{t.tickets}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-foreground">Rs. {(t.revenue / 1000).toFixed(0)}K</td>
                      <td className={`px-5 py-3.5 text-right font-bold ${t.up ? "text-emerald-600" : "text-red-500"}`}>{t.growth}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          t.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
