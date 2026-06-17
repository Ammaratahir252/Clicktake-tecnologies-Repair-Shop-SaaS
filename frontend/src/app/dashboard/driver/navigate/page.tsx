"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Navigation, MapPin, Phone, Truck, ExternalLink,
  ChevronDown, Map, Zap, Share2, Copy, CheckCircle, Loader2,
} from "lucide-react";

const DRIVER_RELEVANT = ["received", "ready", "delivered"];

export default function DriverNavigatePage() {
  return (
    <DashboardShell requiredRole="driver">
      {() => <NavigateContent />}
    </DashboardShell>
  );
}

function NavigateContent() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mapOpen, setMapOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get("/api/tickets");
      const tickets: any[] = res.data?.data ?? [];
      const relevant = tickets.filter((t) => DRIVER_RELEVANT.includes(t.status));
      setJobs(relevant);
      if (relevant.length > 0) setSelectedJob(relevant[0]);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const address = selectedJob?.customerId?.address || "(No address on file)";
  const customerName = selectedJob?.customerId?.name || "Unknown";
  const customerPhone = selectedJob?.customerId?.phone || "";
  const deviceLabel = `${selectedJob?.deviceBrand ?? ""} ${selectedJob?.deviceModel ?? ""}`.trim();

  const openMaps = () => {
    if (!selectedJob) return;
    setMapOpen("google");
    setTimeout(() => {
      window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, "_blank");
    }, 300);
  };

  const openWaze = () => {
    if (!selectedJob) return;
    setMapOpen("waze");
    setTimeout(() => {
      window.open(`https://waze.com/ul?q=${encodeURIComponent(address)}`, "_blank");
    }, 300);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!selectedJob) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Delivery Location",
          text: `${customerName} - ${address}`,
        });
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading jobs…</span>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-20">
        <Map size={40} className="text-muted-foreground mx-auto mb-3" />
        <p className="font-bold text-foreground">No active jobs</p>
        <p className="text-sm text-muted-foreground mt-1">Jobs with received, ready, or delivered status will appear here</p>
      </div>
    );
  }

  const otherJobs = jobs.filter((j) => j._id !== selectedJob?._id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 space-y-6 p-4 md:p-6">
      <div className="space-y-2 animate-in fade-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
            <Map size={24} className="text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground">Navigate</h1>
            <p className="text-muted-foreground font-medium">Open maps to customer address</p>
          </div>
        </div>
      </div>

      {copied && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 animate-in fade-in slide-in-from-top duration-300 z-50">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-2xl border border-emerald-400/30 flex items-center gap-3">
            <CheckCircle size={20} className="text-white flex-shrink-0" />
            <p className="text-white font-bold">Address copied to clipboard!</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Job Selector */}
        <div className="lg:col-span-1 space-y-6 animate-in fade-in slide-in-from-left duration-500">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all backdrop-blur-sm sticky top-4">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <Truck size={16} />
              Select Job
            </p>
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between bg-gradient-to-r from-muted to-muted/50 hover:from-primary/10 hover:to-primary/5 rounded-xl px-4 py-4 text-left transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                    {selectedJob?.ticketNumber}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{customerName}</p>
                  <p className="text-xs text-muted-foreground truncate">{address}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`text-muted-foreground transition-all duration-300 flex-shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
                />
              </button>

              {open && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-10 overflow-hidden max-h-96 overflow-y-auto">
                  {jobs.map((job, idx) => (
                    <button
                      key={job._id}
                      onClick={() => { setSelectedJob(job); setOpen(false); }}
                      className={`w-full text-left px-4 py-4 hover:bg-primary/5 transition-all group ${
                        idx !== jobs.length - 1 ? "border-b border-border" : ""
                      } ${selectedJob?._id === job._id ? "bg-primary/10 border-l-4 border-l-primary" : ""}`}
                    >
                      <p className="font-bold text-sm text-foreground group-hover:text-primary">{job.ticketNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">{job.customerId?.name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{job.customerId?.address || "No address on file"}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center border border-border/50">
                <p className="text-xs text-muted-foreground font-medium">Status</p>
                <p className="text-sm font-black text-primary mt-0.5 capitalize">
                  {(selectedJob?.status ?? "").replace("_", " ")}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center border border-border/50">
                <p className="text-xs text-muted-foreground font-medium">Device</p>
                <p className="text-sm font-black text-primary mt-0.5 truncate">{deviceLabel || "—"}</p>
              </div>
            </div>
          </div>

          {otherJobs.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Other Jobs</p>
              <div className="space-y-2">
                {otherJobs.map((job) => (
                  <button
                    key={job._id}
                    onClick={() => setSelectedJob(job)}
                    className="w-full text-left p-3 bg-muted/50 hover:bg-primary/5 rounded-lg transition-all group border border-border/50 hover:border-primary/30"
                  >
                    <p className="font-bold text-xs text-foreground">{job.ticketNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {(job.status ?? "").replace("_", " ")}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column — Address & Navigation */}
        <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-right duration-500">
          <div className="border rounded-2xl p-4 flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Navigation size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase capitalize">
                {(selectedJob?.status ?? "").replace("_", " ")}
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">{deviceLabel || "Unknown device"}</p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-lg space-y-4">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">📍 Destination</p>

            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={24} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Customer Location</p>
                  <p className="font-bold text-lg text-foreground mt-1">{customerName}</p>
                  <p className="text-sm text-muted-foreground mt-1 break-words">{address}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                <button
                  onClick={handleCopyAddress}
                  className="flex items-center justify-center gap-2 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-lg text-xs transition-all hover:scale-105 active:scale-95"
                >
                  <Copy size={14} />
                  Copy
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-lg text-xs transition-all hover:scale-105 active:scale-95"
                >
                  <Share2 size={14} />
                  Share
                </button>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {customerPhone && (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-200 dark:border-blue-700/50">
                    <Phone size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase">Contact</p>
                    <a
                      href={`tel:${customerPhone}`}
                      className="text-lg font-bold text-primary hover:text-primary/80 transition-colors mt-1 block"
                    >
                      {customerPhone}
                    </a>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </>
            )}

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-200 dark:border-purple-700/50">
                <Truck size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">Device</p>
                <p className="font-bold text-foreground mt-1">{deviceLabel || "Unknown"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={openMaps}
              disabled={mapOpen === "google"}
              className={`w-full flex items-center justify-between px-6 py-4 font-bold rounded-2xl transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
                mapOpen === "google"
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white opacity-75"
                  : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
              }`}
            >
              <div className="flex items-center gap-3"><Navigation size={20} /><span>Google Maps</span></div>
              <ExternalLink size={16} className="opacity-70" />
            </button>

            <button
              onClick={openWaze}
              disabled={mapOpen === "waze"}
              className={`w-full flex items-center justify-between px-6 py-4 font-bold rounded-2xl transition-all border-2 hover:scale-105 active:scale-95 ${
                mapOpen === "waze"
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 text-amber-700 dark:text-amber-400"
                  : "bg-card border-border text-foreground hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-3"><Navigation size={20} /><span>Waze</span></div>
              <ExternalLink size={16} />
            </button>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-200 dark:border-amber-700/50">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400 flex items-start gap-2">
              <Zap size={16} className="flex-shrink-0 mt-0.5" />
              Choose your preferred navigation app to reach the customer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
