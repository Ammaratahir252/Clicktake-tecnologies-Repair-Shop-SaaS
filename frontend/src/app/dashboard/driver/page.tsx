"use client";

/**
 * DRIVER DASHBOARD — /dashboard/driver
 *
 * Per blueprint Section 5.1 Role 7:
 * - View ONLY assigned pickup/delivery jobs for the day
 * - Update delivery status: En Route, Arrived, Picked Up, Delivered
 * - GPS location sharing during active delivery
 * - Collect payment on delivery (marks invoice as paid)
 * - Capture proof of delivery photo
 * - CANNOT: view repair details, access financial data, modify tickets
 */

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Truck, MapPin, Camera, CreditCard, Navigation,
  ChevronRight, CheckCircle, Clock, Loader2,
  AlertCircle, Package, ShieldCheck
} from "lucide-react";

// Delivery status progression per blueprint M9
const JOB_STATUSES = [
  { key: "assigned",    label: "Assigned",    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  { key: "en_route",   label: "En Route",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "arrived",    label: "Arrived",     color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "picked_up",  label: "Picked Up",   color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { key: "delivered",  label: "Delivered",   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
];

const MODULES = [
  {
    key: "jobs",
    icon: Truck,
    title: "My Jobs Today",
    desc: "View all assigned pickups and deliveries",
    href: "/dashboard/driver/jobs",
    color: "bg-orange-500",
  },
  {
    key: "navigate",
    icon: Navigation,
    title: "Navigate",
    desc: "Open Google Maps to customer address",
    href: "/dashboard/driver/navigate",
    color: "bg-blue-600",
  },
  {
    key: "payment",
    icon: CreditCard,
    title: "Collect Payment",
    desc: "Record cash/card payment on delivery",
    href: "/dashboard/driver/payment",
    color: "bg-emerald-600",
  },
  {
    key: "proof",
    icon: Camera,
    title: "Proof of Delivery",
    desc: "Upload delivery photo or signature",
    href: "/dashboard/driver/proof",
    color: "bg-purple-600",
  },
];

function StatusBadge({ status }: { status: string }) {
  const found = JOB_STATUSES.find((s) => s.key === status);
  const s = found ?? JOB_STATUSES[0];
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>
      {s.label}
    </span>
  );
}

export default function DriverDashboard() {
  return (
    <DashboardShell requiredRole="driver">
      {(user) => <DriverContent user={user} />}
    </DashboardShell>
  );
}

function DriverContent({ user }: { user: any }) {
  const [jobs, setJobs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    // Fetch only this driver's assigned delivery jobs
    api.get("/api/delivery-jobs/my")
      .then((res) => {
        const data = res.data?.data;
        setJobs(Array.isArray(data) ? data : [data].filter(Boolean));
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load jobs."))
      .finally(() => setLoading(false));
  }, []);

  const activeJobs     = jobs.filter((j) => j.status !== "delivered");
  const completedToday = jobs.filter((j) => j.status === "delivered");

  return (
    <div className="space-y-6">

      {/* ── Stats Strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Jobs",     value: jobs.length,         color: "text-foreground" },
          { label: "Active",         value: activeJobs.length,   color: "text-orange-600 dark:text-orange-400" },
          { label: "Completed Today",value: completedToday.length,color: "text-emerald-600 dark:text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
            <p className={`text-2xl font-black ${color}`}>{loading ? "—" : value}</p>
            <p className="text-xs text-muted-foreground font-semibold mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Module Cards ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
          Your Tools
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map(({ key, icon: Icon, title, desc, href, color }) => (
            <a
              key={key}
              href={href}
              className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:border-border/80 transition-all group active:scale-[0.98]"
            >
              <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md`}>
                <Icon className="text-white w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      </section>

      {/* ── Today's Job List ─────────────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={17} className="text-orange-500 dark:text-orange-400" />
            <h2 className="font-bold text-foreground">Today's Jobs</h2>
          </div>
          <span className="text-xs text-muted-foreground bg-muted border border-border rounded-full px-3 py-1 font-semibold">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="animate-spin w-5 h-5" />
            <span className="text-sm">Loading jobs...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 m-4 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <AlertCircle size={16} className="text-destructive" />
            <p className="text-sm font-semibold text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto text-muted-foreground/30 w-10 h-10 mb-3" />
            <p className="text-muted-foreground font-semibold text-sm">No jobs assigned today.</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Check with your manager for assignments.</p>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="divide-y divide-border">
            {jobs.map((job, i) => (
              <div
                key={job._id ?? job.id ?? i}
                className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                    ${job.jobType === "pickup" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                    {job.jobType === "pickup"
                      ? <Package size={16} className="text-purple-600 dark:text-purple-400" />
                      : <Truck size={16} className="text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm capitalize">
                      {job.jobType ?? "delivery"} — {job.customerName ?? "Customer"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">{job.address?.street ?? "Address not set"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status ?? "assigned"} />
                  <a
                    href={`/dashboard/driver/jobs/${job._id ?? job.id}`}
                    className="text-xs font-bold text-orange-500 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1"
                  >
                    Open <ChevronRight size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Access Restriction ────────────────────────────────────────── */}
      <div className="bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl px-5 py-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-orange-800 dark:text-orange-400">Driver Access</p>
          <p className="text-xs text-orange-700 dark:text-orange-500 mt-1">
            You can only view and update your own assigned delivery jobs. You cannot access
            repair details, financial data, inventory, or customer accounts. Contact your
            manager if you need additional information about a job.
          </p>
        </div>
      </div>

    </div>
  );
}

// Made with Bob
