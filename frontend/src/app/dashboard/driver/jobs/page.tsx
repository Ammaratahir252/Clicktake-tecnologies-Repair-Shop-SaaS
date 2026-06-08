"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import {
  Truck, MapPin, Phone, Clock, CheckCircle, ChevronRight,
  Package, Navigation, ArrowRight, User, AlertCircle
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
    deviceType: "MacBook Pro 14\"",
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

  const advanceStatus = (jobId: string, currentStatus: string) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    setAdvancing(jobId);
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: next } : j))
      );
      setAdvancing(null);
    }, 600);
  };

  const pending = jobs.filter((j) => j.status !== "delivered");
  const done = jobs.filter((j) => j.status === "delivered");

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">My Jobs Today</h1>
              <p className="text-muted-foreground font-medium mt-0.5">
                {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-black text-primary">{pending.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Pending</p>
              </div>
              <div className="bg-card border border-border rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-black text-emerald-500">{done.length}</p>
                <p className="text-xs text-muted-foreground font-medium">Done</p>
              </div>
            </div>
          </div>

          {/* Active Jobs */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Active Jobs</h2>
              {pending.map((job) => (
                <div key={job.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${job.jobType === "pickup" ? "bg-orange-100 dark:bg-orange-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                        {job.jobType === "pickup" ? (
                          <Package size={20} className="text-orange-600 dark:text-orange-400" />
                        ) : (
                          <Truck size={20} className="text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{job.ticketNumber}</p>
                        <p className="text-xs text-muted-foreground capitalize font-medium">{job.jobType} · {job.scheduledTime}</p>
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="font-semibold text-foreground">{job.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-muted-foreground flex-shrink-0" />
                      <a href={`tel:${job.customerPhone}`} className="text-primary font-medium">{job.customerPhone}</a>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{job.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Package size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{job.deviceType}</span>
                    </div>
                    {job.notes && (
                      <div className="flex items-start gap-2 text-sm">
                        <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <span className="text-amber-600 dark:text-amber-400 font-medium">{job.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl text-sm transition-all"
                    >
                      <Navigation size={14} />
                      Navigate
                    </a>
                    {NEXT_STATUS[job.status] && (
                      <button
                        onClick={() => advanceStatus(job.id, job.status)}
                        disabled={advancing === job.id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-sm transition-all hover:opacity-90 disabled:opacity-60"
                      >
                        {advancing === job.id ? (
                          <span className="animate-pulse">Updating…</span>
                        ) : (
                          <>
                            Mark as {JOB_STATUSES.find((s) => s.key === NEXT_STATUS[job.status])?.label}
                            <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed */}
          {done.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Completed</h2>
              {done.map((job) => (
                <div key={job.id} className="bg-card border border-border rounded-2xl p-4 opacity-70">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{job.ticketNumber}</p>
                        <p className="text-xs text-muted-foreground">{job.customerName} · {job.address.split(",")[0]}</p>
                      </div>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {jobs.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <Truck size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="font-bold text-foreground">No jobs today</p>
              <p className="text-muted-foreground text-sm">Check back later or contact your manager.</p>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
