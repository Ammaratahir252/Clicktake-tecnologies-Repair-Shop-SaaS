"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  Building2, Plus, Search, Globe, Users, Ticket, ChevronRight,
  CheckCircle, AlertCircle, Clock, Loader2, AlertTriangle, RefreshCw, XCircle,
} from "lucide-react";

interface Tenant {
  _id:       string;
  name:      string;
  subdomain: string;
  plan:      string;
  isActive:  boolean;
  email?:    string;
  phone?:    string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  trial:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function tenantStatus(t: Tenant) {
  return t.isActive ? "active" : "suspended";
}

export default function SuperAdminTenantsPage() {
  return (
    <DashboardShell requiredRole="super_admin">
      {() => <TenantsContent />}
    </DashboardShell>
  );
}

function TenantsContent() {
  const [tenants,  setTenants]  = useState<Tenant[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [acting,   setActing]   = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/tenants?limit=200");
      setTenants(res.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.name.toLowerCase().includes(q) ||
      t.subdomain.toLowerCase().includes(q) ||
      (t.email ?? "").toLowerCase().includes(q);
    const matchFilter =
      filter === "all" ||
      (filter === "active"    && t.isActive) ||
      (filter === "suspended" && !t.isActive) ||
      t.plan.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  const patchTenant = async (id: string, patch: Record<string, any>, msg: string) => {
    setActing(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch(`/api/admin/tenants/${id}`, patch);
      const updated = res.data?.data as Tenant;
      setTenants((prev) => prev.map((t) => (t._id === id ? updated : t)));
      if (selected?._id === id) setSelected(updated);
      setSuccess(msg);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Action failed.");
    } finally {
      setActing(false);
    }
  };

  const stats = {
    active:    tenants.filter((t) =>  t.isActive).length,
    suspended: tenants.filter((t) => !t.isActive).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Tenants</h1>
          <p className="text-muted-foreground font-medium mt-0.5">
            {loading ? "Loading…" : `${tenants.length} shop${tenants.length !== 1 ? "s" : ""} on this platform`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTenants}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm">
            <Plus size={16} />
            Add Tenant
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-destructive/60 hover:text-destructive"><XCircle size={14} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 dark:bg-emerald-900/20 dark:border-emerald-800">
          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total",     value: tenants.length, color: "text-foreground"   },
          { label: "Active",    value: stats.active,   color: "text-emerald-500"  },
          { label: "Suspended", value: stats.suspended, color: "text-red-500"     },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${color}`}>
              {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : value}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, subdomain, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "active", "suspended", "pro", "enterprise", "free"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant List */}
        <div className="lg:col-span-2 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin w-6 h-6 mr-3" />
              <span className="font-medium">Loading tenants…</span>
            </div>
          )}
          {!loading && filtered.map((tenant) => {
            const status = tenantStatus(tenant);
            const StatusIcon = status === "active" ? CheckCircle : status === "suspended" ? AlertCircle : Clock;
            return (
              <button
                key={tenant._id}
                onClick={() => setSelected(tenant)}
                className={`w-full text-left bg-card border rounded-xl p-4 hover:border-primary/50 transition-all ${
                  selected?._id === tenant._id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Building2 size={18} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground">{tenant.name}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          tenant.plan === "enterprise" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                          : tenant.plan === "pro"      ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {tenant.plan}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{tenant.subdomain}.dibnow.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${STATUS_STYLES[status] ?? STATUS_STYLES.active}`}>
                      <StatusIcon size={10} />
                      {status}
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe size={11} />
                    Joined {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" }) : "—"}
                  </span>
                </div>
              </button>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <Building2 size={28} className="text-muted-foreground mx-auto mb-2" />
              <p className="font-bold text-foreground">No tenants found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {selected ? (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 sticky top-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 size={22} className="text-primary" />
                </div>
                <div>
                  <p className="font-black text-foreground">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected._id.slice(-8)}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {[
                  { label: "Subdomain", value: selected.subdomain, mono: true },
                  { label: "Plan",      value: selected.plan       },
                  { label: "Email",     value: selected.email || "—" },
                  { label: "Joined",    value: selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("en-PK") : "—" },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-medium text-foreground ${mono ? "font-mono text-xs text-primary" : ""}`}>{value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[tenantStatus(selected)] ?? STATUS_STYLES.active}`}>
                    {tenantStatus(selected)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {!selected.isActive ? (
                  <button
                    onClick={() => patchTenant(selected._id, { isActive: true }, `${selected.name} reactivated.`)}
                    disabled={acting}
                    className="w-full py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {acting && <Loader2 size={13} className="animate-spin" />}
                    Reactivate Tenant
                  </button>
                ) : (
                  <button
                    onClick={() => patchTenant(selected._id, { isActive: false }, `${selected.name} suspended.`)}
                    disabled={acting}
                    className="w-full py-2.5 bg-red-100 text-red-600 font-bold rounded-xl text-sm hover:bg-red-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {acting && <Loader2 size={13} className="animate-spin" />}
                    Suspend Tenant
                  </button>
                )}
                <div className="flex gap-2">
                  {["free", "pro", "enterprise"].map((plan) => (
                    <button
                      key={plan}
                      onClick={() => patchTenant(selected._id, { plan }, `Plan changed to ${plan}.`)}
                      disabled={acting || selected.plan === plan}
                      className={`flex-1 py-2 font-bold rounded-xl text-xs capitalize transition-all disabled:opacity-40 ${
                        selected.plan === plan
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
                <a
                  href={`https://${selected.subdomain}.dibnow.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <Globe size={14} />
                  Open Shop
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Building2 size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">Select a tenant to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
