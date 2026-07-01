"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  Truck, Phone, CheckCircle, Navigation, ArrowRight, User,
  AlertCircle, Zap, TrendingUp, Calendar, Loader2,
} from "lucide-react";

const JOB_STATUSES = [
  { key: "received",  label: "Pickup Needed",  color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",   gradient: "from-orange-500 to-orange-600"  },
  { key: "ready",     label: "For Delivery",   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",       gradient: "from-amber-500 to-amber-600"   },
  { key: "delivered", label: "Delivered",      color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", gradient: "from-emerald-500 to-emerald-600"},
];

const NEXT_STATUS: Record<string, string> = {
  ready: "delivered",
};

const NEXT_LABEL: Record<string, string> = {
  ready: "Mark Delivered",
};

const DRIVER_RELEVANT = ["received", "ready", "delivered"];

const DRIVER_RELEVANT = ["received", "ready", "delivered"];

function StatusBadge({ status }: { status: string }) {
  const s = JOB_STATUSES.find((x) => x.key === status) ?? JOB_STATUSES[0];
  return <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${s.color}`}>{s.label}</span>;
}

function JobCard({ job, advancing, onAdvance }: { job: any; advancing: string | null; onAdvance: (id: string, status: string) => void }) {
  const statusObj = JOB_STATUSES.find((x) => x.key === job.status) ?? JOB_STATUSES[0];
  const nextStatus = NEXT_STATUS[job.status];
  const address = job.customerId?.address ?? "Address on file";

  return (
    <div className="group bg-card border border-border rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:border-primary/50 overflow-hidden relative">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${statusObj.gradient} transition-opacity duration-300`} />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/30">
              <Truck size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">{job.ticketNumber}</p>
              <p className="text-xs text-muted-foreground capitalize font-medium mt-0.5">
                {job.deviceBrand} {job.deviceModel}
              </p>
            </div>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-muted-foreground" />
            </div>
            <span className="font-semibold text-foreground">{job.customerId?.name ?? "Customer"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone size={16} className="text-muted-foreground" />
            </div>
            <a href={`tel:${job.customerId?.phone}`} className="text-primary font-medium hover:underline">
              {job.customerId?.phone ?? "—"}
            </a>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap size={16} className="text-muted-foreground" />
            </div>
            <span className="text-muted-foreground font-medium">{job.issue}</span>
          </div>
          {job.notes && (
            <div className="flex items-start gap-3 text-sm p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-700/30">
              <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">{job.notes}</span>
            </div>
          )}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="flex gap-2">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl text-xs transition-all"
          >
            <Navigation size={14} />
            Maps
          </a>
          {nextStatus && (
            <button
              onClick={() => onAdvance(job._id, job.status)}
              disabled={advancing === job._id}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-bold rounded-xl text-xs transition-all bg-gradient-to-r ${statusObj.gradient} text-white hover:shadow-lg disabled:opacity-60`}
            >
              {advancing === job._id ? (
                <><Loader2 size={14} className="animate-spin" /><span>Updating…</span></>
              ) : (
                <><ArrowRight size={14} /><span>{NEXT_LABEL[job.status] ?? "Next"}</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, advancing, onAdvance }: { job: any; advancing: string | null; onAdvance: (id: string, status: string) => void }) {
  const statusObj = JOB_STATUSES.find((x) => x.key === job.status) ?? JOB_STATUSES[0];
  const nextStatus = NEXT_STATUS[job.status];
  const address = job.customerId?.address ?? "Address on file";

  return (
    <div className="group bg-card border border-border rounded-2xl p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:border-primary/50 overflow-hidden relative">
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${statusObj.gradient} transition-opacity duration-300`} />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100 dark:bg-blue-900/30">
              <Truck size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-sm">{job.ticketNumber}</p>
              <p className="text-xs text-muted-foreground capitalize font-medium mt-0.5">
                {job.deviceBrand} {job.deviceModel}
              </p>
            </div>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="space-y-2.5">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-muted-foreground" />
            </div>
            <span className="font-semibold text-foreground">{job.customerId?.name ?? "Customer"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
              <Phone size={16} className="text-muted-foreground" />
            </div>
            <a href={`tel:${job.customerId?.phone}`} className="text-primary font-medium hover:underline">
              {job.customerId?.phone ?? "—"}
            </a>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap size={16} className="text-muted-foreground" />
            </div>
            <span className="text-muted-foreground font-medium">{job.issue}</span>
          </div>
          {job.notes && (
            <div className="flex items-start gap-3 text-sm p-2.5 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-700/30">
              <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-amber-700 dark:text-amber-400 font-medium">{job.notes}</span>
            </div>
          )}
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="flex gap-2">
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl text-xs transition-all"
          >
            <Navigation size={14} />
            Maps
          </a>
          {nextStatus && (
            <button
              onClick={() => onAdvance(job._id, job.status)}
              disabled={advancing === job._id}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 font-bold rounded-xl text-xs transition-all bg-gradient-to-r ${statusObj.gradient} text-white hover:shadow-lg disabled:opacity-60`}
            >
              {advancing === job._id ? (
                <><Loader2 size={14} className="animate-spin" /><span>Updating…</span></>
              ) : (
                <><ArrowRight size={14} /><span>{NEXT_LABEL[job.status] ?? "Next"}</span></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DriverJobsPage() {
  return (
    <DashboardShell requiredRole="driver">
      {() => <JobsContent />}
    </DashboardShell>
  );
}

function JobsContent() {
  const [jobs, setJobs]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [advancing, setAdvancing] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get("/api/tickets");
      const all: any[] = res.data?.data ?? [];
      setJobs(all.filter((j) => DRIVER_RELEVANT.includes(j.status)));
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const advanceStatus = async (ticketId: string, currentStatus: string) => {
    const next = NEXT_STATUS[currentStatus];
    if (!next) return;
    setAdvancing(ticketId);
    try {
      await api.patch(`/api/tickets/${ticketId}/status`, { status: next });
      setJobs((prev) => prev.map((j) => (j._id === ticketId ? { ...j, status: next } : j)));
    } catch {
      // silently fail — connection issue
    } finally {
      setAdvancing(null);
    }
  };

  const pending = jobs.filter((j) => j.status !== "delivered");
  const done    = jobs.filter((j) => j.status === "delivered");
  const completionRate = jobs.length > 0 ? Math.round((done.length / jobs.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading jobs…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 space-y-6 p-4 md:p-6">
      <div className="space-y-4">
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
              {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700/50 rounded-2xl px-4 py-3 text-center">
              <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{pending.length}</p>
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mt-1">Pending</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border border-emerald-200 dark:border-emerald-700/50 rounded-2xl px-4 py-3 text-center">
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{done.length}</p>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mt-1">Completed</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700/50 rounded-2xl px-4 py-3 text-center">
              <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{completionRate}%</p>
              <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase mt-1">Progress</p>
            </div>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden border border-border/50">
          <div className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500" style={{ width: `${completionRate}%` }} />
        </div>
      </div>

      {pending.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-primary" />
            </div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Active Jobs ({pending.length})</h2>
          </div>
          <div className="space-y-4">
            {pending.map((job) => (
              <JobCard key={job._id} job={job} advancing={advancing} onAdvance={advanceStatus} />
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Completed ({done.length})</h2>
          </div>
          <div className="space-y-2">
            {done.map((job) => (
              <div key={job._id} className="bg-card/50 border border-border rounded-2xl p-4 opacity-75 hover:opacity-100 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">{job.ticketNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{job.customerId?.name ?? "Customer"}</p>
                    </div>
                  </div>
                  <StatusBadge status={job.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-dashed border-border rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Truck size={32} className="text-muted-foreground" />
          </div>
          <p className="font-bold text-foreground text-lg">No jobs today</p>
          <p className="text-muted-foreground text-sm mt-2">Check back later or contact your manager.</p>
        </div>
      )}
    </div>
  );
}
