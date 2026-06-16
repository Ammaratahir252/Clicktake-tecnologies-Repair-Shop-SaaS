"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import {
  Truck,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  ChevronRight,
  Package,
  Navigation,
  ArrowRight,
  User,
  AlertCircle,
  Zap,
  TrendingUp,
  Calendar,
  Flame,
} from "lucide-react";

const JOB_STATUSES = [
  {
    key: "assigned",
    label: "Assigned",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    gradient: "from-slate-500 to-slate-600",
  },
  {
    key: "en_route",
    label: "En Route",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    key: "arrived",
    label: "Arrived",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    gradient: "from-amber-500 to-amber-600",
  },
  {
    key: "picked_up",
    label: "Picked Up",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    key: "delivered",
    label: "Delivered",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    gradient: "from-emerald-500 to-emerald-600",
  },
];

const NEXT_STATUS: Record<string, string> = {
  assigned: "en_route",
  en_route: "arrived",
  arrived: "picked_up",
  picked_up: "delivered",
};

const MOCK_JOBS = [
  {
    id: "J-001",
    ticketNumber: "REP-2026-00451",
    customerName: "Ahmed Khan",
    customerPhone: "+92 300 1234567",
    address: "House 12, Block B, DHA Phase 5, Lahore",
    deviceType: "iPhone 15 Pro Max",
    jobType: "pickup",
    status: "assigned",
    scheduledTime: "10:00 AM",
    notes: "Customer wants morning pickup",
    priority: "high",
  },
  {
    id: "J-002",
    ticketNumber: "REP-2026-00448",
    customerName: "Sara Malik",
    customerPhone: "+92 321 9876543",
    address: "Flat 3A, Gulberg III, Lahore",
    deviceType: "Samsung Galaxy S24",
    jobType: "delivery",
    status: "en_route",
    scheduledTime: "12:30 PM",
    notes: "Repaired screen — handle with care",
    priority: "normal",
  },
  {
    id: "J-003",
    ticketNumber: "REP-2026-00439",
    customerName: "Usman Raza",
    customerPhone: "+92 333 5556677",
    address: "Plot 7, Model Town Extension, Lahore",
    deviceType: 'MacBook Pro 14"',
    jobType: "delivery",
    status: "delivered",
    scheduledTime: "2:00 PM",
    notes: "",
    priority: "normal",
  },
];

function StatusBadge({ status, gradient }: { status: string; gradient?: string }) {
  const s = JOB_STATUSES.find((x) => x.key === status) ?? JOB_STATUSES[0];
  return (
    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${s.color} backdrop-blur-sm border ${gradient ? "border-white/20" : ""}`}>
      {s.label}
    </span>
  );
}

function JobCard({
  job,
  advancing,
  onAdvance,
}: {
  job: (typeof MOCK_JOBS)[0];
  advancing: string | null;
  onAdvance: (jobId: string, status: string) => void;
}) {
  const statusObj = JOB_STATUSES.find((x) => x.key === job.status) ?? JOB_STATUSES[0];
  const nextStatus = NEXT_STATUS[job.status];

  return (
    <div className="group bg-card border border-border rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:border-primary/50 overflow-hidden">
      {/* Animated Background Gradient */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${statusObj.gradient} transition-opacity duration-300`} />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${
                job.jobType === "pickup"
                  ? "from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20"
                  : "from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20"
              } group-hover:scale-110 transition-transform duration-300`}
            >
              {job.jobType === "pickup" ? (
                <Package size={24} className="text-orange-600 dark:text-orange-400" />
              ) : (
                <Truck size={24} className="text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                {job.ticketNumber}
              </p>
              <p className="text-xs text-muted-foreground capitalize font-medium mt-0.5">
                {job.jobType} · {job.scheduledTime}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {job.priority === "high" && (
              <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg border border-red-200 dark:border-red-700/50 animate-pulse">
                <Flame size={12} className="text-red-500" />
                <span className="text-xs font-bold text-red-600 dark:text-red-400">High</span>
              </div>
            )}
            <StatusBadge status={job.status} gradient={statusObj.gradient} />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Details */}
        <div className="space-y-2.5">
          {/* Customer */}
          <div className="flex items-center gap-3 text-sm group/item">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/10 transition-colors">
              <User size={16} className="text-muted-foreground group-hover/item:text-primary transition-colors" />
            </div>
            <span className="font-semibold text-foreground group-hover/item:text-primary transition-colors">
              {job.customerName}
            </span>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 text-sm group/item">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/10 transition-colors">
              <Phone size={16} className="text-muted-foreground group-hover/item:text-primary transition-colors" />
            </div>
            <a
              href={`tel:${job.customerPhone}`}
              className="text-primary font-medium hover:underline transition-all"
            >
              {job.customerPhone}
            </a>
          </div>

          {/* Address */}
          <div className="flex items-start gap-3 text-sm group/item">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/item:bg-primary/10 transition-colors">
              <MapPin size={16} className="text-muted-foreground group-hover/item:text-primary transition-colors" />
            </div>
            <span className="text-muted-foreground line-clamp-2">{job.address}</span>
          </div>

          {/* Device */}
          <div className="flex items-center gap-3 text-sm group/item">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/10 transition-colors">
              <Zap size={16} className="text-muted-foreground group-hover/item:text-primary transition-colors" />
            </div>
            <span className="text-muted-foreground font-medium">{job.deviceType}</span>
          </div>

          {/* Notes */}
          {job.notes && (
            <div className="flex items-start gap-3 text-sm pl-0.5 mt-1 p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-700/30">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">{job.notes}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Actions */}
        <div className="flex gap-2">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl text-xs transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Navigation size={14} />
            Maps
          </a>
          {nextStatus && (
            <button
              onClick={() => onAdvance(job.id, job.status)}
              disabled={advancing === job.id}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-bold rounded-xl text-xs transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg disabled:scale-100 disabled:opacity-60 ${
                advancing === job.id
                  ? "bg-gradient-to-r from-primary/80 to-primary/60"
                  : `bg-gradient-to-r ${statusObj.gradient} text-white hover:shadow-lg`
              }`}
            >
              {advancing === job.id ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating…</span>
                </>
              ) : (
                <>
                  <ArrowRight size={14} />
                  <span className="hidden sm:inline">
                    {JOB_STATUSES.find((s) => s.key === nextStatus)?.label}
                  </span>
                  <span className="sm:hidden">Next</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DriverJobsPage() {
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const advanceStatus = (jobId: string, currentStatus: string) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    setAdvancing(jobId);
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: next } : j))
      );
      setAdvancing(null);
    }, 800);
  };

  const pending = jobs.filter((j) => j.status !== "delivered");
  const done = jobs.filter((j) => j.status === "delivered");
  const totalDeliveries = jobs.length;
  const completionRate = Math.round((done.length / totalDeliveries) * 100);

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 space-y-6 p-4 md:p-6">
          {/* Header */}
          <div className="space-y-4 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-foreground flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
                    <Truck size={24} className="text-white" />
                  </div>
                  My Jobs Today
                </h1>
                <p className="text-muted-foreground font-medium mt-2 flex items-center gap-2">
                  <Calendar size={16} />
                  {new Date().toLocaleDateString("en-PK", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700/50 rounded-2xl px-4 py-3 text-center hover:shadow-lg transition-all duration-300">
                  <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{pending.length}</p>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mt-1">Pending</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl px-4 py-3 text-center hover:shadow-lg transition-all duration-300">
                  <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{done.length}</p>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mt-1">Completed</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700/50 rounded-2xl px-4 py-3 text-center hover:shadow-lg transition-all duration-300">
                  <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{completionRate}%</p>
                  <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase mt-1">Progress</p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/50">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Active Jobs */}
          {pending.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top duration-700 delay-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp size={18} className="text-primary" />
                </div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Active Jobs ({pending.length})
                </h2>
              </div>

              <div className="space-y-4">
                {pending.map((job, idx) => (
                  <div
                    key={job.id}
                    className="animate-in fade-in slide-in-from-bottom duration-500"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <JobCard
                      job={job}
                      advancing={advancing}
                      onAdvance={advanceStatus}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Jobs */}
          {done.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top duration-700 delay-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Completed ({done.length})
                </h2>
              </div>

              <div className="space-y-2">
                {done.map((job, idx) => (
                  <div
                    key={job.id}
                    className="bg-card/50 border border-border rounded-2xl p-4 opacity-75 hover:opacity-100 transition-all duration-300 animate-in fade-in slide-in-from-bottom duration-500"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                          <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground">{job.ticketNumber}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {job.customerName} · {job.address.split(",")[0]}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {jobs.length === 0 && (
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-dashed border-border rounded-3xl p-12 text-center animate-in fade-in duration-500">
              <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Truck size={32} className="text-muted-foreground" />
              </div>
              <p className="font-bold text-foreground text-lg">No jobs today</p>
              <p className="text-muted-foreground text-sm mt-2">Check back later or contact your manager.</p>
            </div>
          )}

          {/* CSS for Animations */}
          <style jsx>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
            .animate-spin {
              animation: spin 1s linear infinite;
            }
          `}</style>
        </div>
      )}
    </DashboardShell>
  );
}