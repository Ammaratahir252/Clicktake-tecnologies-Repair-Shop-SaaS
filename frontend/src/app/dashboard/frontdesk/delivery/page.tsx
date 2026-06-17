"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Truck, MapPin, User, Phone, Package,
  CheckCircle, Search, Loader2,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  received:      { label: "Received",      color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  diagnosed:     { label: "Diagnosed",     color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  estimate_sent: { label: "Estimate Sent", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  approved:      { label: "Approved",      color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  in_repair:     { label: "In Repair",     color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ready:         { label: "Ready",         color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  delivered:     { label: "Delivered",     color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  cancelled:     { label: "Cancelled",     color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function FrontdeskDeliveryPage() {
  return (
    <DashboardShell requiredRole="frontdesk">
      {() => <DeliveryContent />}
    </DashboardShell>
  );
}

function DeliveryContent() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.get("/api/tickets");
      setTickets(res.data?.data ?? []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    const name = (t.customerId?.name ?? "").toLowerCase();
    const num = (t.ticketNumber ?? "").toLowerCase();
    const matchSearch = name.includes(q) || num.includes(q);
    if (!matchSearch) return false;
    if (filter === "all") return true;
    return t.status === filter;
  });

  const stats = {
    pending:    tickets.filter((t) => t.status === "received").length,
    inProgress: tickets.filter((t) => t.status === "ready").length,
    delivered:  tickets.filter((t) => t.status === "delivered").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading deliveries…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Delivery Management</h1>
          <p className="text-muted-foreground font-medium mt-0.5">Pickups and deliveries from active tickets</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Awaiting Pickup</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-500">{stats.inProgress}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Ready to Deliver</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-500">{stats.delivered}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Delivered</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by customer or ticket…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "all",       label: "All" },
            { key: "received",  label: "Pickup" },
            { key: "ready",     label: "Ready" },
            { key: "delivered", label: "Delivered" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      <div className="space-y-3">
        {filtered.map((t) => {
          const deviceLabel = `${t.deviceBrand ?? ""} ${t.deviceModel ?? ""}`.trim();
          return (
            <div key={t._id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                    <Truck size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-sm">{t.ticketNumber}</p>
                    <p className="text-xs text-muted-foreground capitalize">{deviceLabel || "Unknown device"}</p>
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <User size={13} className="text-muted-foreground" />
                  <span className="font-semibold text-foreground">{t.customerId?.name ?? "Unknown"}</span>
                </div>
                {t.customerId?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-muted-foreground" />
                    <a href={`tel:${t.customerId.phone}`} className="text-primary font-medium">{t.customerId.phone}</a>
                  </div>
                )}
                {t.customerId?.address && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin size={13} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground text-xs truncate">{t.customerId.address}</span>
                  </div>
                )}
                {deviceLabel && (
                  <div className="flex items-center gap-2">
                    <Package size={13} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{deviceLabel}</span>
                  </div>
                )}
                {t.estimateAmount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600">
                      Rs. {t.estimateAmount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {t.status === "delivered" && (
                <div className="mt-3 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle size={14} />
                  <span className="text-xs font-bold">Delivered</span>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Truck size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="font-bold text-foreground">No tickets found</p>
            <p className="text-sm text-muted-foreground mt-1">Try changing the filter or search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
