"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import Link from "next/link";
import {
  Users, Search, RefreshCw, Loader2, AlertTriangle,
  XCircle, Building2, Phone, Mail, UserCheck, Filter, Trash2, CheckCircle, Wrench,
} from "lucide-react";

interface RecentTicket {
  _id: string;
  ticketNumber: string;
  status: string;
  estimateAmount: number | null;
  createdAt: string;
}

interface Customer {
  _id:              string;
  name:             string;
  phone:            string;
  email?:           string;
  tenantId:         string;
  tenantName:       string;
  tenantSubdomain:  string;
  hasPortalAccount: boolean;
  totalTickets?:    number;
  recentTickets?:   RecentTicket[];
  createdAt:        string;
}

const STATUS_COLORS: Record<string, string> = {
  received:      "bg-slate-100 text-slate-700",
  diagnosed:     "bg-blue-100 text-blue-700",
  estimate_sent: "bg-amber-100 text-amber-700",
  approved:      "bg-purple-100 text-purple-700",
  in_repair:     "bg-orange-100 text-orange-700",
  ready:         "bg-emerald-100 text-emerald-700",
  delivered:     "bg-green-100 text-green-700",
  cancelled:     "bg-red-100 text-red-700",
};

interface TenantOption {
  _id:  string;
  name: string;
}

export default function SuperAdminCustomersPage() {
  return (
    <DashboardShell requiredRole={["super_admin", "admin"]}>
      {() => <CustomersContent />}
    </DashboardShell>
  );
}

function CustomersContent() {
  const [customers, setCustomers]       = useState<Customer[]>([]);
  const [tenants,   setTenants]         = useState<TenantOption[]>([]);
  const [loading,   setLoading]         = useState(true);
  const [error,     setError]           = useState("");
  const [search,    setSearch]          = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [portalFilter, setPortalFilter] = useState("all");
  const [selected,  setSelected]        = useState<Customer | null>(null);
  const [success,   setSuccess]         = useState("");
  const [deleting,  setDeleting]        = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [custRes, tenantRes] = await Promise.all([
        api.get("/api/admin/customers?limit=300"),
        api.get("/api/admin/tenants?limit=200"),
      ]);
      const custList: Customer[] = custRes.data?.data ?? [];
      setCustomers(custList);
      const tenantList: TenantOption[] = (tenantRes.data?.data ?? []).map((t: any) => ({
        _id:  String(t._id),
        name: t.name ?? t.shopName ?? t.subdomain ?? 'Unknown',
      }));
      setTenants(tenantList);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to load customers.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch  = c.name.toLowerCase().includes(q) ||
                         c.phone.includes(q) ||
                         (c.email || '').toLowerCase().includes(q) ||
                         c.tenantName.toLowerCase().includes(q);
    const matchTenant  = tenantFilter === 'all' || c.tenantId === tenantFilter;
    const matchPortal  = portalFilter === 'all' ||
                         (portalFilter === 'yes' && c.hasPortalAccount) ||
                         (portalFilter === 'no'  && !c.hasPortalAccount);
    return matchSearch && matchTenant && matchPortal;
  });

  const stats = {
    total:   customers.length,
    portal:  customers.filter(c => c.hasPortalAccount).length,
    tenants: new Set(customers.map(c => c.tenantId)).size,
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-PK');

  const deleteCustomer = async (c: Customer) => {
    if (!window.confirm(`Permanently delete "${c.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/api/admin/customers/${c._id}`);
      setCustomers((prev) => prev.filter((x) => x._id !== c._id));
      if (selected?._id === c._id) setSelected(null);
      setSuccess(`${c.name} permanently deleted.`);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete customer.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Customers</h1>
          <p className="text-muted-foreground font-medium mt-0.5">All shop customers platform-wide</p>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-all">
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
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 dark:bg-emerald-900/20 dark:border-emerald-800">
          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Customers",   value: stats.total,   color: "text-foreground"  },
          { label: "Portal Accounts",   value: stats.portal,  color: "text-blue-500"    },
          { label: "Shops w/ Customers",value: stats.tenants, color: "text-emerald-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
            <p className={`text-xl font-black ${color}`}>
              {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : value}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by name, phone, email, or shop…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium" />
        </div>

        {/* Tenant filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-muted-foreground shrink-0" />
          <select value={tenantFilter} onChange={e => setTenantFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="all">All Shops</option>
            {tenants.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>

        {/* Portal filter */}
        <div className="flex gap-2">
          {[['all', 'All'], ['yes', 'Has Portal'], ['no', 'No Portal']].map(([v, l]) => (
            <button key={v} onClick={() => setPortalFilter(v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${portalFilter === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <p className="text-sm font-bold text-foreground">
                {loading ? 'Loading…' : `${filtered.length} customer${filtered.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="animate-spin w-6 h-6 mr-3" />
                <span>Loading customers…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Users size={28} className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-medium">No customers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Shop</th>
                      <th className="px-5 py-3">Repairs</th>
                      <th className="px-5 py-3">Portal</th>
                      <th className="px-5 py-3">Since</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map(c => (
                      <tr key={String(c._id)} onClick={() => setSelected(c)}
                        className={`cursor-pointer transition-colors ${selected?._id === String(c._id) ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 text-primary font-black text-xs">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{c.name}</p>
                              <p className="text-[11px] text-muted-foreground">{c.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 size={11} className="text-muted-foreground" />
                            <span className="text-xs text-muted-foreground font-medium">{c.tenantName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
                            <Wrench size={11} className="text-muted-foreground" />
                            {c.totalTickets ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {c.hasPortalAccount ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              <UserCheck size={9} /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{fmtDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div>
          {selected ? (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 sticky top-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black text-lg">
                  {selected.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-foreground">{selected.name}</p>
                  {selected.hasPortalAccount && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Portal Account
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2.5">
                  <Phone size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Phone</p>
                    <p className="text-sm font-semibold text-foreground">{selected.phone}</p>
                  </div>
                </div>

                {selected.email && (
                  <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2.5">
                    <Mail size={13} className="text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Email</p>
                      <p className="text-sm font-semibold text-foreground">{selected.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2.5">
                  <Building2 size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Shop</p>
                    <p className="text-sm font-semibold text-foreground">{selected.tenantName}</p>
                    <p className="text-[11px] text-muted-foreground">{selected.tenantSubdomain}.dibnow.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2.5">
                  <Users size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Customer Since</p>
                    <p className="text-sm font-semibold text-foreground">{fmtDate(selected.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">
                  Repair History {typeof selected.totalTickets === "number" && `(${selected.totalTickets})`}
                </p>
                {selected.recentTickets && selected.recentTickets.length > 0 ? (
                  <div className="space-y-2">
                    {selected.recentTickets.map((t) => (
                      <Link
                        key={t._id}
                        href={`/dashboard/super-admin/tickets/${t._id}`}
                        className="flex items-center justify-between bg-muted/50 hover:bg-muted rounded-xl px-3 py-2 transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-primary">{t.ticketNumber}</p>
                          <p className="text-[10px] text-muted-foreground">{fmtDate(t.createdAt)}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[t.status] ?? "bg-muted text-muted-foreground"}`}>
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No repairs booked yet.</p>
                )}
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5">Tenant ID</p>
                <p className="font-mono text-[11px] text-muted-foreground break-all">{selected.tenantId}</p>
              </div>

              <button
                onClick={() => deleteCustomer(selected)}
                disabled={deleting}
                className="w-full py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Permanently
              </button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Users size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
