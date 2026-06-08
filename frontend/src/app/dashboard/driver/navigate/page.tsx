"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Navigation, MapPin, Phone, Truck, ExternalLink, ChevronDown } from "lucide-react";

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

export default function DriverNavigatePage() {
  const [selectedJob, setSelectedJob] = useState(MOCK_JOBS[0]);
  const [open, setOpen] = useState(false);

  const openMaps = () => {
    window.open(
      `https://maps.google.com/?q=${encodeURIComponent(selectedJob.address)}`,
      "_blank"
    );
  };

  const openWaze = () => {
    window.open(
      `https://waze.com/ul?q=${encodeURIComponent(selectedJob.address)}`,
      "_blank"
    );
  };

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
        <div className="space-y-6 max-w-lg">
          <div>
            <h1 className="text-2xl font-black text-foreground">Navigate</h1>
            <p className="text-muted-foreground font-medium mt-0.5">Open maps to customer address</p>
          </div>

          {/* Job Selector */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Select Job</p>
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between bg-muted rounded-xl px-4 py-3 text-left"
              >
                <div>
                  <p className="font-bold text-sm text-foreground">{selectedJob.ticketNumber} — {selectedJob.customerName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedJob.address}</p>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                  {MOCK_JOBS.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => { setSelectedJob(job); setOpen(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                    >
                      <p className="font-bold text-sm text-foreground">{job.ticketNumber} — {job.customerName}</p>
                      <p className="text-xs text-muted-foreground">{job.address}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Address Card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Destination</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin size={20} className="text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground">{selectedJob.customerName}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{selectedJob.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone size={18} className="text-muted-foreground" />
              </div>
              <a href={`tel:${selectedJob.customerPhone}`} className="text-primary font-bold">
                {selectedJob.customerPhone}
              </a>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                <Truck size={18} className="text-muted-foreground" />
              </div>
              <span className="text-sm text-foreground font-medium capitalize">
                {selectedJob.jobType} · {selectedJob.deviceType}
              </span>
            </div>
          </div>

          {/* Map Buttons */}
          <div className="space-y-3">
            <button
              onClick={openMaps}
              className="w-full flex items-center justify-between px-5 py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 transition-all"
            >
              <div className="flex items-center gap-3">
                <Navigation size={20} />
                <span>Open in Google Maps</span>
              </div>
              <ExternalLink size={16} className="opacity-70" />
            </button>
            <button
              onClick={openWaze}
              className="w-full flex items-center justify-between px-5 py-4 bg-card border border-border text-foreground font-bold rounded-2xl hover:bg-muted transition-all"
            >
              <div className="flex items-center gap-3">
                <Navigation size={20} className="text-muted-foreground" />
                <span>Open in Waze</span>
              </div>
              <ExternalLink size={16} className="text-muted-foreground" />
            </button>
          </div>

          {/* Tip */}
          <p className="text-xs text-muted-foreground text-center">
            Tap a button to open navigation in your preferred app
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
