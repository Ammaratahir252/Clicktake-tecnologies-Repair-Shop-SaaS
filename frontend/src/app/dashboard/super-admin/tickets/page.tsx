"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  Search, Ticket, Building2, AlertCircle, Filter,
  Loader2, AlertTriangle, RefreshCw, XCircle,
} from "lucide-react";

const TICKET_STATUSES = [
  { key: "open",        label: "Open",        color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"       },
  { key: "diagnosed",   label: "Diagnosed",   color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"   },
  { key: "ready",       label: "Ready",       color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { key: "delivered",   label: "Delivered",   color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"       },
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

interface TicketRecord {
  _id:           string;
  ticketNumber:  string;
  tenantId?:     { _id: string; name: string; subdomain: string } | string;
  customerName:  string;
  customerPhone: string;
  deviceBrand:   string;
  deviceModel:   string;
  technicianId?: { _id: string; name: string } | string;
  estimateAmount?: number;
  status:        string;
  createdAt:     string;
}

export default function SuperAdminTicketsPage() {
  return (
    <DashboardShell requiredRole="super_admin">
      {() => <TicketsContent />}
    </DashboardShell>
  );
}

function TicketsContent() {
  const [tickets,      setTickets]      = useState<TicketRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/tickets?limit=300");
      setTickets(res.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const tenantName = (t: TicketRecord) => {
    if (!t.tenantId) return "—";
    if (typeof t.tenantId === "object") return t.tenantId.name;
    return "—";
  };

  const techName = (t: TicketRecord) => {
    if (!t.technicianId) return null;
    if (typeof t.technicianId === "object") return (t.technicianId as any).name;
    return null;
  };

  const uniqueTenants = Array.from(
    new Set(tickets.map((t) => tenantName(t)).filter((n) => n !== "—"))
  );

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.ticketNumber.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      `${t.deviceBrand} ${t.deviceModel}`.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchTenant = tenantFilter === "all" || tenantName(t) === tenantFilter;
    return matchSearch && matchStatus && matchTenant;
  });

  const stats = {
    total:     tickets.length,
    active:    tickets.filter((t) => ["open", "diagnosed", "in_progress"].includes(t.status)).length,
    ready:     tickets.filter((t) => t.status === "ready").length,
    delivered: tickets.filter((t) => t.status === "delivered").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">All Tickets</h1>
          <p className="text-muted-foreground font-medium mt-0.5">Platform-wide ticket overview across all tenants</p>
        </div>
        <button
          onClick={fetchTickets}
          disabled={loading}
          className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-all"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <button onClick={() => setError("")} className="ml-auto"><XCircle size={14} className="text-destructive/60" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total",     value: loading ? "—" : stats.total,     color: "text-foreground"  },
          { label: "Active",    value: loading ? "—" : stats.active,    color: "text-amber-500"   },
          { label: "Ready",     value: loading ? "—" : stats.ready,     color: "text-emerald-500" },
          { label: "Delivered", value: loading ? "—" : stats.delivered, color: "text-blue-500"    },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${color}`}>
              {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : value}
            </p>
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
              {f.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        {uniqueTenants.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold mr-1">
              <Building2 size={12} /> Tenant:
            </span>
            {["all", ...uniqueTenants].map((t) => (
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
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin w-8 h-8 mr-3" />
            <span className="font-medium">Loading tickets…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Ticket", "Tenant", "Customer", "Device", "Technician", "Amount", "Status", "Age"].map((h) => (
                    <th key={h} className={`px-5 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wide ${h === "Amount" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t._id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-primary text-xs">{t.ticketNumber}</td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <Building2 size={11} className="text-muted-foreground" />
                        {tenantName(t)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{t.customerName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{t.customerPhone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{t.deviceBrand} {t.deviceModel}</td>
                    <td className="px-5 py-3.5">
                      {techName(t) ? (
                        <span className="text-foreground font-medium text-xs">{techName(t)}</span>
                      ) : (
                        <span className="text-amber-600 text-xs font-bold flex items-center gap-1">
                          <AlertCircle size={11} /> Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-foreground">
                      {t.estimateAmount ? `Rs. ${t.estimateAmount.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-medium">{timeAgo(t.createdAt)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground font-medium">
                      {search || statusFilter !== "all" || tenantFilter !== "all"
                        ? "No tickets match your filters."
                        : "No tickets yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
