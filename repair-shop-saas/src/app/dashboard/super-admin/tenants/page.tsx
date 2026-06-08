"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Building2, Plus, Search, Globe, Users, Ticket, MoreVertical, ChevronRight, CheckCircle, AlertCircle, Clock } from "lucide-react";

const MOCK_TENANTS = [
  {
    id: "T-001",
    name: "TechFix Lahore",
    subdomain: "techfix-lhe",
    plan: "Pro",
    status: "active",
    users: 12,
    tickets: 178,
    joinedAt: "2025-01-15",
    email: "admin@techfix-lhe.com",
    phone: "+92 300 1111111",
  },
  {
    id: "T-002",
    name: "MobileZone Karachi",
    subdomain: "mobilezone-khi",
    plan: "Starter",
    status: "active",
    users: 5,
    tickets: 92,
    joinedAt: "2025-03-20",
    email: "admin@mobilezone-khi.com",
    phone: "+92 321 2222222",
  },
  {
    id: "T-003",
    name: "iRepair Islamabad",
    subdomain: "irepair-isb",
    plan: "Pro",
    status: "active",
    users: 9,
    tickets: 134,
    joinedAt: "2025-02-10",
    email: "admin@irepair-isb.com",
    phone: "+92 333 3333333",
  },
  {
    id: "T-004",
    name: "GadgetCure Peshawar",
    subdomain: "gadgetcure-psh",
    plan: "Starter",
    status: "trial",
    users: 3,
    tickets: 44,
    joinedAt: "2026-05-01",
    email: "admin@gadgetcure-psh.com",
    phone: "+92 345 4444444",
  },
  {
    id: "T-005",
    name: "SmartFix Multan",
    subdomain: "smartfix-mtn",
    plan: "Pro",
    status: "suspended",
    users: 7,
    tickets: 89,
    joinedAt: "2025-06-18",
    email: "admin@smartfix-mtn.com",
    phone: "+92 311 5555555",
  },
];

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  trial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  suspended: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  active: CheckCircle,
  trial: Clock,
  suspended: AlertCircle,
};

export default function SuperAdminTenantsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<typeof MOCK_TENANTS[0] | null>(null);

  const filtered = MOCK_TENANTS.filter((t) => {
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subdomain.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || t.status === filter || t.plan.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  return (
    <DashboardShell requiredRole="super_admin">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Tenants</h1>
              <p className="text-muted-foreground font-medium mt-0.5">{MOCK_TENANTS.length} shops on this platform</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm">
              <Plus size={16} />
              Add Tenant
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Active", value: MOCK_TENANTS.filter((t) => t.status === "active").length, color: "text-emerald-500" },
              { label: "Trial", value: MOCK_TENANTS.filter((t) => t.status === "trial").length, color: "text-amber-500" },
              { label: "Suspended", value: MOCK_TENANTS.filter((t) => t.status === "suspended").length, color: "text-red-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
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
                placeholder="Search by name or subdomain…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "active", "trial", "suspended", "pro", "starter"].map((f) => (
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
              {filtered.map((tenant) => {
                const StatusIcon = STATUS_ICONS[tenant.status] ?? CheckCircle;
                return (
                  <button
                    key={tenant.id}
                    onClick={() => setSelected(tenant)}
                    className={`w-full text-left bg-card border rounded-xl p-4 hover:border-primary/50 transition-all ${
                      selected?.id === tenant.id ? "border-primary bg-primary/5" : "border-border"
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
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tenant.plan === "Pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {tenant.plan}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{tenant.subdomain}.repairshop.app</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${STATUS_STYLES[tenant.status]}`}>
                          <StatusIcon size={10} />
                          {tenant.status}
                        </span>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users size={11} /> {tenant.users} users</span>
                      <span className="flex items-center gap-1"><Ticket size={11} /> {tenant.tickets} tickets</span>
                      <span className="flex items-center gap-1"><Globe size={11} /> Joined {new Date(tenant.joinedAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}</span>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="bg-card border border-border rounded-2xl p-10 text-center">
                  <Building2 size={28} className="text-muted-foreground mx-auto mb-2" />
                  <p className="font-bold text-foreground">No tenants found</p>
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
                      <p className="text-xs text-muted-foreground">{selected.id}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subdomain</span>
                      <span className="font-bold text-primary">{selected.subdomain}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-bold text-foreground">{selected.plan}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium text-foreground text-xs">{selected.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium text-foreground">{selected.phone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Joined</span>
                      <span className="font-medium text-foreground">{new Date(selected.joinedAt).toLocaleDateString("en-PK")}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-foreground">{selected.users}</p>
                      <p className="text-xs text-muted-foreground">Users</p>
                    </div>
                    <div className="bg-muted rounded-xl p-3 text-center">
                      <p className="text-xl font-black text-foreground">{selected.tickets}</p>
                      <p className="text-xs text-muted-foreground">Tickets</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selected.status === "suspended" && (
                      <button className="w-full py-2.5 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-all">
                        Reactivate Tenant
                      </button>
                    )}
                    {selected.status === "active" && (
                      <button className="w-full py-2.5 bg-red-100 text-red-600 font-bold rounded-xl text-sm hover:bg-red-200 transition-all">
                        Suspend Tenant
                      </button>
                    )}
                    <button className="w-full py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all">
                      Edit Plan
                    </button>
                    <a
                      href={`https://${selected.subdomain}.repairshop.app`}
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
      )}
    </DashboardShell>
  );
}
