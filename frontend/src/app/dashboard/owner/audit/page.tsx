"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2, ShieldAlert } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";

interface AuditLog {
  _id: string;
  action: string;
  userId: string;
  entity: string;
  ipAddress?: string;
  createdAt: string;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { router.replace("/login"); return; }
    let user: any;
    try { user = JSON.parse(raw); } catch { router.replace("/login"); return; }
    const role = (user?.role ?? '').toString().trim().toLowerCase();
    if (role !== "owner") { router.replace("/dashboard/owner"); return; }
    fetchLogs(filter);
  }, [filter]);

  const fetchLogs = async (currentFilter: string) => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/audit-logs?limit=50";
      if (currentFilter !== "All") url += `&action=${currentFilter}`;
      const res = await api.get(url);
      setLogs(res.data?.data?.logs || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load audit logs.");
      if (err.response?.status === 403) router.replace("/dashboard/owner");
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("LOGIN") || action.includes("LOGOUT")) return "bg-blue-100 text-blue-700";
    if (action.includes("REGISTER")) return "bg-emerald-100 text-emerald-700";
    if (action.includes("ERROR") || action.includes("FAILED")) return "bg-red-100 text-red-700";
    if (action.includes("PASSWORD")) return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  };

  const filters = ["All", "AUTH_LOGIN", "AUTH_REGISTER", "AUTH_LOGOUT", "AUTH_PASSWORD_RESET_REQUEST"];

  return (
    <DashboardShell requiredRole="owner">
      {() => (
        <div className="space-y-6">
          <h1 className="text-2xl font-black text-slate-900">Audit Logs</h1>

          <div className="flex flex-wrap gap-2">
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
                  }`}>
                {f}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="animate-spin w-8 h-8 mb-4" />
                <p>Loading audit trail...</p>
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 font-semibold">
                  <ShieldAlert className="w-5 h-5" />{error}
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-medium">No logs found for this filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">User ID</th>
                      <th className="px-6 py-4">Entity</th>
                      <th className="px-6 py-4">IP Address</th>
                      <th className="px-6 py-4">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-50">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{log.userId}</td>
                        <td className="px-6 py-4">{log.entity}</td>
                        <td className="px-6 py-4 font-mono text-xs">{log.ipAddress || "N/A"}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}