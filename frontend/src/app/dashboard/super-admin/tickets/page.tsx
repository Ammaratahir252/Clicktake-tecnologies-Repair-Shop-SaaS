"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Search, Ticket, Building2, User, Clock, AlertCircle, CheckCircle, Filter } from "lucide-react";

const TICKET_STATUSES = [
  { key: "open",        label: "Open",         color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "diagnosed",   label: "Diagnosed",    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { key: "in_progress", label: "In Progress",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "ready",       label: "Ready",        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { key: "delivered",   label: "Delivered",    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
];

const MOCK_TICKETS = [
  { id: "REP-2026-00451", tenant: "TechFix Lahore", customer: "Ahmed Khan", device: "iPhone 15 Pro Max", issue: "Screen cracked", status: "in_progress", technician: "Ali Raza", createdAt: "2026-06-06T09:00:00", amount: 28000 },
  { id: "REP-2026-00448", tenant: "MobileZone Karachi", customer: "Sara Malik", device: "Samsung S24", issue: "Battery dead", status: "ready", technician: "Hassan B.", createdAt: "2026-06-06T08:30:00", amount: 12500 },
  { id: "REP-2026-00447", tenant: "iRepair Islamabad", customer: "Usman Raza", device: "MacBook Pro 14\"", issue: "Keyboard failure", status: "diagnosed", technician: "Kamran S.", createdAt: "2026-06-05T15:00:00", amount: 45000 },
  { id: "REP-2026-00446", tenant: "TechFix Lahore", customer: "Fatima Noor", device: "Dell XPS 13", issue: "No display", status: "open", technician: null, createdAt: "2026-06-06T10:45:00", amount: 18000 },
  { id: "REP-2026-00445", tenant: "SmartFix Multan", customer: "Bilal Sheikh", device: "iPad Pro", issue: "Touch not working", status: "delivered", technician: "Zain M.", createdAt: "2026-06-04T11:00:00", amount: 8500 },
  { id: "REP-2026-00444", tenant: "GadgetCure Peshawar", customer: "Nida Tariq", device: "Huawei P50", issue: "Water damage", status: "in_progress", technician: "Adnan K.", createdAt: "2026-06-05T14:00:00", amount: 9500 },
];

function StatusBadge({ status }: { status: string }) {
  const s = TICKET_STATUSES.find((x) => x.key === status) ?? TICKET_STATUSES[0];
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SuperAdminTicketsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");

  const tenants = Array.from(new Set(MOCK_TICKETS.map((t) => t.tenant)));

  const filtered = MOCK_TICKETS.filter((t) => {
    const matchSearch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.device.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchTenant = tenantFilter === "all" || t.tenant === tenantFilter;
    return matchSearch && matchStatus && matchTenant;
  });

  const stats = {
    total: MOCK_TICKETS.length,
    open: MOCK_TICKETS.filter((t) => t.status === "open" || t.status === "in_progress" || t.status === "diagnosed").length,
    ready: MOCK_TICKETS.filter((t) => t.status === "ready").length,
    delivered: MOCK_TICKETS.filter((t) => t.status === "delivered").length,
  };

  return (
    <DashboardShell requiredRole="super_admin">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-black text-foreground">All Tickets</h1>
            <p className="text-muted-foreground font-medium mt-0.5">Platform-wide ticket overview across all tenants</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total", value: stats.total, color: "text-foreground" },
              { label: "Active", value: stats.open, color: "text-amber-500" },
              { label: "Ready", value: stats.ready, color: "text-emerald-500" },
              { label: "Delivered", value: stats.delivered, color: "text-blue-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by ticket ID, customer, or device…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold mr-1">
                <Filter size={12} /> Status:
              </span>
              {["all", ...TICKET_STATUSES.map((s) => s.key)].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    statusFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.replace("_", " ")}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold mr-1">
                <Building2 size={12} /> Tenant:
              </span>
              {["all", ...tenants].map((t) => (
                <button
                  key={t}
                  onClick={() => setTenantFilter(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    tenantFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "All Tenants" : t}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Table */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Ticket</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Tenant</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Customer</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Device</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Technician</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Amount</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-primary text-xs">{t.id}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                          <Building2 size={11} className="text-muted-foreground" />
                          {t.tenant}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-foreground">{t.customer}</td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">{t.device}</td>
                      <td className="px-5 py-3.5">
                        {t.technician ? (
                          <span className="text-foreground font-medium text-xs">{t.technician}</span>
                        ) : (
                          <span className="text-amber-600 text-xs font-bold flex items-center gap-1">
                            <AlertCircle size={11} /> Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-foreground">Rs. {t.amount.toLocaleString()}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium">{timeAgo(t.createdAt)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground font-medium">
                        No tickets found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
