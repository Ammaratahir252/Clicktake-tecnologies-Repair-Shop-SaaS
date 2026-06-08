"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { getRoleHome, ROLE_META, can } from "@/lib/rbac";
import api from "@/lib/api";
import {
  Wrench, LogOut, Loader2, ChevronDown, ChevronRight,
  LayoutDashboard, Ticket, Users, Package, BarChart3,
  Settings, FileText, MapPin, Truck, Bot, Clock,
  Camera, ShieldCheck, Globe, Menu, X, Bell, Moon, Sun,
  Home, Search, User, Store, AlertTriangle
} from "lucide-react";

export interface DashboardUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  children?: NavItem[];
}

interface DashboardShellProps {
  requiredRole: string | string[];
  children: (user: DashboardUser) => React.ReactNode;
}

// ── Nav config per role ───────────────────────────────────────────────────────
function getNavItems(role: string): NavItem[] {
  const base = "/dashboard";

  const maps: Record<string, NavItem[]> = {
    super_admin: [
      { label: "Overview",   href: `${base}/super-admin`,           icon: LayoutDashboard },
      { label: "Tenants",    href: `${base}/super-admin/tenants`,   icon: Store },
      { label: "All Tickets",href: `${base}/super-admin/tickets`,   icon: Ticket },
      { label: "All Users",  href: `${base}/super-admin/users`,     icon: Users },
      { label: "Leads",      href: `${base}/super-admin/leads`,     icon: MapPin, badge: "Live" },
      { label: "Analytics",  href: `${base}/super-admin/analytics`, icon: BarChart3 },
      { label: "Audit Logs", href: `${base}/super-admin/audit`,     icon: FileText },
      { label: "Impersonate",href: `${base}/super-admin/impersonate`,icon: ShieldCheck },
      { label: "Settings",   href: `${base}/super-admin/settings`,  icon: Settings },
    ],
    owner: [
      { label: "Overview",   href: `${base}/owner`,                 icon: LayoutDashboard },
      { label: "Tickets",    href: `${base}/owner/tickets`,         icon: Ticket },
      { label: "Team",       href: `${base}/owner/users`,           icon: Users },
      { label: "Inventory",  href: `${base}/owner/inventory`,       icon: Package },
      { label: "Leads",      href: `${base}/owner/leads`,           icon: MapPin, badge: "Live" },
      { label: "Reports",    href: `${base}/owner/reports`,         icon: BarChart3 },
      { label: "Audit Logs", href: `${base}/owner/audit`,           icon: FileText },
      { label: "Settings",   href: `${base}/owner/settings`,        icon: Settings },
    ],
    manager: [
      { label: "Overview",   href: `${base}/manager`,               icon: LayoutDashboard },
      { label: "Tickets",    href: `${base}/manager/tickets`,       icon: Ticket },
      { label: "Team",       href: `${base}/manager/team`,          icon: Users },
      { label: "Inventory",  href: `${base}/manager/inventory`,     icon: Package },
      { label: "Leads",      href: `${base}/manager/leads`,         icon: MapPin, badge: "Live" },
      { label: "Reports",    href: `${base}/manager/reports`,       icon: BarChart3 },
    ],
    frontdesk: [
      { label: "Overview",   href: `${base}/frontdesk`,             icon: LayoutDashboard },
      { label: "Tickets",    href: `${base}/frontdesk/tickets`,     icon: Ticket },
      { label: "Customers",  href: `${base}/frontdesk/customers`,   icon: Users },
      { label: "Inventory",  href: `${base}/frontdesk/inventory`,   icon: Package },
      { label: "Payments",   href: `${base}/frontdesk/payments`,    icon: BarChart3 },
      { label: "Delivery",   href: `${base}/frontdesk/delivery`,    icon: Truck },
      { label: "Print",      href: `${base}/frontdesk/print`,       icon: FileText },
    ],
    technician: [
      { label: "Overview",   href: `${base}/technician`,            icon: LayoutDashboard },
      { label: "My Tickets", href: `${base}/technician/tickets`,    icon: Ticket },
      { label: "AI Diagnostic",href:`${base}/technician/ai`,        icon: Bot, badge: "AI" },
      { label: "Inventory",  href: `${base}/technician/inventory`,  icon: Package },
      { label: "Time Logs",  href: `${base}/technician/time`,       icon: Clock },
      { label: "Photos",     href: `${base}/technician/photos`,     icon: Camera },
    ],
    customer: [
      { label: "My Portal",  href: `${base}/customer`,              icon: Home },
      { label: "Track Repair",href:`${base}/customer/track`,        icon: Wrench },
      { label: "Estimates",  href: `${base}/customer/estimates`,    icon: FileText },
      { label: "Invoices",   href: `${base}/customer/invoices`,     icon: BarChart3 },
      { label: "Delivery",   href: `${base}/customer/delivery`,     icon: Truck },
      { label: "History",    href: `${base}/customer/history`,      icon: Clock },
      { label: "Review",     href: `${base}/customer/review`,       icon: ShieldCheck },
    ],
    driver: [
      { label: "Overview",   href: `${base}/driver`,                icon: LayoutDashboard },
      { label: "My Jobs",    href: `${base}/driver/jobs`,           icon: Truck },
      { label: "Navigate",   href: `${base}/driver/navigate`,       icon: MapPin },
      { label: "Payment",    href: `${base}/driver/payment`,        icon: BarChart3 },
      { label: "Proof",      href: `${base}/driver/proof`,          icon: Camera },
    ],
  };

  return maps[role] ?? [];
}

// ── Role accent colors (CSS vars) ─────────────────────────────────────────────
const ROLE_ACCENT: Record<string, string> = {
  super_admin: "#ef4444",
  owner:       "#3b82f6",
  manager:     "#8b5cf6",
  frontdesk:   "#10b981",
  technician:  "#f59e0b",
  customer:    "#64748b",
  driver:      "#f97316",
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DashboardShell({ requiredRole, children }: DashboardShellProps) {
  const router   = useRouter();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [user, setUser]             = useState<DashboardUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [mounted, setMounted]       = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auth guard
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) { router.replace("/login"); return; }
    try {
      const parsed: DashboardUser = JSON.parse(raw);
      const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const role = (parsed.role ?? "").trim().toLowerCase();
      if (!allowed.map(r => r.toLowerCase()).includes(role)) {
        router.replace(getRoleHome(role));
        return;
      }
      setUser({ ...parsed, role });
    } catch {
      router.replace("/login");
    }
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  // Close notif on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await api.post("/api/auth/logout"); } catch {}
    localStorage.clear();
    sessionStorage.clear();
    document.cookie = "token=; Max-Age=0; path=/;";
    window.location.replace("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center">
            <Wrench className="text-white w-5 h-5" />
          </div>
          <Loader2 className="animate-spin text-slate-400 w-6 h-6" />
        </div>
      </div>
    );
  }

  const meta    = ROLE_META[user.role] ?? ROLE_META["technician"];
  const navItems = getNavItems(user.role);
  const accent  = ROLE_ACCENT[user.role] ?? "#3b82f6";

  // Prevent flash during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center">
            <Wrench className="text-primary-foreground w-5 h-5" />
          </div>
          <Loader2 className="animate-spin text-muted-foreground w-6 h-6" />
        </div>
      </div>
    );
  }

  // Use resolved theme for consistent styling
  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen flex bg-background font-['DM_Sans',system-ui,sans-serif] transition-colors duration-200"
         style={{ "--accent": accent } as React.CSSProperties}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {/* Mobile overlay */}
      {mobileSidebar && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden"
             onClick={() => setMobileSidebar(false)} />
      )}

      <aside className={`
        bg-sidebar text-sidebar-foreground
        fixed top-0 left-0 h-full z-50
        flex flex-col transition-all duration-300 ease-in-out shadow-2xl
        ${sidebarOpen ? "w-64" : "w-16"}
        ${mobileSidebar ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}>

        {/* Sidebar Header */}
        <div className={`flex items-center gap-3 px-4 h-16 border-b border-sidebar-border flex-shrink-0
          ${sidebarOpen ? "justify-between" : "justify-center"}`}>
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: accent }}>
                <Wrench className="text-white w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-black text-sm tracking-tight leading-none">Dibnow</p>
                <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest">RepairSaaS</p>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(s => !s)}
                  className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-lg p-1.5 transition-colors flex-shrink-0">
            <Menu size={18} />
          </button>
        </div>

        {/* Role badge */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-sidebar-border flex-shrink-0">
            <div className="flex items-center gap-2 bg-sidebar-accent rounded-xl px-3 py-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
              <span className="text-white/80 text-xs font-bold uppercase tracking-wider">{meta.label}</span>
            </div>
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sidebar-foreground/10">
          {sidebarOpen && (
            <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30">
              Navigation
            </p>
          )}
          <ul className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative
                          ${isActive
                            ? "text-sidebar-foreground bg-sidebar-accent shadow-lg border-l-3"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }`}
                        style={isActive ? { borderLeftColor: accent, borderLeftWidth: "3px" } : {}}>
                    <Icon size={18} className="flex-shrink-0" />
                    {sidebarOpen && (
                      <>
                        <span className="text-sm font-semibold flex-1">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white"
                                style={{ backgroundColor: accent }}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {/* Tooltip on collapse */}
                    {!sidebarOpen && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-lg border
                                      whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                        {item.label}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sidebar Footer - Enhanced Logout Button */}
        <div className="border-t border-sidebar-border p-3 flex-shrink-0 space-y-2">
          {sidebarOpen ? (
            <>
              {/* User Info */}
              <div className="flex items-center gap-3 px-2 py-1.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-lg"
                     style={{ backgroundColor: accent }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold truncate">{user.name}</p>
                  <p className="text-white/40 text-[11px] truncate">{user.email}</p>
                </div>
              </div>
              
              {/* Logout Button - Full Width */}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                          bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300
                          border border-red-500/20 hover:border-red-500/30
                          transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                          shadow-sm hover:shadow-md"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Logging out...</span>
                  </>
                ) : (
                  <>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </>
                )}
              </button>
            </>
          ) : (
            /* Collapsed Sidebar - Icon Only Logout */
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex justify-center items-center p-2.5 rounded-xl
                        bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300
                        border border-red-500/20 hover:border-red-500/30
                        transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                        shadow-sm hover:shadow-md group relative"
            >
              {isLoggingOut ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LogOut size={18} />
              )}
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-lg border
                              whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                Logout
              </div>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300
        ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}>

        {/* ── Topbar ──────────────────────────────────────────────────────── */}
        <header className="bg-card border-b border-border sticky top-0 z-30 h-16 flex items-center justify-between px-4 gap-4 flex-shrink-0">
          {/* Mobile menu toggle */}
          <button className="lg:hidden text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileSidebar(true)}>
            <Menu size={20} />
          </button>

          {/* Search bar */}
          <div className="hidden md:flex items-center gap-2 bg-muted rounded-xl px-3 py-2 flex-1 max-w-sm">
            <Search size={16} className="text-muted-foreground" />
            <input type="text" placeholder="Search tickets, customers..."
                   className="bg-transparent text-sm outline-none flex-1 text-foreground placeholder:text-muted-foreground" />
            <kbd className="text-[10px] font-bold bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded">⌘K</kbd>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Theme toggle */}
            <button onClick={toggleTheme}
                    className="p-2 rounded-xl transition-all hover:bg-accent text-muted-foreground hover:text-accent-foreground">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(n => !n)}
                      className="p-2 rounded-xl relative transition-all hover:bg-accent text-muted-foreground hover:text-accent-foreground">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <p className="font-bold text-sm text-popover-foreground">Notifications</p>
                    <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-md"
                          style={{ backgroundColor: accent }}>3 New</span>
                  </div>
                  {[
                    { t: "New lead routed to your shop", s: "2 min ago", dot: "#ef4444" },
                    { t: "REP-2026-00451 ready for QC",  s: "15 min ago", dot: "#f59e0b" },
                    { t: "Low stock: iPhone 15 Screen",  s: "1 hr ago",  dot: "#8b5cf6" },
                  ].map((n, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-accent">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: n.dot }} />
                      <div>
                        <p className="text-sm font-medium text-popover-foreground">{n.t}</p>
                        <p className="text-xs text-muted-foreground">{n.s}</p>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-2.5 border-t border-border text-center">
                    <button className="text-xs font-bold" style={{ color: accent }}>View all notifications</button>
                  </div>
                </div>
              )}
            </div>

            {/* User avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-border">
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-sm font-bold text-foreground">{user.name.split(" ")[0]}</p>
                <p className="text-[11px] text-muted-foreground">{meta.label}</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm cursor-pointer"
                   style={{ backgroundColor: accent }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* ── Breadcrumb bar ──────────────────────────────────────────────── */}
        <div className="px-6 py-3 bg-card/60 border-b border-border flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Home size={12} />
          {pathname.split("/").length > 3 && (
            <>
              <ChevronRight size={12} />
              <span className="text-foreground">
                {pathname.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </>
          )}
        </div>

        {/* ── Page Content ────────────────────────────────────────────────── */}
        <main className="flex-1 p-6 overflow-auto">
          {children(user)}
        </main>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="border-t border-border px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>DibnowRepairSaaS © 2026 · v2.0</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </span>
        </footer>
      </div>

      {/* ── Google Font import ───────────────────────────────────────────── */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 999px; }

        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}