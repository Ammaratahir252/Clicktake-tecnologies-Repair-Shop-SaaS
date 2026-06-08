"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import {
  Truck, MapPin, Phone, CheckCircle,
  Package, Navigation, ArrowRight, User, AlertCircle,
  Clock, ChevronLeft, Filter
} from "lucide-react";

const JOB_STATUSES = [
  { key: "assigned",   label: "Assigned",   color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  { key: "en_route",   label: "En Route",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "arrived",    label: "Arrived",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "picked_up",  label: "Picked Up",  color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { key: "delivered",  label: "Delivered",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
];

const NEXT_STATUS: Record<string, string> = {
  assigned:  "en_route",
  en_route:  "arrived",
  arrived:   "picked_up",
  picked_up: "delivered",
};

const NEXT_LABEL: Record<string, string> = {
  assigned:  "Start Route",
  en_route:  "Mark Arrived",
  arrived:   "Mark Picked Up",
  picked_up: "Mark Delivered",
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
  },
];

function StatusBadge({ status }: { status: string }) {
  const s = JOB_STATUSES.find((x) => x.key === status) ?? JOB_STATUSES[0];
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>
      {s.label}
    </span>
  );
}

export default function DriverJobsPage() {
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");

  const advanceStatus = (jobId: string, currentStatus: string) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    setAdvancing(jobId);
    setTimeout(() => {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: next } : j)));
      setAdvancing(null);
    }, 700);
  };

  const pending   = jobs.filter((j) => j.status !== "delivered");
  const done      = jobs.filter((j) => j.status === "delivered");
  const displayed = filter === "all" ? jobs : filter === "active" ? pending : done;

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
        <div className="min-h-screen w-full space-y-5 pb-10">

          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <a href="/dashboard/driver" className="text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft size={18} />
                </a>
                <h1 className="text-2xl font-black text-foreground">My Jobs Today</h1>
              </div>
              <p className="text-muted-foreground text-sm font-medium pl-6">
                {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2 text-center min-w-[52px]">
                <p className="text-xl font-black text-orange-600 dark:text-orange-400">{pending.length}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Active</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 text-center min-w-[52px]">
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{done.length}</p>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Done</p>
              </div>
            </div>
          </div>

          {/* ── Filter Tabs ──────────────────────────────────────── */}
          <div className="flex gap-2 bg-muted p-1 rounded-xl w-fit">
            {(["all", "active", "done"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${
                  filter === tab
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab} {tab === "all" ? `(${jobs.length})` : tab === "active" ? `(${pending.length})` : `(${done.length})`}
              </button>
            ))}
          </div>

          {/* ── Job Cards ────────────────────────────────────────── */}
          <div className="space-y-4">
            {displayed.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-14 text-center">
                <Truck size={36} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="font-bold text-foreground text-sm">No jobs here</p>
                <p className="text-muted-foreground text-xs mt-1">Try switching the filter above.</p>
              </div>
            )}

            {displayed.map((job) => {
              const isDone = job.status === "delivered";
              return (
                <div
                  key={job.id}
                  className={`bg-card border rounded-2xl shadow-sm overflow-hidden transition-all ${
                    isDone ? "border-border opacity-65" : "border-border hover:shadow-md hover:border-primary/20"
                  }`}
                >
                  {/* Card Top Bar */}
                  <div className={`px-5 py-2.5 flex items-center justify-between border-b border-border ${
                    job.jobType === "pickup"
                      ? "bg-orange-50 dark:bg-orange-900/10"
                      : "bg-blue-50 dark:bg-blue-900/10"
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                        job.jobType === "pickup"
                          ? "bg-orange-100 dark:bg-orange-900/30"
                          : "bg-blue-100 dark:bg-blue-900/30"
                      }`}>
                        {job.jobType === "pickup"
                          ? <Package size={13} className="text-orange-600 dark:text-orange-400" />
                          : <Truck size={13} className="text-blue-600 dark:text-blue-400" />}
                      </div>
                      <span className={`text-xs font-bold capitalize ${
                        job.jobType === "pickup"
                          ? "text-orange-700 dark:text-orange-400"
                          : "text-blue-700 dark:text-blue-400"
                      }`}>{job.jobType}</span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-xs font-mono text-muted-foreground">{job.ticketNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">{job.scheduledTime}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 py-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground shrink-0">
                          {job.customerName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{job.customerName}</p>
                          <a href={`tel:${job.customerPhone}`} className="text-xs text-primary font-medium hover:underline">
                            {job.customerPhone}
                          </a>
                        </div>
                      </div>
                      <StatusBadge status={job.status} />
                    </div>

                    <div className="flex items-start gap-2 text-sm bg-muted/60 rounded-xl px-3 py-2.5">
                      <MapPin size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-muted-foreground text-xs leading-relaxed">{job.address}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Package size={13} className="text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground font-medium">{job.deviceType}</span>
                    </div>

                    {job.notes && (
                      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/50 rounded-xl px-3 py-2">
                        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">{job.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer — Actions */}
                  {!isDone && (
                    <div className="px-5 pb-5 flex gap-2">
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl text-xs transition-all border border-border"
                      >
                        <Navigation size={13} />
                        Navigate
                      </a>
                      {NEXT_STATUS[job.status] && (
                        <button
                          onClick={() => advanceStatus(job.id, job.status)}
                          disabled={advancing === job.id}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs transition-all hover:opacity-90 disabled:opacity-60 shadow-sm"
                        >
                          {advancing === job.id ? (
                            <span className="animate-pulse text-xs">Updating…</span>
                          ) : (
                            <>
                              {NEXT_LABEL[job.status]}
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {isDone && (
                    <div className="px-5 pb-4">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle size={14} />
                        <span className="text-xs font-bold">Completed</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}
    </DashboardShell>
  );
}