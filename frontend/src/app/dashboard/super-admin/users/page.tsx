"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Search, Plus, User, Building2, Shield, ChevronRight, MoreVertical, Mail, Phone, Lock } from "lucide-react";

const ROLES = [
  { key: "super_admin", label: "Super Admin", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { key: "manager",     label: "Manager",     color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { key: "frontdesk",   label: "Front Desk",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "technician",  label: "Technician",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "driver",      label: "Driver",      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { key: "customer",    label: "Customer",    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
];

const MOCK_USERS = [
  { id: "U-001", name: "Muhammad Usman", email: "usman@platform.com", phone: "+92 300 0000001", role: "super_admin", tenant: null, status: "active", joinedAt: "2025-01-01" },
  { id: "U-002", name: "Ali Raza", email: "ali@techfix-lhe.com", phone: "+92 300 1111111", role: "technician", tenant: "TechFix Lahore", status: "active", joinedAt: "2025-01-16" },
  { id: "U-003", name: "Hassan B.", email: "hassan@mobilezone-khi.com", phone: "+92 321 2222222", role: "technician", tenant: "MobileZone Karachi", status: "active", joinedAt: "2025-03-21" },
  { id: "U-004", name: "Kamran S.", email: "kamran@irepair-isb.com", phone: "+92 333 3333333", role: "manager", tenant: "iRepair Islamabad", status: "active", joinedAt: "2025-02-12" },
  { id: "U-005", name: "Adnan K.", email: "adnan@gadgetcure-psh.com", phone: "+92 345 4444444", role: "frontdesk", tenant: "GadgetCure Peshawar", status: "active", joinedAt: "2026-05-02" },
  { id: "U-006", name: "Zain M.", email: "zain@smartfix-mtn.com", phone: "+92 311 5555555", role: "driver", tenant: "SmartFix Multan", status: "inactive", joinedAt: "2025-06-20" },
  { id: "U-007", name: "Ahmed Khan", email: "ahmed@customer.com", phone: "+92 300 1234567", role: "customer", tenant: "TechFix Lahore", status: "active", joinedAt: "2025-04-10" },
];

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find((x) => x.key === role) ?? ROLES[ROLES.length - 1];
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.color}`}>{r.label}</span>;
}

export default function SuperAdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<typeof MOCK_USERS[0] | null>(null);

  const filtered = MOCK_USERS.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <DashboardShell requiredRole="super_admin">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">All Users</h1>
              <p className="text-muted-foreground font-medium mt-0.5">{MOCK_USERS.length} users across all tenants</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm">
              <Plus size={16} />
              Add User
            </button>
          </div>

          {/* Role Stats */}
          <div className="flex gap-2 flex-wrap">
            {ROLES.map((r) => {
              const count = MOCK_USERS.filter((u) => u.role === r.key).length;
              if (count === 0) return null;
              return (
                <div key={r.key} className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
                  <span className="font-black text-foreground text-sm">{count}</span>
                </div>
              );
            })}
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
              {ROLES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRoleFilter(r.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${roleFilter === r.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User List */}
            <div className="lg:col-span-2 space-y-2">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className={`w-full text-left bg-card border rounded-xl p-4 hover:border-primary/50 transition-all ${
                    selected?.id === u.id ? "border-primary bg-primary/5" : "border-border"
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
                          {u.tenant && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building2 size={10} /> {u.tenant}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${u.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
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
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-muted-foreground" />
                      <span className="text-foreground font-medium">{selected.phone}</span>
                    </div>
                    {selected.tenant && (
                      <div className="flex items-center gap-2">
                        <Building2 size={13} className="text-muted-foreground" />
                        <span className="text-foreground font-medium">{selected.tenant}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        selected.status === "active"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}>{selected.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Joined</span>
                      <span className="font-medium text-foreground">{new Date(selected.joinedAt).toLocaleDateString("en-PK")}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button className="w-full py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all flex items-center justify-center gap-2">
                      <Shield size={14} />
                      Change Role
                    </button>
                    <button className="w-full py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all flex items-center justify-center gap-2">
                      <Lock size={14} />
                      Reset Password
                    </button>
                    <button className={`w-full py-2.5 font-bold rounded-xl text-sm transition-all ${
                      selected.status === "active"
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                    }`}>
                      {selected.status === "active" ? "Deactivate User" : "Activate User"}
                    </button>
                  </div>
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
      )}
    </DashboardShell>
  );
}
