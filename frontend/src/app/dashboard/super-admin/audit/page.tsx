"use client";

/**
 * SUPER ADMIN — /dashboard/super-admin/audit
 *
 * Platform-wide immutable audit log viewer (all tenants).
 * Super admins can see ALL actions across ALL shops/users.
 *
 * Features:
 * - Filter by action type
 * - Search by user ID, entity, tenant ID, or IP
 * - Paginated (load more)
 * - Color-coded action badges
 * - Tenant column (cross-tenant view)
 */

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  FileText, Search, Loader2, ShieldAlert,
  AlertTriangle, XCircle, RefreshCw,
  ChevronDown, Globe, Filter,
} from "lucide-react";

interface AuditLog {
  _id: string;
  action: string;
  userId: string;
  tenantId?: string;
  tenantName?: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const ACTION_FILTERS = [
  "All",
  "AUTH_LOGIN",
  "AUTH_LOGOUT",
  "AUTH_REGISTER",
  "AUTH_PASSWORD_RESET_REQUEST",
  "IMPERSONATE_START",
  "IMPERSONATE_END",
  "TICKET_CREATE",
  "TICKET_UPDATE",
  "TENANT_SUSPEND",
  "TENANT_ACTIVATE",
  "USER_CREATE",
  "USER_UPDATE",
  "USER_DELETE",
];

const getActionColor = (action: string) => {
  if (action.includes("LOGIN"))                           return "bg-blue-100 text-blue-700";
  if (action.includes("LOGOUT"))                          return "bg-slate-100 text-slate-600";
  if (action.includes("REGISTER"))                        return "bg-emerald-100 text-emerald-700";
  if (action.includes("IMPERSONATE"))                     return "bg-red-100 text-red-700";
  if (action.includes("SUSPEND"))                         return "bg-red-100 text-red-700";
  if (action.includes("ACTIVATE"))                        return "bg-emerald-100 text-emerald-700";
  if (action.includes("DELETE"))                          return "bg-rose-100 text-rose-700";
  if (action.includes("CREATE"))                          return "bg-purple-100 text-purple-700";
  if (action.includes("UPDATE"))                          return "bg-amber-100 text-amber-700";
  if (action.includes("ERROR") || action.includes("FAILED")) return "bg-red-100 text-red-700";
  if (action.includes("PASSWORD"))                        return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

export default function SuperAdminAuditPage() {
  return (
    <DashboardShell requiredRole="super_admin">
      {(user) => <AuditContent superAdmin={user} />}
    </DashboardShell>
  );
}

function AuditContent({ superAdmin }: { superAdmin: any }) {
  const [logs, setLogs]           = useState<AuditLog[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]         = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const LIMIT = 50;

  const fetchLogs = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }
    setError("");

    try {
      const currentPage = reset ? 1 : page;
      let url = `/api/admin/audit-logs?limit=${LIMIT}&page=${currentPage}`;
      if (actionFilter !== "All") url += `&action=${actionFilter}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await api.get(url);
      const data: AuditLog[] = res.data?.data?.logs || res.data?.data || [];

      if (reset) {
        setLogs(data);
      } else {
        setLogs((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === LIMIT);
      if (!reset) setPage((p) => p + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [actionFilter, search, page]);

  // Refetch on filter change
  useEffect(() => {
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(true);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-md">
            <FileText className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Platform Audit Logs</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Immutable cross-tenant activity trail — all shops, all users.
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchLogs(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* ── Filters & Search ───────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Action filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-slate-400 shrink-0" />
          {ACTION_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActionFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                actionFilter === f
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {f === "All" ? "All Actions" : f.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by user ID, entity, tenant, or IP address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-24 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* ── Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShieldAlert size={15} className="text-slate-500" />
          <span className="font-bold text-slate-800 text-sm">
            {loading ? "Loading…" : `${logs.length} log${logs.length !== 1 ? "s" : ""} shown`}
          </span>
          <span className="ml-auto text-xs text-slate-400 font-medium">Read-only · Immutable</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin w-8 h-8 mb-4" />
            <p className="text-sm font-medium">Loading audit trail…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="mx-auto text-slate-200 w-10 h-10 mb-3" />
            <p className="text-sm text-slate-400 font-medium">No logs found for this filter.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Tenant</th>
                    <th className="px-6 py-4">User ID</th>
                    <th className="px-6 py-4">Entity</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        {log.tenantName ? (
                          <div className="flex items-center gap-1.5">
                            <Globe size={11} className="text-slate-400" />
                            <span className="text-xs text-slate-600 font-semibold">{log.tenantName}</span>
                          </div>
                        ) : log.tenantId ? (
                          <span className="font-mono text-xs text-slate-400">{log.tenantId.slice(-8)}</span>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">Platform</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-500">{log.userId}</td>
                      <td className="px-6 py-3.5 text-slate-600">{log.entity}</td>
                      <td className="px-6 py-3.5 font-mono text-xs text-slate-500">{log.ipAddress || "N/A"}</td>
                      <td className="px-6 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="px-6 py-4 border-t border-slate-100 flex justify-center">
                <button
                  onClick={() => fetchLogs(false)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  {loadingMore
                    ? <Loader2 size={13} className="animate-spin" />
                    : <ChevronDown size={13} />}
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}