"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  Search, Plus, User, Building2, Shield, Mail, Phone,
  Lock, Loader2, AlertTriangle, RefreshCw, XCircle, CheckCircle,
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  owner:       "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  manager:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  frontdesk:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  technician:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  driver:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  customer:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  owner:       "Owner",
  manager:     "Manager",
  frontdesk:   "Front Desk",
  technician:  "Technician",
  driver:      "Driver",
  customer:    "Customer",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_COLORS[role] ?? ROLE_COLORS.customer}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

interface UserRecord {
  _id:       string;
  name:      string;
  email:     string;
  phone?:    string;
  role:      string;
  isActive:  boolean;
  tenantId?: { _id: string; name: string; subdomain: string } | string;
  createdAt: string;
}

export default function SuperAdminUsersPage() {
  return (
    <DashboardShell requiredRole="super_admin">
      {() => <UsersContent />}
    </DashboardShell>
  );
}

function UsersContent() {
  const [users,    setUsers]    = useState<UserRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [search,   setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [acting,   setActing]   = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/users?limit=300");
      setUsers(res.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const patchUser = async (id: string, patch: Record<string, any>, msg: string) => {
    setActing(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch(`/api/admin/users/${id}`, patch);
      const updated = res.data?.data as UserRecord;
      setUsers((prev) => prev.map((u) => (u._id === id ? updated : u)));
      if (selected?._id === id) setSelected(updated);
      setSuccess(msg);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Action failed.");
    } finally {
      setActing(false);
    }
  };

  const roleCounts = Object.keys(ROLE_LABELS).reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {});

  const tenantName = (u: UserRecord) => {
    if (!u.tenantId) return null;
    if (typeof u.tenantId === "object") return u.tenantId.name;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">All Users</h1>
          <p className="text-muted-foreground font-medium mt-0.5">
            {loading ? "Loading…" : `${users.length} users across all tenants`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-all"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm">
            <Plus size={16} />
            Add User
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

      {/* Role Stats */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(roleCounts).filter(([, c]) => c > 0).map(([role, count]) => (
          <div key={role} className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <RoleBadge role={role} />
            <span className="font-black text-foreground text-sm">{count}</span>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setRoleFilter("all")}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${roleFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRoleFilter(key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${roleFilter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-2 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin w-6 h-6 mr-3" />
              <span className="font-medium">Loading users…</span>
            </div>
          )}
          {!loading && filtered.map((u) => (
            <button
              key={u._id}
              onClick={() => setSelected(u)}
              className={`w-full text-left bg-card border rounded-xl p-4 hover:border-primary/50 transition-all ${
                selected?._id === u._id ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                    <User size={15} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{u.name}</p>
                      <RoleBadge role={u.role} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      {tenantName(u) && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 size={10} /> {tenantName(u)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
              </div>
            </button>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <User size={28} className="text-muted-foreground mx-auto mb-2" />
              <p className="font-bold text-foreground">No users found</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div>
          {selected ? (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 sticky top-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <User size={22} className="text-primary" />
                </div>
                <div>
                  <p className="font-black text-foreground">{selected.name}</p>
                  <RoleBadge role={selected.role} />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">{selected.email}</span>
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-muted-foreground" />
                    <span className="text-foreground font-medium">{selected.phone}</span>
                  </div>
                )}
                {tenantName(selected) && (
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-muted-foreground" />
                    <span className="text-foreground font-medium">{tenantName(selected)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    selected.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  }`}>
                    {selected.isActive ? "active" : "inactive"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="font-medium text-foreground text-xs">
                    {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("en-PK") : "—"}
                  </span>
                </div>
              </div>

              {/* Role picker */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Change Role</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["owner", "manager", "frontdesk", "technician", "driver", "customer"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => patchUser(selected._id, { role: r }, `Role changed to ${ROLE_LABELS[r]}.`)}
                      disabled={acting || selected.role === r}
                      className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all disabled:opacity-40 ${
                        selected.role === r
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => patchUser(selected._id, { isActive: !selected.isActive }, selected.isActive ? "User deactivated." : "User activated.")}
                disabled={acting}
                className={`w-full py-2.5 font-bold rounded-xl text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
                  selected.isActive
                    ? "bg-red-100 text-red-600 hover:bg-red-200"
                    : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                }`}
              >
                {acting && <Loader2 size={13} className="animate-spin" />}
                {selected.isActive ? "Deactivate User" : "Activate User"}
              </button>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <User size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">Select a user to manage</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
