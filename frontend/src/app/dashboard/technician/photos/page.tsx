"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef } from "react";
import { Camera, Upload, Trash2, Loader2, CheckCircle, Image as ImageIcon, Search, ChevronDown, Tag } from "lucide-react";

const MOCK_TICKETS = [
  { id: "REP-2026-00451", customer: "Ahmed Khan", device: "iPhone 15 Pro Max" },
  { id: "REP-2026-00448", customer: "Sara Malik", device: "Samsung Galaxy S24" },
  { id: "REP-2026-00453", customer: "Bilal Sheikh", device: "iPad Pro" },
];

const PHOTO_TYPES = [
  { key: "before", label: "Before Repair" },
  { key: "during", label: "During Repair" },
  { key: "after", label: "After Repair" },
  { key: "damage", label: "Damage Evidence" },
  { key: "parts", label: "Parts Used" },
];

type Photo = { id: string; url: string; type: string; label: string };

export default function TechnicianPhotosPage() {
  const [selectedTicket, setSelectedTicket] = useState(MOCK_TICKETS[0]);
  const [photoType, setPhotoType] = useState("before");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(() => {
        setPhotos((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            url: e.target?.result as string,
            type: photoType,
            label: PHOTO_TYPES.find((p) => p.key === photoType)?.label ?? photoType,
          },
        ]);
        setUploading(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }, 800);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  return (
    <DashboardShell requiredRole="technician">
      {(user) => (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black text-foreground">Repair Photos</h1>
            <p className="text-muted-foreground font-medium mt-0.5">Document before, during & after repair</p>
          </div>

          {success && (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
              <CheckCircle size={18} className="text-emerald-600" />
              <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Photo uploaded successfully!</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Upload */}
            <div className="space-y-4">
              {/* Ticket Selector */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ticket</p>
                <div className="relative">
                  <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between bg-muted rounded-xl px-3 py-2.5 text-left"
                  >
                    <div>
                      <p className="font-bold text-sm text-foreground">{selectedTicket.id}</p>
                      <p className="text-xs text-muted-foreground">{selectedTicket.customer}</p>
                    </div>
                    <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10">
                      {MOCK_TICKETS.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => { setSelectedTicket(t); setOpen(false); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0"
                        >
                          <p className="font-bold text-sm text-foreground">{t.id}</p>
                          <p className="text-xs text-muted-foreground">{t.customer} · {t.device}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Type */}
              <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Photo Type</p>
                <div className="space-y-1.5">
                  {PHOTO_TYPES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setPhotoType(key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        photoType === key
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Tag size={13} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Buttons */}
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  className="hidden"
                />
                <button
                  onClick={() => { fileRef.current?.setAttribute("capture", "environment"); fileRef.current?.click(); }}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-60 text-sm"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                  {uploading ? "Uploading…" : "Take Photo"}
                </button>
                <button
                  onClick={() => { fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); }}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/70 transition-all disabled:opacity-60 text-sm"
                >
                  <Upload size={16} />
                  Upload from Gallery
                </button>
              </div>
            </div>

            {/* Right Panel - Photo Gallery */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Photos ({photos.length})
                </p>
              </div>

              {photos.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center">
                  <ImageIcon size={32} className="text-muted-foreground mx-auto mb-3" />
                  <p className="font-bold text-foreground">No photos yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Upload photos to document this repair</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <img
                        src={photo.url}
                        alt={photo.label}
                        className="w-full h-36 object-cover rounded-xl"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl px-2 py-2">
                        <p className="text-white text-xs font-bold">{photo.label}</p>
                      </div>
                      <button
                        onClick={() => removePhoto(photo.id)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex transition-all"
                      >
                        <Trash2 size={12} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
