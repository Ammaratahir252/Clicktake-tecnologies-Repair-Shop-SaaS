"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef } from "react";
import { Camera, Upload, CheckCircle, Loader2, X, Image as ImageIcon, ChevronDown } from "lucide-react";

const MOCK_JOBS = [
  {
    id: "J-002",
    ticketNumber: "REP-2026-00448",
    customerName: "Sara Malik",
    deviceType: "Samsung Galaxy S24",
  },
  {
    id: "J-001",
    ticketNumber: "REP-2026-00451",
    customerName: "Ahmed Khan",
    deviceType: "iPhone 15 Pro Max",
  },
];

export default function DriverProofPage() {
  const [selectedJob, setSelectedJob] = useState(MOCK_JOBS[0]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleSubmit = () => {
    if (!preview) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setPreview(null);
      setNotes("");
    }, 1200);
  };

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
        <div className="space-y-6 max-w-lg">
          <div>
            <h1 className="text-2xl font-black text-foreground">Proof of Delivery</h1>
            <p className="text-muted-foreground font-medium mt-0.5">Upload delivery photo or capture signature</p>
          </div>

          {success && (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
              <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-emerald-700 dark:text-emerald-400 font-bold">Proof uploaded successfully!</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">Delivery confirmed for {selectedJob.customerName}</p>
              </div>
            </div>
          )}

          {/* Job Selector */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Delivery Job</p>
            <div className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between bg-muted rounded-xl px-4 py-3 text-left"
              >
                <div>
                  <p className="font-bold text-sm text-foreground">{selectedJob.ticketNumber} — {selectedJob.customerName}</p>
                  <p className="text-xs text-muted-foreground">{selectedJob.deviceType}</p>
                </div>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10">
                  {MOCK_JOBS.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => { setSelectedJob(job); setOpen(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                    >
                      <p className="font-bold text-sm text-foreground">{job.ticketNumber} — {job.customerName}</p>
                      <p className="text-xs text-muted-foreground">{job.deviceType}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Photo Upload */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Proof Photo</p>

            {preview ? (
              <div className="relative">
                <img src={preview} alt="Proof" className="w-full h-56 object-cover rounded-xl" />
                <button
                  onClick={() => setPreview(null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ImageIcon size={24} className="text-primary" />
                </div>
                <p className="font-bold text-foreground">Upload or Capture Photo</p>
                <p className="text-sm text-muted-foreground mt-1">Tap to choose from gallery or take a new photo</p>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.removeAttribute("capture");
                    fileRef.current.click();
                  }
                }}
                className="flex items-center justify-center gap-2 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/70 transition-all text-sm"
              >
                <Upload size={16} />
                Gallery
              </button>
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.setAttribute("capture", "environment");
                    fileRef.current.click();
                  }
                }}
                className="flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm"
              >
                <Camera size={16} />
                Camera
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Notes (Optional)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Left with security guard, customer signed, etc."
              rows={3}
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!preview || loading}
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-black text-base rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {loading ? "Uploading…" : "Submit Proof of Delivery"}
          </button>
        </div>
      )}
    </DashboardShell>
  );
}
