"use client";

/**
 * MANAGER — /dashboard/manager/team
 *
 * Read-only team view for managers within their tenant.
 * Managers can see all staff members, their roles, and workload.
 * They CANNOT create, edit, or delete users — that is owner-only.
 *
 * Features:
 * - Staff list with roles, email, and status
 * - Filter by role
 * - Search by name or email
 * - Open ticket count per technician (workload indicator)
 */

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { ROLE_META } from "@/lib/rbac";
import {
  Users, Search, Loader2, AlertTriangle,
  ShieldCheck, RefreshCw, Wrench, UserCircle2,
  Mail, Lock, ChevronDown,
} from "lucide-react";

interface TeamMember {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  openTickets?: number;
  phone?: string;
}

const ROLE_FILTERS = ["All", "manager", "frontdesk", "technician", "driver"];

export default function ManagerTeamPage() {
  return (
    <DashboardShell requiredRole="manager">
      {(user) => <TeamContent manager={user} />}
    </DashboardShell>
  );
}

function TeamContent({ manager }: { manager: any }) {
  const [team, setTeam]         = useState<TeamMember[]>([]);
  const [filtered, setFiltered] = useState<TeamMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  useEffect(() => { fetchTeam(); }, []);

  useEffect(() => {
    let result = [...team];
    if (roleFilter !== "All") {
      result = result.filter((m) => m.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [team, search, roleFilter]);

  const fetchTeam = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/users");
      const data = res.data?.data;
      setTeam(Array.isArray(data) ? data : [data].filter(Boolean));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load team.");
    } finally {
      setLoading(false);
    }
  };

  // Role counts for summary strip
  const counts = ROLE_FILTERS.slice(1).reduce((acc, r) => {
    acc[r] = team.filter((m) => m.role === r).length;
    return acc;
  }, {} as Record<string, number>);

  const userId = (m: TeamMember) => m.id ?? m._id ?? "";

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <Users className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Team</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              View-only · Contact your shop owner to make changes.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground bg-muted border border-border rounded-full px-3 py-1">
            Read-only
          </span>
          <button
            onClick={fetchTeam}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted text-xs font-bold uppercase tracking-wider transition-all"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Role Summary Strip ─────────────────────────────────────── */}
      {!loading && team.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { role: "manager",    label: "Managers",    color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-100" },
            { role: "frontdesk",  label: "Front Desk",  color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-100" },
            { role: "technician", label: "Technicians", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
            { role: "driver",     label: "Drivers",     color: "text-purple-700",  bg: "bg-purple-50",  border: "border-purple-100" },
          ].map(({ role, label, color, bg, border }) => (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? "All" : role)}
              className={`${bg} border ${border} rounded-2xl p-4 text-center transition-all shadow-sm hover:shadow-md ${
                roleFilter === role ? "ring-2 ring-offset-1 ring-current opacity-100" : ""
              }`}
            >
              <p className={`text-2xl font-black ${color}`}>{counts[role] ?? 0}</p>
              <p className={`text-[11px] font-bold mt-0.5 ${color} opacity-80`}>{label}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      )}

      {/* ── Search & Role Filter ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 transition-all"
          />
        </div>
        <div className="relative">
          <ShieldCheck size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pl-10 pr-8 py-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-purple-200 appearance-none cursor-pointer"
          >
            {ROLE_FILTERS.map((r) => (
              <option key={r} value={r}>{r === "All" ? "All Roles" : r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* ── Team Grid / Table ──────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Users size={15} className="text-muted-foreground" />
          <span className="font-bold text-foreground text-sm">
            {loading
              ? "Loading…"
              : `${filtered.length} member${filtered.length !== 1 ? "s" : ""}${roleFilter !== "All" ? ` · ${roleFilter}` : ""}`}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin w-8 h-8 mb-4" />
            <p className="text-sm font-medium">Loading team…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="mx-auto text-muted-foreground/20 w-10 h-10 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              {search || roleFilter !== "All" ? "No members match your search." : "No team members found."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <th className="px-6 py-4">Member</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((member) => {
                    const meta = ROLE_META[member.role] ?? ROLE_META["technician"];
                    return (
                      <tr key={userId(member)} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                              <UserCircle2 size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-foreground text-sm">{member.name}</p>
                              {member.phone && (
                                <p className="text-xs text-muted-foreground mt-0.5">{member.phone}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${meta.bgColor} ${meta.color}`}>
                            <ShieldCheck size={10} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{member.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            member.isActive !== false
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {member.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-border">
              {filtered.map((member) => {
                const meta = ROLE_META[member.role] ?? ROLE_META["technician"];
                return (
                  <div key={userId(member)} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <UserCircle2 size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${meta.bgColor} ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Read-only Notice ───────────────────────────────────────── */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-5 py-4 flex items-start gap-3">
        <Lock size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800 dark:text-amber-400">View Only</p>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5 leading-relaxed">
            As a manager you can view your team but cannot add, edit, or remove staff accounts.
            Contact your shop owner to make changes.
          </p>
        </div>
      </div>

    </div>
  );
}