"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  MapPin, Search, Loader2, AlertTriangle,
  XCircle, RefreshCw, Globe, Phone, Smartphone,
  TrendingUp, Clock, CheckCircle2, UserPlus,
} from "lucide-react";

interface Lead {
  _id: string;
  customerName?: string;
  name?: string;
  phone?: string;
  device?: string;
  deviceType?: string;
  issue?: string;
  address?: string;
  location?: string;
  status?: string;
  tenantId?: string;
  tenantName?: string;
  shopName?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
}

const STATUS_FILTERS = ["All", "new", "contacted", "converted", "lost"];

const getStatusStyle = (status?: string) => {
  switch ((status ?? "").toLowerCase()) {
    case "new":       return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "contacted": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "converted": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "lost":      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:          return "bg-muted text-muted-foreground";
  }
};

export default function SuperAdminLeadsPage() {
  return (
    <DashboardShell requiredRole="super_admin">
      {(user) => <LeadsContent user={user} />}
    </DashboardShell>
  );
}

function LeadsContent({ user }: { user: any }) {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [filtered, setFiltered]         = useState<Lead[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch]             = useState("");
  const [sortKey, setSortKey]           = useState<"createdAt" | "status" | "tenantName">("createdAt");
  const [sortAsc, setSortAsc]           = useState(false);

  useEffect(() => { fetchLeads(); }, []);

  useEffect(() => { applyFilters(); }, [leads, search, statusFilter, sortKey, sortAsc]);

  const fetchLeads = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/leads?limit=200");
      const data = res.data?.data;
      setLeads(Array.isArray(data) ? data : data?.leads ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let result = [...leads];

    if (statusFilter !== "All") {
      result = result.filter((l) =>
        (l.status ?? "new").toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        (l.customerName ?? l.name ?? "").toLowerCase().includes(q) ||
        (l.phone ?? "").includes(q) ||
        (l.device ?? l.deviceType ?? "").toLowerCase().includes(q) ||
        (l.address ?? l.location ?? "").toLowerCase().includes(q) ||
        (l.tenantName ?? l.shopName ?? "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let va = (a as any)[sortKey] ?? "";
      let vb = (b as any)[sortKey] ?? "";
      if (sortKey === "createdAt") {
        va = new Date(va).getTime();
        vb = new Date(vb).getTime();
      } else {
        va = va.toString().toLowerCase();
        vb = vb.toString().toLowerCase();
      }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    setFiltered(result);
  }, [leads, search, statusFilter, sortKey, sortAsc]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const total     = leads.length;
  const newCount  = leads.filter((l) => (l.status ?? "new").toLowerCase() === "new").length;
  const contacted = leads.filter((l) => l.status?.toLowerCase() === "contacted").length;
  const converted = leads.filter((l) => l.status?.toLowerCase() === "converted").length;

  const displayName = (l: Lead) => l.customerName ?? l.name ?? "—";
  const shopName    = (l: Lead) => l.tenantName ?? l.shopName ?? "—";

  const SortArrow = ({ col }: { col: typeof sortKey }) =>
    sortKey === col ? <span className="ml-1 opacity-60">{sortAsc ? "↑" : "↓"}</span> : null;

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-md">
            <MapPin className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Leads</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              GPS-routed customer leads for your shop.
            </p>
          </div>
        </div>
        <button
          onClick={fetchLeads}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stats Strip ──────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",     value: total,     icon: TrendingUp,   color: "text-muted-foreground" },
            { label: "New",       value: newCount,  icon: UserPlus,     color: "text-blue-400"         },
            { label: "Contacted", value: contacted, icon: Clock,        color: "text-amber-400"        },
            { label: "Converted", value: converted, icon: CheckCircle2, color: "text-emerald-400"      },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <Icon size={18} className={color} />
              <div>
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-destructive/60 hover:text-destructive">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* ── Filters & Search ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                statusFilter === f
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:border-border/70 hover:text-foreground"
              }`}
            >
              {f === "All" ? "All Statuses" : f}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, device, or issue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <MapPin size={15} className="text-rose-500" />
          <span className="font-bold text-card-foreground text-sm">
            {loading ? "Loading…" : `${filtered.length} lead${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin w-8 h-8 mb-4" />
            <p className="text-sm font-medium">Loading leads…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="mx-auto text-muted-foreground/20 w-10 h-10 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              {search || statusFilter !== "All" ? "No leads match your filters." : "No leads yet. They'll appear here when customers reach out."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <th className="px-6 py-4">Customer</th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort("tenantName")}
                  >
                    Shop <SortArrow col="tenantName" />
                  </th>
                  <th className="px-6 py-4">Device / Issue</th>
                  <th className="px-6 py-4">Location</th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort("status")}
                  >
                    Status <SortArrow col="status" />
                  </th>
                  <th
                    className="px-6 py-4 cursor-pointer hover:text-foreground select-none"
                    onClick={() => toggleSort("createdAt")}
                  >
                    Date <SortArrow col="createdAt" />
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-card-foreground divide-y divide-border">
                {filtered.map((lead) => (
                  <tr key={lead._id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-semibold text-foreground">{displayName(lead)}</p>
                      {lead.phone && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="text-muted-foreground" />
                          <span className="font-mono text-xs text-muted-foreground">{lead.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Globe size={11} className="text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground font-semibold">{shopName(lead)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      {(lead.device ?? lead.deviceType) && (
                        <div className="flex items-center gap-1.5">
                          <Smartphone size={11} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{lead.device ?? lead.deviceType}</span>
                        </div>
                      )}
                      {lead.issue && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 max-w-[180px] truncate">{lead.issue}</p>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {(lead.address ?? lead.location) ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={11} className="text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground max-w-[160px] truncate">
                            {lead.address ?? lead.location}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${getStatusStyle(lead.status)}`}>
                        {lead.status ?? "new"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}