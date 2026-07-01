"use client";

/**
 * CUSTOMER DASHBOARD — /dashboard/customer
 *
 * Per blueprint Section 5.1 Role 6 + Module 11:
 * - Track ONLY their own repair ticket status in real-time
 * - View and approve/decline their own repair estimates digitally
 * - Pay their own invoices online
 * - Access their own repair history and past invoices
 * - Book doorstep pickup/delivery appointments
 * - CANNOT: access other customers' data, view shop internal notes,
 *   modify ticket details
 *
 * Security: All API calls scoped to the logged-in customer's ID only.
 */

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Ticket, CreditCard, Clock, Truck, MapPin,
  ChevronRight, CheckCircle, AlertCircle, Loader2,
  Star, Package, MessageCircle
} from "lucide-react";

// Repair status pipeline per blueprint M2 standard
const STATUS_STEPS = [
  { key: "received",       label: "Received" },
  { key: "diagnosed",      label: "Diagnosed" },
  { key: "estimate_sent",  label: "Estimate Sent" },
  { key: "approved",       label: "Approved" },
  { key: "in_repair",      label: "In Repair" },
  { key: "ready",          label: "Ready" },
  { key: "delivered",      label: "Delivered" },
];

const MODULES = [
  {
    key: "shops",
    icon: Store,
    title: "Find a Shop",
    desc: "Browse repair shops and book a repair",
    href: "/dashboard/customer/shops",
    color: "bg-teal-600",
  },
  {
    key: "book",
    icon: Wrench,
    title: "Book a Repair",
    desc: "Submit a new repair request to a shop",
    href: "/dashboard/customer/shops",
    color: "bg-rose-500",
  },
  {
    key: "track",
    icon: Ticket,
    title: "Track My Repair",
    desc: "See live repair status and updates",
    href: "/dashboard/customer/track",
    color: "bg-blue-600",
  },
  {
    key: "estimates",
    icon: CheckCircle,
    title: "Approve Estimate",
    desc: "Review cost and approve/decline repair",
    href: "/dashboard/customer/estimates",
    color: "bg-emerald-600",
  },
  {
    key: "invoices",
    icon: CreditCard,
    title: "Pay Invoice",
    desc: "View invoice and make payment online",
    href: "/dashboard/customer/invoices",
    color: "bg-purple-600",
  },
  {
    key: "history",
    icon: Clock,
    title: "Repair History",
    desc: "All your past repairs and invoices",
    href: "/dashboard/customer/history",
    color: "bg-amber-500",
  },
  {
    key: "delivery",
    icon: Truck,
    title: "Track Delivery",
    desc: "Live delivery tracking for your device",
    href: "/dashboard/customer/delivery",
    color: "bg-indigo-500",
  },
  {
    key: "chat",
    icon: MessageCircle,
    title: "Chat with Us",
    desc: "Get instant answers from our AI assistant",
    href: "/dashboard/customer/chat",
    color: "bg-violet-600",
  },
  {
    key: "chat",
    icon: MessageCircle,
    title: "Chat with Us",
    desc: "Get instant answers from our AI assistant",
    href: "/dashboard/customer/chat",
    color: "bg-violet-600",
  },
];

function StatusTracker({ status }: { status: string }) {
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex items-center min-w-max gap-0">
        {STATUS_STEPS.map((step, i) => {
          const isDone    = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all
                    ${isDone    ? "bg-primary text-primary-foreground"
                    : isCurrent ? "bg-primary/20 text-primary ring-2 ring-primary"
                    : "bg-muted text-muted-foreground"}`}
                >
                  {isDone ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span
                  className={`text-[10px] font-bold whitespace-nowrap
                    ${isDone ? "text-primary" : isCurrent ? "text-primary" : "text-muted-foreground"}`}
                >
                  {step.label}
                </span>
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className={`w-8 h-1 mb-4 mx-1 rounded transition-all
                    ${isDone ? "bg-primary" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  return (
    <DashboardShell requiredRole="customer">
      {(user) => <CustomerContent user={user} />}
    </DashboardShell>
  );
}

function CustomerContent({ user }: { user: any }) {
  const [tickets, setTickets]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    api.get("/api/tickets")
      .then((res) => {
        const data = res.data?.data;
        setTickets(Array.isArray(data) ? data : [data].filter(Boolean));
      })
      .catch((err) => setError(err.response?.data?.message || "Could not load your repairs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">

      {/* ── Module Cards ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
          My Portal
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <p className="font-bold text-card-foreground text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />
            </a>
          ))}
        </div>
      </section>

      {/* ── Live Repair Status ────────────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={17} className="text-primary" />
            <h2 className="font-bold text-card-foreground">My Active Repairs</h2>
          </div>
          <span className="text-xs bg-primary/10 text-primary font-bold border border-primary/20 px-3 py-1 rounded-full">
            Live Status
          </span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="animate-spin w-5 h-5" />
            <span className="text-sm">Loading your repairs...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 m-4 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <AlertCircle size={16} className="text-destructive" />
            <p className="text-sm font-semibold text-destructive">{error}</p>
          </div>
        )}

        {!loading && !error && tickets.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="mx-auto text-muted-foreground/30 w-10 h-10 mb-3" />
            <p className="text-muted-foreground font-semibold text-sm">No active repairs found.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
            <a href="/dashboard/customer/shops" className="text-primary hover:underline font-semibold">Find a shop</a>
            {" "}and book your first repair.
          </p>
          </div>
        )}

        {!loading && !error && tickets.length > 0 && (
          <div className="divide-y divide-border">
            {tickets.map((t, i) => (
              <div key={t._id ?? t.id ?? i} className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-black text-card-foreground text-sm">
                      {t.ticketNumber ?? `Ticket #${i + 1}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.deviceBrand} {t.deviceModel} — {t.issue}
                    </p>
                  </div>
                  <a
                    href={`/dashboard/customer/track?ticket=${t._id ?? t.id}`}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    View Details <ChevronRight size={12} />
                  </a>
                </div>
                <StatusTracker status={t.status ?? "received"} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Feedback Prompt ───────────────────────────────────────────── */}
      <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Star size={18} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-foreground">Had a repair recently?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Leave a review and help us improve our service.</p>
          </div>
        </div>
        <a
          href="/dashboard/customer/review"
          className="text-xs font-black bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl transition-colors"
        >
          Leave Review
        </a>
      </div>

    </div>
  );
}
