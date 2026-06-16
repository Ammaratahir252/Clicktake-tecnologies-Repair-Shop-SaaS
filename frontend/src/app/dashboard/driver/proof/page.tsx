"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef } from "react";
import { Camera, Upload, CheckCircle, Loader2, X, Image as ImageIcon, ChevronDown, ZoomIn, Download, Share2 } from "lucide-react";

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
  const [fullscreenPreview, setFullscreenPreview] = useState<string | null>(null);
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

  const handleDownload = () => {
    if (!preview) return;
    const link = document.createElement("a");
    link.href = preview;
    link.download = `proof-${selectedJob.ticketNumber}.jpg`;
    link.click();
  };

  const handleShare = async () => {
    if (!preview) return;
    try {
      const blob = await fetch(preview).then((r) => r.blob());
      const file = new File([blob], `proof-${selectedJob.ticketNumber}.jpg`, { type: "image/jpeg" });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: "Proof of Delivery",
          text: `Delivery proof for ${selectedJob.customerName}`,
        });
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
        <>
          {/* Fullscreen Preview Modal */}
          {fullscreenPreview && (
            <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md border-b border-white/10">
                <div>
                  <h2 className="text-white font-bold">{selectedJob.ticketNumber}</h2>
                  <p className="text-sm text-gray-300">{selectedJob.customerName}</p>
                </div>
                <button
                  onClick={() => setFullscreenPreview(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X size={24} className="text-white" />
                </button>
              </div>

              {/* Image Container */}
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <img
                  src={fullscreenPreview}
                  alt="Proof"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-3 p-4 bg-black/50 backdrop-blur-md border-t border-white/10">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
                >
                  <Download size={18} />
                  Download
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all"
                >
                  <Share2 size={18} />
                  Share
                </button>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="min-h-screen bg-background space-y-6 p-4 md:p-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-foreground">Proof of Delivery</h1>
              <p className="text-muted-foreground font-medium mt-1">Upload delivery photo or capture signature</p>
            </div>

            {success && (
              <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 shadow-lg">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={24} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-emerald-700 dark:text-emerald-400 font-bold text-base">Proof uploaded successfully!</p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-0.5">Delivery confirmed for {selectedJob.customerName}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Form */}
              <div className="lg:col-span-1 space-y-6">
                {/* Job Selector */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3 sticky top-4">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Delivery Job</p>
                  <div className="relative">
                    <button
                      onClick={() => setOpen(!open)}
                      className="w-full flex items-center justify-between bg-muted hover:bg-muted/70 rounded-xl px-4 py-3 text-left transition-all"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-sm text-foreground">{selectedJob.ticketNumber}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{selectedJob.customerName}</p>
                        <p className="text-xs text-muted-foreground">{selectedJob.deviceType}</p>
                      </div>
                      <ChevronDown size={16} className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-10">
                        {MOCK_JOBS.map((job) => (
                          <button
                            key={job.id}
                            onClick={() => {
                              setSelectedJob(job);
                              setOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3 transition-all border-b border-border last:border-0 ${
                              selectedJob.id === job.id
                                ? "bg-primary/10 border-l-4 border-l-primary"
                                : "hover:bg-muted"
                            }`}
                          >
                            <p className="font-bold text-sm text-foreground">{job.ticketNumber}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{job.customerName}</p>
                            <p className="text-xs text-muted-foreground">{job.deviceType}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Notes (Optional)</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Left with security guard, customer signed, etc."
                    rows={4}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!preview || loading}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-black text-base rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <CheckCircle size={20} />
                      Submit Proof
                    </>
                  )}
                </button>
              </div>

              {/* Right Column - Photo Upload */}
              <div className="lg:col-span-2">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 h-full">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Proof Photo</p>

                  {preview ? (
                    <div className="relative group">
                      <img
                        src={preview}
                        alt="Proof"
                        className="w-full h-96 md:h-[500px] object-cover rounded-xl shadow-lg"
                      />
                      {/* Overlay Actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-center justify-center gap-3">
                        <button
                          onClick={() => setFullscreenPreview(preview)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-3 bg-white/90 hover:bg-white rounded-full shadow-lg"
                        >
                          <ZoomIn size={24} className="text-black" />
                        </button>
                        <button
                          onClick={() => setPreview(null)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-3 bg-white/90 hover:bg-white rounded-full shadow-lg"
                        >
                          <X size={24} className="text-black" />
                        </button>
                      </div>

                      {/* Photo Info */}
                      <div className="mt-4 p-4 bg-muted rounded-xl">
                        <p className="text-xs font-bold text-muted-foreground uppercase">Photo Captured</p>
                        <p className="text-sm font-medium text-foreground mt-1">Ready to submit for {selectedJob.ticketNumber}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="border-3 border-dashed border-border rounded-2xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                      >
                        <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-all">
                          <ImageIcon size={40} className="text-primary" />
                        </div>
                        <p className="font-bold text-lg text-foreground">Upload or Capture Photo</p>
                        <p className="text-base text-muted-foreground mt-2">Tap to choose from gallery or take a new photo</p>
                      </div>

                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleUpload}
                        className="hidden"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            if (fileRef.current) {
                              fileRef.current.removeAttribute("capture");
                              fileRef.current.click();
                            }
                          }}
                          className="flex items-center justify-center gap-2 py-4 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/70 transition-all text-base hover:scale-105 active:scale-95"
                        >
                          <Upload size={20} />
                          Gallery
                        </button>
                        <button
                          onClick={() => {
                            if (fileRef.current) {
                              fileRef.current.setAttribute("capture", "environment");
                              fileRef.current.click();
                            }
                          }}
                          className="flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-base hover:scale-105 active:scale-95"
                        >
                          <Camera size={20} />
                          Camera
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}