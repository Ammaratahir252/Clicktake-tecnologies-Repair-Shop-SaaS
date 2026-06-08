"use client";

/**
 * TECHNICIAN DASHBOARD — /dashboard/technician
 *
 * Per blueprint Section 5.1 Role 5:
 * - View ONLY tickets assigned to them
 * - Update repair status: In Progress, Diagnosis Complete, Repaired, QC Check
 * - Add internal notes and diagnostic findings
 * - Use AI Diagnostic Assistant
 * - Request parts from inventory (triggers stock reservation)
 * - Log time and upload before/after photos
 * - Mark parts as used (auto-deducts from inventory)
 * - CANNOT: process payments, see other technicians' tickets, manage inventory
 */
import DashboardShell from "@/components/DashboardShell";
import { Wrench, Brain, Clock, Camera, ChevronRight, ShieldCheck, Info } from "lucide-react";

const MODULES = [
  { key: "my-tickets", icon: Wrench,  title: "My Tickets",       desc: "View only your assigned repairs",          href: "/dashboard/technician/tickets",   color: "bg-amber-500" },
  { key: "ai",         icon: Brain,   title: "AI Diagnostic",    desc: "GPT-4o-mini repair assistant",             href: "/dashboard/technician/ai",        color: "bg-purple-600" },
  { key: "time",       icon: Clock,   title: "Time Tracking",    desc: "Clock in/out per repair ticket",           href: "/dashboard/technician/time",      color: "bg-blue-600" },
  { key: "photos",     icon: Camera,  title: "Upload Photos",    desc: "Before/after damage photos",               href: "/dashboard/technician/photos",    color: "bg-emerald-600" },
];

export default function TechnicianDashboard() {
  return (
    <DashboardShell requiredRole="technician">
      {(user) => (
        <div className="space-y-6">
          {/* Modules */}
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Your Tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MODULES.map(({ key, icon: Icon, title, desc, href, color }) => (
                <a key={key} href={href}
                  className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:border-slate-200 transition-all group active:scale-[0.98]">
                  <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md`}>
                    <Icon className="text-white w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          </section>

          {/* Restrictions */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Technician Access</p>
              <p className="text-xs text-amber-700 mt-1">
                You can only see tickets assigned to you. You cannot process payments, view other technicians' tickets, or manage inventory stock levels.
              </p>
            </div>
          </div>

          {/* Quick status guide */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info size={16} className="text-blue-500" />
              <h3 className="font-bold text-slate-800 text-sm">Ticket Status Flow</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {["received", "diagnosed", "in_repair", "ready", "delivered"].map((status, i, arr) => (
                <div key={status} className="flex items-center gap-2">
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-full capitalize">
                    {status.replace("_", " ")}
                  </span>
                  {i < arr.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Never skip steps. Invalid status jumps are blocked by the system.</p>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
