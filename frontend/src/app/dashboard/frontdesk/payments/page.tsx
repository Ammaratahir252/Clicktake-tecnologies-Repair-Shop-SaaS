"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useMemo, useCallback } from "react";
import api from "@/lib/api";
import { Search, CheckCircle, Clock, Receipt, Loader2, Banknote, CreditCard, Wallet, X } from "lucide-react";

const METHODS = [
  { key: "cash",      label: "Cash",      icon: Banknote },
  { key: "card",      label: "Card",      icon: CreditCard },
  { key: "easypaisa",label: "EasyPaisa",  icon: Wallet },
  { key: "jazzcash",  label: "JazzCash",  icon: Wallet },
];

export default function FrontdeskPaymentsPage() {
  return (
    <DashboardShell requiredRole="frontdesk">
      {() => <PaymentsContent />}
    </DashboardShell>
  );
}

function PaymentsContent() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [method, setMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [ticketsRes, paymentsRes] = await Promise.all([
        api.get("/api/tickets"),
        api.get("/api/payments"),
      ]);
      const all: any[] = ticketsRes.data?.data ?? [];
      setTickets(all.filter((t) => t.estimateAmount && t.estimateAmount > 0));
      setPayments(paymentsRes.data?.data ?? []);
    } catch {
      setTickets([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const paidByTicketId = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of payments) {
      if (p.status === "completed") map.set(String(p.referenceId), p);
    }
    return map;
  }, [payments]);

  const rows = useMemo(() =>
    tickets.map((t) => {
      const payment = paidByTicketId.get(t._id);
      return {
        _id:          t._id,
        ticketNumber: t.ticketNumber,
        customerName: t.customerId?.name ?? "Customer",
        device:       `${t.deviceBrand} ${t.deviceModel}`.trim(),
        amount:       t.estimateAmount ?? 0,
        status:       payment ? "paid" : "pending",
        method:       payment?.gateway,
        updatedAt:    payment?.createdAt ?? t.updatedAt,
      };
    }),
  [tickets, paidByTicketId]);

  const filtered = useMemo(() =>
    rows.filter((p) => {
      const matchSearch =
        p.customerName.toLowerCase().includes(search.toLowerCase()) ||
        p.ticketNumber.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || p.status === filter;
      return matchSearch && matchFilter;
    }),
  [rows, search, filter]);

  const totalPaid    = rows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = rows.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  const handleRecord = async (ticketId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/tickets/${ticketId}/payment`, {
        method,
        amountReceived: amountReceived ? Number(amountReceived) : undefined,
      });
      setRecordingFor(null);
      setAmountReceived("");
      setMethod("cash");
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not record payment — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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

      {error && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-2xl p-4">
          <p className="text-red-700 dark:text-red-400 font-bold text-sm">{error}</p>
        </div>
      )}

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
          <div key={p._id} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
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
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="font-black text-foreground">Rs. {p.amount.toLocaleString()}</p>
                  {p.status === "paid" ? (
                    <p className="text-xs text-emerald-600 font-bold mt-0.5 capitalize">Paid ({p.method})</p>
                  ) : (
                    <p className="text-xs text-amber-600 font-bold mt-0.5">Pending</p>
                  )}
                </div>
                {p.status === "pending" && (
                  <button
                    onClick={() => setRecordingFor(recordingFor === p._id ? null : p._id)}
                    className="px-3 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:opacity-90 transition-all"
                  >
                    Record Payment
                  </button>
                )}
              </div>
            </div>

            {recordingFor === p._id && (
              <div className="pt-3 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Collect Rs. {p.amount.toLocaleString()}</p>
                  <button onClick={() => setRecordingFor(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {METHODS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setMethod(key)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        method === key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Amount received (optional, e.g. for change due)"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={() => handleRecord(p._id)}
                  disabled={submitting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-lg text-sm transition-all"
                >
                  {submitting ? "Recording…" : "Confirm Payment Collected"}
                </button>
              </div>
            )}
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
