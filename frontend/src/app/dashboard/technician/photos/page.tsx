"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Trash2,
  Loader2,
  CheckCircle,
  ImageIcon,
  Search,
  ChevronDown,
  X,
  ZoomIn,
  Download,
  ScanLine,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Filter,
  Images,
  Zap,
} from "lucide-react";

const MOCK_TICKETS = [
  { id: "REP-2026-00451", customer: "Ahmed Khan", device: "iPhone 15 Pro Max", status: "In Progress" },
  { id: "REP-2026-00448", customer: "Sara Malik", device: "Samsung Galaxy S24", status: "Pending" },
  { id: "REP-2026-00453", customer: "Bilal Sheikh", device: "iPad Pro", status: "In Progress" },
  { id: "REP-2026-00449", customer: "Fatima Ali", device: "MacBook Air", status: "Completed" },
];

const PHOTO_TYPES = [
  { key: "before",  label: "Before Repair",    Icon: ScanLine     },
  { key: "during",  label: "During Repair",    Icon: Wrench       },
  { key: "after",   label: "After Repair",     Icon: ShieldCheck  },
  { key: "damage",  label: "Damage Evidence",  Icon: AlertTriangle },
  { key: "parts",   label: "Parts Used",       Icon: Cpu          },
];

type Photo = {
  id: string;
  url: string;
  type: string;
  label: string;
  timestamp: string;
  notes?: string;
};

export default function TechnicianPhotosPage() {
  const [selectedTicket, setSelectedTicket] = useState(MOCK_TICKETS[0]);
  const [photoType, setPhotoType] = useState("before");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewPhoto, setViewPhoto] = useState<Photo | null>(null);
  const [photoNotes, setPhotoNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(() => {
        const newPhoto: Photo = {
          id: Date.now().toString(),
          url: e.target?.result as string,
          type: photoType,
          label: PHOTO_TYPES.find((p) => p.key === photoType)?.label ?? photoType,
          timestamp: new Date().toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          notes: photoNotes || undefined,
        };
        setPhotos((prev) => [newPhoto, ...prev]);
        setUploading(false);
        setSuccess(true);
        setPhotoNotes("");
        setTimeout(() => setSuccess(false), 3000);
      }, 800);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (id: string) => {
    if (confirm("Delete this photo?")) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const downloadPhoto = (photo: Photo) => {
    const link = document.createElement("a");
    link.href = photo.url;
    link.download = `${selectedTicket.id}_${photo.type}_${photo.timestamp}.jpg`;
    link.click();
  };

  const filteredTickets = MOCK_TICKETS.filter(
    (t) =>
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.device.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPhotos = photos.filter(
    (p) => filterType === "all" || p.type === filterType
  );

  const photosByType = PHOTO_TYPES.map((type) => ({
    ...type,
    count: photos.filter((p) => p.type === type.key).length,
  }));

  return (
    <DashboardShell requiredRole="technician">
      {(user) => (
        <div className="space-y-6">

          {/* ── Header ── */}
          <div className="space-y-1 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Images size={22} className="text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-foreground">Repair Photos</h1>
                <p className="text-muted-foreground font-medium mt-0.5">
                  Document before, during &amp; after repair
                </p>
              </div>
            </div>
          </div>

          {/* ── Stats strip ── */}
          <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top duration-700 delay-100">
            <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <Images size={18} className="text-primary" />
                <span className="text-2xl font-black text-primary">{photos.length}</span>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Photos</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {photos.filter((p) => p.type === "after").length}
                </span>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">After Repair</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {photos.filter((p) => p.type === "damage").length}
                </span>
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Damage Docs</p>
            </div>
          </div>

          {/* ── Success Alert ── */}
          {success && (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/30 rounded-2xl p-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
              <div className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle size={18} className="text-white" />
              </div>
              <div>
                <p className="text-emerald-900 dark:text-emerald-100 font-bold text-sm">
                  Photo uploaded successfully
                </p>
                <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
                  Added to {PHOTO_TYPES.find((p) => p.key === photoType)?.label}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ══ LEFT PANEL ══ */}
            <div className="space-y-4 animate-in fade-in slide-in-from-top duration-700 delay-200">

              {/* Ticket Selector */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Filter size={14} className="text-primary" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Ticket</p>
                  <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search tickets…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted-foreground text-foreground"
                  />
                </div>

                <div className="relative">
                  <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between bg-muted border border-border hover:border-primary/50 rounded-xl px-3 py-2.5 text-left transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">{selectedTicket.id}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedTicket.customer} · {selectedTicket.device}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full whitespace-nowrap">
                        {selectedTicket.status}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {open && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto">
                        {filteredTickets.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-muted-foreground text-sm">No tickets found</p>
                          </div>
                        ) : (
                          filteredTickets.map((t) => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setSelectedTicket(t);
                                setOpen(false);
                                setSearchQuery("");
                              }}
                              className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0 group"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                    {t.id}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {t.customer} · {t.device}
                                  </p>
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 bg-muted rounded-full ml-2">
                                  {t.status}
                                </span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Photo Type */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Photo Type</p>
                <div className="space-y-1.5">
                  {PHOTO_TYPES.map(({ key, label, Icon }) => {
                    const count = photos.filter((p) => p.type === key).length;
                    const active = photoType === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setPhotoType(key)}
                        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          active
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={15} />
                          {label}
                        </div>
                        {count > 0 && (
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-full ${
                              active ? "bg-white/20" : "bg-primary/10 text-primary"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Add Notes <span className="normal-case font-medium">(Optional)</span>
                </p>
                <textarea
                  placeholder="Add notes about this photo…"
                  value={photoNotes}
                  onChange={(e) => setPhotoNotes(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary transition-all text-foreground placeholder-muted-foreground"
                  rows={3}
                />
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
                  onClick={() => {
                    fileRef.current?.setAttribute("capture", "environment");
                    fileRef.current?.click();
                  }}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:scale-100 text-sm shadow-md"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                  {uploading ? "Uploading…" : "Take Photo"}
                </button>
                <button
                  onClick={() => {
                    fileRef.current?.removeAttribute("capture");
                    fileRef.current?.click();
                  }}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted/70 hover:scale-[1.02] transition-all disabled:opacity-60 disabled:scale-100 text-sm border border-border"
                >
                  <Upload size={16} />
                  Upload from Gallery
                </button>
              </div>
            </div>

            {/* ══ RIGHT PANEL – Gallery ══ */}
            <div className="lg:col-span-2 space-y-3 animate-in fade-in slide-in-from-top duration-700 delay-300">

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterType === "all"
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All ({photos.length})
                </button>
                {photosByType.map(({ key, label, count, Icon }) => (
                  <button
                    key={key}
                    onClick={() => setFilterType(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      filterType === key
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                    {count > 0 && ` (${count})`}
                  </button>
                ))}
              </div>

              {/* Empty State */}
              {filteredPhotos.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon size={28} className="text-muted-foreground/40" />
                  </div>
                  <p className="font-bold text-foreground text-lg">No photos yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filterType === "all"
                      ? "Upload photos to document this repair"
                      : `No ${PHOTO_TYPES.find((t) => t.key === filterType)?.label} photos`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredPhotos.map((photo) => {
                    const typeInfo = PHOTO_TYPES.find((t) => t.key === photo.type);
                    const TypeIcon = typeInfo?.Icon ?? ImageIcon;
                    return (
                      <div key={photo.id} className="relative group">
                        <div className="relative overflow-hidden rounded-2xl border border-border hover:border-primary transition-all shadow-sm hover:shadow-xl">
                          <img
                            src={photo.url}
                            alt={photo.label}
                            className="w-full h-36 object-cover transition-transform group-hover:scale-110 cursor-pointer"
                            onClick={() => setViewPhoto(photo)}
                          />
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setViewPhoto(photo); }}
                                  className="flex-1 flex items-center justify-center gap-1 bg-white/90 hover:bg-white text-black font-bold text-xs py-1.5 rounded-lg transition-all"
                                >
                                  <ZoomIn size={12} />
                                  View
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); downloadPhoto(photo); }}
                                  className="w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                                  title="Download"
                                >
                                  <Download size={12} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                                  className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                          {/* Type badge */}
                          <div className="absolute top-2 left-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                            <TypeIcon size={14} className="text-white" />
                          </div>
                          {/* Label bar */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-2xl px-2 py-2">
                            <p className="text-white text-xs font-bold">{photo.label}</p>
                            <p className="text-white/70 text-[10px] mt-0.5">{photo.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Gallery footer */}
              {filteredPhotos.length > 0 && (
                <div className="px-4 py-3 bg-muted/30 border border-border rounded-2xl text-xs text-muted-foreground font-medium flex items-center justify-between">
                  <span>
                    {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? "s" : ""} showing
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-card rounded-lg border border-border">
                    <Zap size={12} className="text-primary" />
                    {selectedTicket.id}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Photo Viewer Modal ── */}
          {viewPhoto && (
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in"
              onClick={() => setViewPhoto(null)}
            >
              <div
                className="relative max-w-4xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setViewPhoto(null)}
                  className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
                >
                  <X size={20} className="text-white" />
                </button>
                <img
                  src={viewPhoto.url}
                  alt={viewPhoto.label}
                  className="w-full max-h-[70vh] object-contain rounded-2xl"
                />
                <div className="mt-4 bg-card border border-border rounded-2xl p-4 shadow-xl">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-foreground">{viewPhoto.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{viewPhoto.timestamp}</p>
                      {viewPhoto.notes && (
                        <div className="mt-3 bg-muted p-3 rounded-xl">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                            Notes
                          </p>
                          <p className="text-sm text-foreground">{viewPhoto.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadPhoto(viewPhoto)}
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
                      >
                        <Download size={15} />
                        Download
                      </button>
                      <button
                        onClick={() => { removePhoto(viewPhoto.id); setViewPhoto(null); }}
                        className="px-4 py-2 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 transition-all flex items-center gap-2"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </DashboardShell>
  );
}