"use client";

/**
 * MANAGER DASHBOARD — /dashboard/manager
 *
 * Per blueprint Section 5.1 Role 3:
 * - View and manage ALL tickets in their shop
 * - Assign and reassign tickets to technicians
 * - Approve estimates before sending to customers
 * - View and manage inventory
 * - Access financial reports (daily revenue, invoice status)
 * - Manage customer profiles
 * - Claim and manage GPS leads
 * - CANNOT: access tenant billing, create user accounts, delete system data
 */
import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Ticket, Users, Package, BarChart3, MapPin,
  ClipboardList, ShieldCheck, AlertTriangle, Loader2, ChevronRight
} from "lucide-react";
import { ROLE_META } from "@/lib/rbac";

const MODULES = [
  { key: "tickets",   icon: Ticket,    title: "All Tickets",   desc: "Manage and assign repair tickets",  href: "/dashboard/manager/tickets",   color: "bg-blue-600" },
  { key: "inventory", icon: Package,   title: "Inventory",     desc: "Stock levels and parts catalog",    href: "/dashboard/manager/inventory", color: "bg-emerald-600" },
  { key: "reports",   icon: BarChart3, title: "Reports",       desc: "Daily revenue and invoice status",  href: "/dashboard/manager/reports",   color: "bg-amber-500" },
  { key: "leads",     icon: MapPin,    title: "Leads",         desc: "Claim and manage customer leads",   href: "/dashboard/manager/leads",     color: "bg-rose-500" },
  { key: "team",      icon: Users,     title: "Team View",     desc: "View staff (read-only)",            href: "/dashboard/manager/team",      color: "bg-purple-600" },
];

export default function ManagerDashboard() {
  return (
    <DashboardShell requiredRole="manager">
      {(user) => <ManagerContent user={user} />}
    </DashboardShell>
  );
}

function ManagerContent({ user }: { user: any }) {
  const [team, setTeam] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamError, setTeamError] = useState("");
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    api.get("/api/users")
      .then((res) => {
        const data = res.data?.data;
        setTeam(Array.isArray(data) ? data : [data].filter(Boolean));
      })
      .catch((err) => setTeamError(err.response?.data?.message || "Failed to load team."))
      .finally(() => setLoadingTeam(false));

    // Fetch low stock count for inventory badge
    api.get("/api/parts?lowStock=true&limit=1")
      .then((res) => setLowStockCount(res.data?.data?.lowStockCount ?? 0))
      .catch(() => { /* non-critical */ });
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Modules ───────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Your Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(({ key, icon: Icon, title, desc, href, color }) => (
            <a key={key} href={href}
              className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all group active:scale-[0.98] relative">
              <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md`}>
                <Icon className="text-white w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              {/* Low stock badge on Inventory card */}
              {key === "inventory" && lowStockCount > 0 && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {lowStockCount} low
                </span>
              )}
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      </section>

      {/* ── Restricted notice ─────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Manager Access Limits</p>
          <p className="text-xs text-amber-700 mt-1">
            You cannot access billing settings, create user accounts, or delete system data. Contact your shop owner for these actions.
          </p>
        </div>
      </div>

      {/* ── Team Table ────────────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={17} className="text-purple-600" />
            <h2 className="font-bold text-slate-800">Team Members</h2>
          </div>
          <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 font-semibold">Read-only</span>
        </div>

        {loadingTeam && (
          <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
            <Loader2 className="animate-spin w-5 h-5" /><span className="text-sm">Loading...</span>
          </div>
        )}

        {teamError && (
          <div className="flex items-center gap-3 m-4 bg-red-50 border border-red-100 rounded-xl p-4">
            <AlertTriangle size={16} className="text-red-400" />
            <p className="text-sm font-semibold text-red-600">{teamError}</p>
          </div>
        )}

        {!loadingTeam && !teamError && team.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Name", "Email", "Role"].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {team.map((m, i) => {
                  const meta = ROLE_META[m.role] ?? ROLE_META["technician"];
                  return (
                    <tr key={m.id ?? m._id ?? i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-slate-800 text-sm">{m.name}</td>
                      <td className="px-6 py-3 text-slate-500 text-sm">{m.email}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${meta.bgColor} ${meta.color}`}>
                          <ShieldCheck size={10} />{meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
