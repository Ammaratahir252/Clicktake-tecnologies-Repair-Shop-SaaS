"use client";

/**
 * OWNER DASHBOARD — /dashboard/owner
 *
 * Per blueprint Section 5.1 Role 2:
 * - Full access to all data within their tenant ONLY
 * - View ALL tickets, ALL users, ALL financials
 * - Configure tenant settings
 * - View audit logs
 * - View and claim GPS leads
 */
import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import {
  Ticket, Users, Package, BarChart3, Settings,
  FileText, ClipboardList, ShieldCheck, AlertTriangle,
  Loader2, ChevronRight, MapPin, KeyRound, Copy, CheckCheck
} from "lucide-react";
import { ROLE_META } from "@/lib/rbac";

const MODULES = [
  { key: "tickets",   icon: Ticket,       title: "All Tickets",     desc: "View & manage all repair tickets",       href: "/dashboard/owner/tickets",   color: "bg-blue-600" },
  { key: "users",     icon: Users,        title: "Team & Users",    desc: "Manage staff accounts and roles",        href: "/dashboard/owner/users",     color: "bg-purple-600" },
  { key: "inventory", icon: Package,      title: "Inventory",       desc: "Parts catalog and stock levels",         href: "/dashboard/owner/inventory", color: "bg-emerald-600" },
  { key: "reports",   icon: BarChart3,    title: "Reports",         desc: "Revenue, profit, and analytics",         href: "/dashboard/owner/reports",   color: "bg-amber-500" },
  { key: "leads",     icon: MapPin,       title: "Leads",           desc: "GPS-routed customer leads",              href: "/dashboard/owner/leads",     color: "bg-rose-500" },
  { key: "audit",     icon: FileText,     title: "Audit Logs",      desc: "Full activity trail for your shop",      href: "/dashboard/owner/audit",     color: "bg-slate-700" },
  { key: "settings",  icon: Settings,     title: "Shop Settings",   desc: "Tenant config, billing, integrations",   href: "/dashboard/owner/settings",  color: "bg-indigo-600" },
];

export default function OwnerDashboard() {
  return (
    <DashboardShell requiredRole="owner">
      {(user) => <OwnerContent user={user} />}
    </DashboardShell>
  );
}

function OwnerContent({ user }: { user: any }) {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [teamError, setTeamError] = useState("");
  const [copied, setCopied] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);

  const handleCopyShopId = () => {
    if (!user?.tenantId) return;
    navigator.clipboard.writeText(user.tenantId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    api.get("/api/users")
      .then((res) => {
        const data = res.data?.data;
        setTeamMembers(Array.isArray(data) ? data : [data].filter(Boolean));
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
      {/* ── Shop ID Card ───────────────────────────────────────────────────── */}
      <section className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 border border-blue-500/30 p-3 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
            <KeyRound size={24} />
          </div>
          <div>
            <h2 className="font-black text-foreground text-lg">Your Shop ID</h2>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">Share this with your staff when they register — they need it to join your shop</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-1.5 pl-5 shadow-sm shrink-0 w-full sm:w-auto overflow-hidden">
          <code className="font-mono text-sm font-bold text-foreground tracking-wide truncate">{user.tenantId || "Loading..."}</code>
          <button 
            onClick={handleCopyShopId}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shrink-0 ${
              copied ? "bg-green-100 text-green-700" : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow active:scale-[0.98]"
            }`}
          >
            {copied ? (
              <>
                <CheckCheck size={14} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </button>
        </div>
      </section>

      {/* ── Module Cards ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Your Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MODULES.map(({ key, icon: Icon, title, desc, href, color }) => (
            <Link key={key} href={href}
              className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:border-border/80 transition-all group active:scale-[0.98] relative">
              <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md`}>
                <Icon className="text-white w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-card-foreground text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{desc}</p>
              </div>
              {/* Low stock badge on Inventory card */}
              {key === "inventory" && lowStockCount > 0 && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {lowStockCount} low
                </span>
              )}
              <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Live Team Table ────────────────────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={17} className="text-primary" />
            <h2 className="font-bold text-card-foreground">Team Members</h2>
          </div>
          <span className="text-xs text-muted-foreground bg-muted border border-border rounded-full px-3 py-1 font-semibold">
            Live · {teamMembers.length} member{teamMembers.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingTeam && (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="animate-spin w-5 h-5" />
            <span className="text-sm">Loading team...</span>
          </div>
        )}

        {teamError && (
          <div className="flex items-center gap-3 m-4 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <AlertTriangle size={16} className="text-destructive" />
            <p className="text-sm font-semibold text-destructive">{teamError}</p>
          </div>
        )}

        {!loadingTeam && !teamError && teamMembers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border">
                  {["Name", "Email", "Role"].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-muted-foreground uppercase tracking-widest px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m, i) => {
                  const meta = ROLE_META[m.role] ?? ROLE_META["technician"];
                  return (
                    <tr key={m.id ?? m._id ?? i} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3 font-semibold text-card-foreground text-sm">{m.name}</td>
                      <td className="px-6 py-3 text-muted-foreground text-sm">{m.email}</td>
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

        {!loadingTeam && !teamError && teamMembers.length === 0 && (
          <div className="text-center py-10">
            <ClipboardList className="mx-auto text-muted-foreground/30 w-8 h-8 mb-2" />
            <p className="text-sm text-muted-foreground">No team members yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
