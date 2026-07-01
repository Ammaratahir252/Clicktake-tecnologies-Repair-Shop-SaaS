"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useMemo, useCallback } from "react";
import api from "@/lib/api";
import { Search, CheckCircle, Clock, Receipt, Loader2 } from "lucide-react";

const TERMINAL = ["delivered", "cancelled"];

export default function FrontdeskPaymentsPage() {
  return (
    <DashboardShell requiredRole="frontdesk">
      {() => <PaymentsContent />}
    </DashboardShell>
  );
}

function PaymentsContent() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");

  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.get("/api/tickets");
      const all: any[] = res.data?.data ?? [];
      setTickets(all.filter((t) => t.estimateAmount && t.estimateAmount > 0));
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const payments = useMemo(() =>
    tickets.map((t) => ({
      _id:          t._id,
      ticketNumber: t.ticketNumber,
      customerName: t.customerId?.name ?? "Customer",
      device:       `${t.deviceBrand} ${t.deviceModel}`.trim(),
      amount:       t.estimateAmount ?? 0,
      status:       t.status === "delivered" ? "paid" : "pending",
      updatedAt:    t.updatedAt,
    })),
  [tickets]);

  const filtered = useMemo(() =>
    payments.filter((p) => {
      const matchSearch =
        p.customerName.toLowerCase().includes(search.toLowerCase()) ||
        p.ticketNumber.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || p.status === filter;
      return matchSearch && matchFilter;
    }),
  [payments, search, filter]);

  const totalPaid    = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading payments…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Payments</h1>
        <p className="text-muted-foreground font-medium mt-0.5">Payment overview for all tickets</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 text-center">
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">Rs. {totalPaid.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Collected</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
          <p className="text-xl font-black text-amber-600 dark:text-amber-400">Rs. {totalPending.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Pending</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-xl font-black text-foreground">Rs. {(totalPaid + totalPending).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Total</p>
        </div>
      </div>

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
        <div className="flex gap-2">
          {["all", "paid", "pending"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p._id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                p.status === "paid" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              }`}>
                {p.status === "paid" ? (
                  <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{p.customerName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{p.ticketNumber}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{p.device}</span>
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-black text-foreground">Rs. {p.amount.toLocaleString()}</p>
              {p.status === "paid" ? (
                <p className="text-xs text-emerald-600 font-bold mt-0.5">Paid (Delivered)</p>
              ) : (
                <p className="text-xs text-amber-600 font-bold mt-0.5">Pending</p>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Receipt size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="font-bold text-foreground">No payments found</p>
          </div>
        )}
      </div>
    </div>
  );
}
