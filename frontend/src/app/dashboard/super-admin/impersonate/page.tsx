"use client";

/**
 * SUPER ADMIN — /dashboard/super-admin/impersonate
 *
 * Allows a super admin to impersonate any tenant (shop owner) for support purposes.
 * Every impersonation action is permanently logged in the immutable audit trail.
 *
 * Features:
 * - Search / filter tenants by name or subdomain
 * - View tenant status (active / suspended)
 * - Start impersonation session (logged)
 * - Active impersonation banner with exit button
 */

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  UserCheck, Search, Loader2, ShieldAlert,
  AlertTriangle, LogIn, LogOut, Store,
  Globe, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";

interface Tenant {
  _id: string;
  name?: string;
  shopName?: string;
  subdomain?: string;
  plan?: string;
  isActive?: boolean;
  email?: string;
  ownerEmail?: string;
}

export default function ImpersonatePage() {
  return (
    <DashboardShell requiredRole="super_admin">
      {(user) => <ImpersonateContent superAdmin={user} />}
    </DashboardShell>
  );
}

function ImpersonateContent({ superAdmin }: { superAdmin: any }) {
  const [tenants, setTenants]           = useState<Tenant[]>([]);
  const [filtered, setFiltered]         = useState<Tenant[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [impersonating, setImpersonating] = useState<Tenant | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg]     = useState("");

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      tenants.filter(
        (t) =>
          (t.name ?? t.shopName ?? "").toLowerCase().includes(q) ||
          (t.subdomain ?? "").toLowerCase().includes(q) ||
          (t.email ?? t.ownerEmail ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, tenants]);

  const fetchTenants = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/tenants?limit=100");
      const data = res.data?.data;
      const list = Array.isArray(data) ? data : [];
      setTenants(list);
      setFiltered(list);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  };

  const startImpersonation = async (tenant: Tenant) => {
    setActionLoading(tenant._id);
    setSuccessMsg("");
    try {
      await api.post("/api/admin/impersonate", { tenantId: tenant._id });
      setImpersonating(tenant);
      setSuccessMsg(`Now impersonating: ${tenant.name ?? tenant.shopName ?? tenant.subdomain}. This action has been logged.`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start impersonation session.");
    } finally {
      setActionLoading(null);
    }
  };

  const endImpersonation = async () => {
    if (!impersonating) return;
    setActionLoading("exit");
    try {
      await api.post("/api/admin/impersonate/end");
      setImpersonating(null);
      setSuccessMsg("Impersonation session ended.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to end impersonation.");
    } finally {
      setActionLoading(null);
    }
  };

  const displayName = (t: Tenant) => t.name ?? t.shopName ?? t.subdomain ?? "Unknown Shop";

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-md">
            <UserCheck className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Impersonate Tenant</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              All sessions are permanently logged in the audit trail.
            </p>
          </div>
        </div>
        <button
          onClick={fetchTenants}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Warning Banner ─────────────────────────────────────────── */}
      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-black text-red-800">Sensitive Action — Platform Level</p>
          <p className="text-xs text-red-700 mt-1 leading-relaxed">
            Impersonating a tenant gives you full access to their shop data and allows actions
            on their behalf. Every impersonation start and end is permanently recorded including
            your user ID, timestamp, and IP address.
          </p>
        </div>
      </div>

      {/* ── Active Impersonation Banner ────────────────────────────── */}
      {impersonating && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-400 rounded-xl flex items-center justify-center">
              <UserCheck className="text-white w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-900">
                Active Session: {displayName(impersonating)}
              </p>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                {impersonating.subdomain && `${impersonating.subdomain}.dibnow.com`}
              </p>
            </div>
          </div>
          <button
            onClick={endImpersonation}
            disabled={actionLoading === "exit"}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-amber-700 transition-all shadow"
          >
            {actionLoading === "exit"
              ? <Loader2 size={13} className="animate-spin" />
              : <LogOut size={13} />}
            End Session
          </button>
        </div>
      )}

      {/* ── Alerts ─────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle size={16} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-sm font-semibold text-emerald-700">{successMsg}</p>
          <button onClick={() => setSuccessMsg("")} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────────────── */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by shop name, subdomain, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition-all"
        />
      </div>

      {/* ── Tenant Table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Store size={16} className="text-slate-500" />
          <span className="font-bold text-slate-800 text-sm">
            {loading ? "Loading tenants…" : `${filtered.length} tenant${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin w-8 h-8 mb-4" />
            <p className="text-sm font-medium">Loading tenants…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Store className="mx-auto text-slate-200 w-10 h-10 mb-3" />
            <p className="text-sm text-slate-400 font-medium">
              {search ? "No tenants match your search." : "No tenants found."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Shop</th>
                  <th className="px-6 py-4">Subdomain</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((tenant) => {
                  const isCurrentImpersonation = impersonating?._id === tenant._id;
                  const isLoading = actionLoading === tenant._id;
                  return (
                    <tr
                      key={tenant._id}
                      className={`transition-colors ${
                        isCurrentImpersonation ? "bg-amber-50/60" : "hover:bg-slate-50/50"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 shrink-0">
                            <Store size={14} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{displayName(tenant)}</p>
                            {(tenant.email ?? tenant.ownerEmail) && (
                              <p className="text-[11px] text-slate-400 font-medium">{tenant.email ?? tenant.ownerEmail}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <Globe size={11} className="text-slate-400" />
                          <span className="font-mono text-xs text-slate-500">{tenant.subdomain ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          tenant.plan === "enterprise" ? "bg-indigo-100 text-indigo-700"
                          : tenant.plan === "growth"   ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-600"
                        }`}>
                          {tenant.plan ?? "free"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          tenant.isActive !== false
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {tenant.isActive !== false ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isCurrentImpersonation ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
                            <UserCheck size={13} />
                            Current Session
                          </span>
                        ) : (
                          <button
                            onClick={() => startImpersonation(tenant)}
                            disabled={!!impersonating || !!actionLoading || tenant.isActive === false}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            {isLoading
                              ? <Loader2 size={11} className="animate-spin" />
                              : <LogIn size={11} />}
                            Impersonate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}