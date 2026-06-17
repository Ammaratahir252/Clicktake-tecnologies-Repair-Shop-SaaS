"use client";

import DashboardShell from "@/components/DashboardShell";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  Wrench, Brain, Clock, Camera, ChevronRight, ShieldCheck,
  Info, Zap, TrendingUp, AlertCircle, CheckCircle, Lightbulb, Loader2,
} from "lucide-react";

const MODULES = [
  { key: "my-tickets", icon: Wrench,  title: "My Tickets",   desc: "View only your assigned repairs",   href: "/dashboard/technician/tickets", color: "from-amber-500 to-amber-600"   },
  { key: "ai",         icon: Brain,   title: "AI Diagnostic", desc: "GPT-4o-mini repair assistant",      href: "/dashboard/technician/ai",      color: "from-purple-500 to-purple-600", badge: "Hot" },
  { key: "time",       icon: Clock,   title: "Time Tracking", desc: "Clock in/out per repair ticket",   href: "/dashboard/technician/time",    color: "from-blue-500 to-blue-600"    },
  { key: "photos",     icon: Camera,  title: "Upload Photos", desc: "Before/after damage photos",       href: "/dashboard/technician/photos",  color: "from-emerald-500 to-emerald-600", badge: "New" },
];

const STATUS_FLOW = [
  { label: "Received",  color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"      },
  { label: "Diagnosed", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"       },
  { label: "In Repair", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"   },
  { label: "Ready",     color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" },
  { label: "Delivered", color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" },
];

export default function TechnicianDashboard() {
  return (
    <DashboardShell requiredRole="technician">
      {(user) => <TechContent />}
    </DashboardShell>
  );
}

function TechContent() {
  const [stats, setStats]   = useState({ active: 0, completed: 0, pendingReview: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/api/tickets");
      const tickets: any[] = res.data?.data ?? [];
      const active       = tickets.filter((t) => !["delivered", "cancelled"].includes(t.status)).length;
      const completed    = tickets.filter((t) => t.status === "delivered").length;
      const pendingReview = tickets.filter((t) => t.status === "ready").length;
      setStats({ active, completed, pendingReview });
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const STATS = [
    { label: "Active Tickets",  value: loading ? "…" : String(stats.active),       icon: Wrench,       color: "text-amber-600 dark:text-amber-400"   },
    { label: "Completed",       value: loading ? "…" : String(stats.completed),     icon: CheckCircle,  color: "text-emerald-600 dark:text-emerald-400"},
    { label: "Ready to Deliver",value: loading ? "…" : String(stats.pendingReview), icon: AlertCircle,  color: "text-red-600 dark:text-red-400"        },
    { label: "My Tickets Badge",value: loading ? "…" : String(stats.active),        icon: Wrench,       color: "text-primary"                         },
  ].slice(0, 3);

  const myTicketsBadge = loading ? "…" : String(stats.active);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-black text-foreground flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Wrench size={24} className="text-primary" />
          </div>
          Technician Dashboard
        </h1>
        <p className="text-muted-foreground font-medium">
          Manage your repair tickets, track time, and upload diagnostics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {STATS.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg hover:border-primary/50 transition-all duration-300">
              <div className="flex items-start justify-between mb-2">
                <Icon size={18} className={stat.color} />
                {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
              </div>
              <p className="text-2xl md:text-3xl font-black text-foreground">{stat.value}</p>
              <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Modules Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-primary" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Your Tools</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map(({ key, icon: Icon, title, desc, href, color, badge }) => {
            const displayBadge = key === "my-tickets" ? myTicketsBadge : badge;
            return (
              <Link
                key={key}
                href={href}
                className="group bg-card border border-border rounded-2xl p-6 hover:shadow-xl hover:border-primary/50 transition-all duration-300 active:scale-95 overflow-hidden relative"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${color} transition-opacity duration-300`} />
                <div className="relative flex items-start gap-4">
                  <div className={`bg-gradient-to-br ${color} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="text-white w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{title}</h3>
                      {displayBadge && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
                          displayBadge === "Hot"  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                          displayBadge === "New"  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" :
                          "bg-primary/10 text-primary"
                        }`}>{displayBadge}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground/50 group-hover:text-primary flex-shrink-0 transition-colors duration-300 group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Status Flow */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Ticket Status Flow</h2>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {STATUS_FLOW.map((status, i) => (
              <div key={i} className="flex items-center gap-2 md:gap-3">
                <div className={`${status.color} px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap`}>{status.label}</div>
                {i < STATUS_FLOW.length - 1 && <ChevronRight size={16} className="text-muted-foreground/50 hidden md:block" />}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground flex items-start gap-2 bg-muted/50 rounded-lg p-3 border border-border/50 mt-4">
            <Info size={16} className="text-primary mt-0.5 flex-shrink-0" />
            <span>Never skip steps. Invalid status jumps are blocked by the system.</span>
          </p>
        </div>
      </section>

      {/* Restrictions */}
      <section>
        <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/50 rounded-2xl px-6 py-5 flex items-start gap-4">
          <ShieldCheck size={20} className="text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-800 dark:text-amber-400 text-sm mb-1">Role Restrictions</p>
            <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-500">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />You can only see tickets assigned to you</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />Cannot process payments or view other technicians' tickets</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />Cannot manage inventory stock levels directly</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 border border-blue-200 dark:border-blue-700/30 rounded-2xl px-6 py-5">
        <div className="flex items-start gap-3">
          <Lightbulb size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-blue-800 dark:text-blue-400 text-sm mb-2">Pro Tips</p>
            <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-500">
              <li>• Use the AI Diagnostic Assistant to help diagnose complex issues</li>
              <li>• Always log time for accurate billing and performance tracking</li>
              <li>• Upload clear before/after photos for quality assurance reviews</li>
              <li>• Add detailed notes so frontdesk can communicate with customers</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
