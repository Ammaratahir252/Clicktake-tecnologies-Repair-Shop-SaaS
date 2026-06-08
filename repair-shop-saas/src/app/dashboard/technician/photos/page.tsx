"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef, useCallback } from "react";
import {
  Camera,
  Upload,
  Trash2,
  Loader2,
  CheckCircle,
  Image as ImageIcon,
  ChevronDown,
  Tag,
  X,
  ZoomIn,
  Grid3x3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOCK_TICKETS = [
  { id: "REP-2026-00451", customer: "Ahmed Khan", device: "iPhone 15 Pro Max" },
  { id: "REP-2026-00448", customer: "Sara Malik", device: "Samsung Galaxy S24" },
  { id: "REP-2026-00453", customer: "Bilal Sheikh", device: "iPad Pro" },
];

const PHOTO_TYPES = [
  { key: "before", label: "Before Repair", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { key: "during", label: "During Repair", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  { key: "after", label: "After Repair", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { key: "damage", label: "Damage Evidence", color: "text-red-500 bg-red-500/10 border-red-500/20" },
  { key: "parts", label: "Parts Used", color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
];

type Photo = { id: string; url: string; type: string; label: string; color: string; uploadedAt: Date };

/** Lightbox overlay */
function Lightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-3xl w-full"
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/60 hover:text-white transition-colors flex items-center gap-1.5 text-sm"
        >
          <X size={16} /> Close
        </button>
        <img
          src={photo.url}
          alt={photo.label}
          className="w-full max-h-[75vh] object-contain rounded-2xl"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${photo.color}`}>
            {photo.label}
          </span>
          <span className="text-xs text-white/40 font-medium">
            {photo.uploadedAt.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TechnicianPhotosPage() {
  const [selectedTicket, setSelectedTicket] = useState(MOCK_TICKETS[0]);
  const [photoType, setPhotoType] = useState("before");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        setTimeout(() => {
          const typeInfo = PHOTO_TYPES.find((p) => p.key === photoType)!;
          setPhotos((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              url: e.target?.result as string,
              type: photoType,
              label: typeInfo.label,
              color: typeInfo.color,
              uploadedAt: new Date(),
            },
          ]);
          setUploading(false);
          setSuccessCount((c) => c + 1);
          setTimeout(() => setSuccessCount((c) => c - 1), 2500);
        }, 600);
      };
      reader.readAsDataURL(file);
    },
    [photoType]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const removePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id));

  const filteredPhotos = activeFilter ? photos.filter((p) => p.type === activeFilter) : photos;
  const typeCounts = PHOTO_TYPES.reduce((acc, t) => {
    acc[t.key] = photos.filter((p) => p.type === t.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardShell requiredRole="technician">
      {() => (
        <>
          {/* Lightbox */}
          <AnimatePresence>
            {lightbox && <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />}
          </AnimatePresence>

          <div className="flex flex-col h-[calc(100dvh-4rem)] w-full max-w-6xl mx-auto overflow-hidden">

            {/* Page Header */}
            <div className="px-6 py-5 flex-shrink-0 border-b border-border/40 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-foreground tracking-tight">Repair Photos</h1>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">
                  Document before, during & after repairs — {photos.length} photo{photos.length !== 1 ? "s" : ""} logged
                </p>
              </div>
              {/* Success toast */}
              <AnimatePresence>
                {successCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-2xl text-sm font-bold"
                  >
                    <CheckCircle size={15} />
                    Photo uploaded!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">

              {/* ── Sidebar ── */}
              <div className="w-64 flex-shrink-0 border-r border-border/40 overflow-y-auto p-4 space-y-5">

                {/* Ticket */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.12em]">Ticket</p>
                  <div className="relative">
                    <button
                      onClick={() => setOpen(!open)}
                      className="w-full flex items-center justify-between bg-muted hover:bg-muted/70 transition-colors rounded-xl px-3 py-2.5 text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{selectedTicket.id}</p>
                        <p className="text-xs text-muted-foreground truncate">{selectedTicket.customer}</p>
                      </div>
                      <ChevronDown
                        size={13}
                        className={`text-muted-foreground transition-transform flex-shrink-0 ml-1 ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-10 overflow-hidden"
                        >
                          {MOCK_TICKETS.map((t, i) => (
                            <button
                              key={t.id}
                              onClick={() => { setSelectedTicket(t); setOpen(false); }}
                              className={`w-full text-left px-3 py-2.5 hover:bg-muted transition-colors ${i < MOCK_TICKETS.length - 1 ? "border-b border-border/50" : ""}`}
                            >
                              <p className="font-bold text-sm text-foreground">{t.id}</p>
                              <p className="text-xs text-muted-foreground">{t.customer} · {t.device}</p>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Photo Type */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.12em]">Photo Type</p>
                  <div className="space-y-1">
                    {PHOTO_TYPES.map(({ key, label, color }) => (
                      <button
                        key={key}
                        onClick={() => setPhotoType(key)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          photoType === key
                            ? `${color} border`
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Tag size={12} />
                          {label}
                        </span>
                        {typeCounts[key] > 0 && (
                          <span className="text-xs bg-foreground/10 rounded-full w-5 h-5 flex items-center justify-center font-black">
                            {typeCounts[key]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Buttons */}
                <div className="space-y-2 pt-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                    className="hidden"
                  />
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { fileRef.current?.setAttribute("capture", "environment"); fileRef.current?.click(); }}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 text-sm shadow-md shadow-primary/25"
                  >
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                    {uploading ? "Uploading…" : "Take Photo"}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); }}
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/70 transition-all disabled:opacity-50 text-sm"
                  >
                    <Upload size={15} />
                    Upload from Gallery
                  </motion.button>
                </div>
              </div>

              {/* ── Main Gallery ── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Filter Tabs */}
                {photos.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveFilter(null)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        !activeFilter
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({photos.length})
                    </button>
                    {PHOTO_TYPES.filter((t) => typeCounts[t.key] > 0).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          activeFilter === key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {label} ({typeCounts[key]})
                      </button>
                    ))}
                  </div>
                )}

                {/* Drag-drop zone (when no photos) */}
                {photos.length === 0 ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => { fileRef.current?.removeAttribute("capture"); fileRef.current?.click(); }}
                    className={`border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all ${
                      dragOver
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <motion.div
                      animate={dragOver ? { y: -4 } : { y: 0 }}
                      className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4"
                    >
                      {dragOver ? (
                        <Upload size={28} className="text-primary" />
                      ) : (
                        <ImageIcon size={28} className="text-muted-foreground" />
                      )}
                    </motion.div>
                    <p className="font-bold text-foreground text-lg mb-1">
                      {dragOver ? "Drop to upload" : "No photos yet"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dragOver ? "Release to add photo" : "Drag & drop images here, or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-3 font-medium">
                      Or use the buttons in the sidebar to take or upload photos
                    </p>
                  </div>
                ) : (
                  /* Photo Grid */
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <AnimatePresence>
                      {dragOver && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="border-2 border-dashed border-primary bg-primary/5 rounded-2xl p-6 text-center mb-4"
                        >
                          <Upload size={20} className="text-primary mx-auto mb-1" />
                          <p className="text-sm font-bold text-primary">Drop to add photo</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <AnimatePresence>
                        {filteredPhotos.map((photo, i) => (
                          <motion.div
                            key={photo.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: i * 0.04 }}
                            className="relative group rounded-2xl overflow-hidden bg-muted aspect-square cursor-pointer"
                            onClick={() => setLightbox(photo)}
                          >
                            <img
                              src={photo.url}
                              alt={photo.label}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                              <ZoomIn
                                size={22}
                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
                              />
                            </div>
                            {/* Label badge */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2.5 py-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${photo.color} bg-opacity-90`}>
                                {photo.label}
                              </span>
                            </div>
                            {/* Delete button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                              className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full hidden group-hover:flex items-center justify-center transition-all shadow-lg hover:bg-red-600"
                            >
                              <Trash2 size={12} className="text-white" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {filteredPhotos.length === 0 && activeFilter && (
                      <div className="text-center py-12">
                        <Grid3x3 size={24} className="text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground font-medium">
                          No {PHOTO_TYPES.find((t) => t.key === activeFilter)?.label} photos yet
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}