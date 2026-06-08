"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Navigation, MapPin, Phone, Truck, ExternalLink, ChevronDown, ChevronLeft, Copy, CheckCheck } from "lucide-react";

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
  },
];

const JOB_TYPE_STYLE: Record<string, string> = {
  pickup:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  delivery: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function DriverNavigatePage() {
  const [selectedJob, setSelectedJob] = useState(MOCK_JOBS[0]);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const openMaps = () => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedJob.address)}`, "_blank");
  };

  const openWaze = () => {
    window.open(`https://waze.com/ul?q=${encodeURIComponent(selectedJob.address)}`, "_blank");
  };

  const openAppleMaps = () => {
    window.open(`https://maps.apple.com/?q=${encodeURIComponent(selectedJob.address)}`, "_blank");
  };

  const copyAddress = async () => {
    await navigator.clipboard.writeText(selectedJob.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
              <div className="min-h-screen w-full space-y-5 pb-10 max-w-xl">
          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <a href="/dashboard/driver" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={18} />
            </a>
            <div>
              <h1 className="text-2xl font-black text-foreground">Navigate</h1>
              <p className="text-muted-foreground text-sm font-medium">Open maps to customer address</p>
            </div>
          </div>

          {/* ── Job Selector ─────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Job</p>
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between bg-muted hover:bg-muted/70 border border-border rounded-xl px-4 py-3.5 text-left transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 capitalize ${JOB_TYPE_STYLE[selectedJob.jobType]}`}>
                    {selectedJob.jobType}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{selectedJob.ticketNumber} — {selectedJob.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{selectedJob.address}</p>
                  </div>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform shrink-0 ml-2 ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-2xl shadow-xl z-20 overflow-hidden">
                  {MOCK_JOBS.map((job, i) => (
                    <button
                      key={job.id}
                      onClick={() => { setSelectedJob(job); setOpen(false); }}
                      className={`w-full text-left px-4 py-3.5 hover:bg-muted transition-colors flex items-center gap-3 ${
                        i !== MOCK_JOBS.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md shrink-0 capitalize ${JOB_TYPE_STYLE[job.jobType]}`}>
                        {job.jobType}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground">{job.ticketNumber} — {job.customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Destination Card ─────────────────────────────────── */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border-b border-border px-5 py-3">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest">Destination</p>
            </div>
            <div className="px-5 py-4 space-y-4">

              {/* Customer */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-primary font-black text-sm">
                    {selectedJob.customerName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-foreground">{selectedJob.customerName}</p>
                  <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-md ${JOB_TYPE_STYLE[selectedJob.jobType]}`}>
                    {selectedJob.jobType}
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="bg-muted/60 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground font-medium leading-relaxed">{selectedJob.address}</p>
                </div>
                <button
                  onClick={copyAddress}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy address"
                >
                  {copied ? <CheckCheck size={15} className="text-emerald-500" /> : <Copy size={15} />}
                </button>
              </div>

              {/* Phone & Device */}
              <div className="flex gap-3">
                <div className="flex-1 bg-muted/40 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <Phone size={13} className="text-muted-foreground shrink-0" />
                  <a href={`tel:${selectedJob.customerPhone}`} className="text-primary font-bold text-sm hover:underline truncate">
                    {selectedJob.customerPhone}
                  </a>
                </div>
                <div className="flex-1 bg-muted/40 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <Truck size={13} className="text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground font-medium truncate">{selectedJob.deviceType}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Navigation Apps ──────────────────────────────────── */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Open in</p>

            <button
              onClick={openMaps}
              className="w-full flex items-center justify-between px-5 py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] shadow-md shadow-primary/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <Navigation size={16} />
                </div>
                <span>Google Maps</span>
              </div>
              <ExternalLink size={15} className="opacity-70" />
            </button>

            <button
              onClick={openWaze}
              className="w-full flex items-center justify-between px-5 py-4 bg-card border border-border text-foreground font-bold rounded-2xl hover:bg-muted transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900/30 rounded-xl flex items-center justify-center">
                  <Navigation size={16} className="text-sky-600 dark:text-sky-400" />
                </div>
                <span>Waze</span>
              </div>
              <ExternalLink size={15} className="text-muted-foreground" />
            </button>

            <button
              onClick={openAppleMaps}
              className="w-full flex items-center justify-between px-5 py-4 bg-card border border-border text-foreground font-bold rounded-2xl hover:bg-muted transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                  <Navigation size={16} className="text-gray-600 dark:text-gray-400" />
                </div>
                <span>Apple Maps</span>
              </div>
              <ExternalLink size={15} className="text-muted-foreground" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center pb-2">
            Tap any app to open navigation
          </p>

        </div>
      )}
    </DashboardShell>
  );
}