"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  CreditCard, Banknote, CheckCircle, Loader2, ChevronDown,
  AlertCircle, Wallet, TrendingUp, Clock, User, Phone, Zap,
} from "lucide-react";

const PAYMENT_METHODS = [
  { key: "cash",      label: "Cash",       icon: Banknote,   color: "from-orange-500 to-orange-600" },
  { key: "card",      label: "Card / POS", icon: CreditCard, color: "from-blue-500 to-blue-600"    },
  { key: "easypaisa", label: "EasyPaisa",  icon: Wallet,     color: "from-purple-500 to-purple-600"},
  { key: "jazzcash",  label: "JazzCash",   icon: CreditCard, color: "from-red-500 to-red-600"      },
];

export default function DriverPaymentPage() {
  return (
    <DashboardShell requiredRole="driver">
      {() => <PaymentContent />}
    </DashboardShell>
  );
}

function PaymentContent() {
  const [jobs, setJobs]             = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [method, setMethod]         = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [shake, setShake]           = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await api.get("/api/tickets");
      const all: any[] = res.data?.data ?? [];
      const deliverable = all.filter(
        (t) => t.status === "ready" && t.estimateAmount && t.estimateAmount > 0
      );
      setJobs(deliverable);
      if (deliverable.length > 0) setSelectedJob(deliverable[0]);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleCollect = async () => {
    if (!amountReceived || !selectedJob) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const balance = parseFloat(amountReceived) - (selectedJob.estimateAmount ?? 0);
    if (balance < 0) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/api/tickets/${selectedJob._id}/status`, {
        status: "delivered",
        note: `Payment collected via ${method}`,
      });
      setJobs((prev) => prev.filter((j) => j._id !== selectedJob._id));
      setSuccess(true);
      setAmountReceived("");
      setTimeout(() => {
        setSuccess(false);
        setSelectedJob((prev: any) => {
          const remaining = jobs.filter((j) => j._id !== selectedJob._id);
          return remaining[0] ?? null;
        });
      }, 3000);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  const unpaidJobs = jobs;
  const balance = amountReceived && selectedJob ? parseFloat(amountReceived) - (selectedJob.estimateAmount ?? 0) : null;
  const totalCollected = 0; // we mark as delivered, no payment records

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading deliveries…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
            <Wallet size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground">Collect Payment</h1>
            <p className="text-muted-foreground font-medium">Record payment on delivery</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-2xl border border-emerald-400/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold">Payment recorded successfully!</p>
                <p className="text-emerald-100 text-sm mt-0.5">Ticket marked as delivered.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {unpaidJobs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700/50">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Pending</p>
            </div>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{unpaidJobs.length}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-700/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Total Due</p>
            </div>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              Rs. {unpaidJobs.reduce((s, j) => s + (j.estimateAmount ?? 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {unpaidJobs.length === 0 ? (
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-2 border-emerald-200 dark:border-emerald-700/50 rounded-3xl p-12 text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-white" />
          </div>
          <p className="font-black text-2xl text-emerald-700 dark:text-emerald-400 mb-2">All Payments Collected!</p>
          <p className="text-emerald-600 dark:text-emerald-500 font-medium">No pending deliveries for today.</p>
        </div>
      ) : (
        selectedJob && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-6">
              {/* Invoice Selector */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <User size={16} />
                  Invoice
                </p>
                <div className="relative">
                  <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between bg-gradient-to-r from-muted to-muted/50 hover:from-primary/10 hover:to-primary/5 rounded-xl px-4 py-4 text-left transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-sm text-foreground">{selectedJob.ticketNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">{selectedJob.customerId?.name ?? "Customer"}</p>
                      <p className="text-xs text-muted-foreground">{selectedJob.deviceBrand} {selectedJob.deviceModel}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-black text-lg text-primary bg-primary/10 px-3 py-1 rounded-lg">
                        Rs. {(selectedJob.estimateAmount ?? 0).toLocaleString()}
                      </span>
                      <ChevronDown size={16} className={`text-muted-foreground transition-all ${open ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {open && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-10 overflow-hidden">
                      {unpaidJobs.map((job, idx) => (
                        <button
                          key={job._id}
                          onClick={() => { setSelectedJob(job); setOpen(false); setAmountReceived(""); }}
                          className={`w-full text-left px-4 py-4 hover:bg-primary/5 transition-all flex justify-between items-center ${
                            idx !== unpaidJobs.length - 1 ? "border-b border-border" : ""
                          } ${selectedJob._id === job._id ? "bg-primary/10 border-l-4 border-l-primary" : ""}`}
                        >
                          <div className="flex-1">
                            <p className="font-bold text-sm text-foreground">{job.ticketNumber}</p>
                            <p className="text-xs text-muted-foreground mt-1">{job.customerId?.name ?? "Customer"}</p>
                          </div>
                          <span className="font-black text-primary text-sm ml-2">Rs. {(job.estimateAmount ?? 0).toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-muted/50 rounded-xl flex items-center gap-3 border border-border/50">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">Customer Phone</p>
                    <p className="text-sm font-bold text-foreground truncate">{selectedJob.customerId?.phone ?? "—"}</p>
                  </div>
                </div>

                <div className="mt-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 text-center border border-primary/20">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-2">Amount Due</p>
                  <p className="text-4xl font-black text-primary">Rs. {(selectedJob.estimateAmount ?? 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-card border border-border rounded-2xl p-6 shadow-lg">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => setMethod(key)}
                      className={`relative px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all overflow-hidden ${
                        method === key
                          ? `border-primary bg-gradient-to-br ${color} text-white shadow-lg scale-105`
                          : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Icon size={16} />
                        <span className="hidden sm:inline">{label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2">
              <div className={`bg-card border border-border rounded-2xl p-6 shadow-lg h-full space-y-4 transition-all ${shake ? "animate-pulse" : ""}`}>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Wallet size={16} />
                  Amount Received
                </p>

                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">Rs.</span>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0"
                    className="w-full pl-16 pr-6 py-4 bg-gradient-to-r from-muted to-muted/50 border-2 border-border focus:border-primary rounded-2xl text-foreground font-bold text-3xl placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all"
                  />
                </div>

                {balance !== null && (
                  <div className={`flex items-center justify-between px-5 py-4 rounded-2xl ${
                    balance >= 0
                      ? "bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border border-emerald-200 dark:border-emerald-700/50"
                      : "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-700/50"
                  }`}>
                    <span className={`text-sm font-bold ${balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                      {balance >= 0 ? "💰 Change to Return" : "⚠️ Balance Remaining"}
                    </span>
                    <span className={`text-2xl font-black ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      Rs. {Math.abs(balance).toLocaleString()}
                    </span>
                  </div>

                {balance !== null && balance < 0 && (
                  <div className="flex items-center gap-3 px-5 py-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700/50">
                    <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm font-bold text-red-700 dark:text-red-400">Amount received is less than amount due</p>
                  </div>
                )}

                <button
                  onClick={handleCollect}
                  disabled={!amountReceived || submitting || (balance !== null && balance < 0)}
                  className={`w-full flex items-center justify-center gap-3 py-5 font-black text-base rounded-2xl transition-all ${
                    !amountReceived || submitting || (balance !== null && balance < 0)
                      ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                      : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-2xl hover:scale-105 active:scale-95"
                  }`}
                >
                  {submitting ? (
                    <><Loader2 size={20} className="animate-spin" /><span>Processing…</span></>
                  ) : (
                    <><CheckCircle size={20} /><span>Mark as Paid & Delivered</span></>
                  )}
                </button>

                <div className="mt-2 p-4 bg-muted/50 rounded-xl border border-border/50 text-center">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                    💡 Verify customer ID before collecting payment
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}