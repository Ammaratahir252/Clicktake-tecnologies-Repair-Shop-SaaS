"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import {
  CreditCard, Banknote, CheckCircle, Loader2,
  ChevronDown, AlertCircle, ChevronLeft, Receipt,
  Smartphone, Wallet
} from "lucide-react";

const MOCK_JOBS = [
  {
    id: "J-002",
    ticketNumber: "REP-2026-00448",
    customerName: "Sara Malik",
    customerPhone: "+92 321 9876543",
    deviceType: "Samsung Galaxy S24",
    amount: 12500,
    status: "en_route",
    paid: false,
  },
  {
    id: "J-001",
    ticketNumber: "REP-2026-00451",
    customerName: "Ahmed Khan",
    customerPhone: "+92 300 1234567",
    deviceType: "iPhone 15 Pro Max",
    amount: 28000,
    status: "picked_up",
    paid: false,
  },
];

const PAYMENT_METHODS = [
  { key: "cash",       label: "Cash",       icon: Banknote,    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  { key: "card",       label: "Card / POS", icon: CreditCard,  color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-100 dark:bg-blue-900/30" },
  { key: "easypaisa",  label: "EasyPaisa",  icon: Smartphone,  color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  { key: "jazzcash",   label: "JazzCash",   icon: Wallet,      color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
];

export default function DriverPaymentPage() {
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [selectedJob, setSelectedJob] = useState(MOCK_JOBS[0]);
  const [method, setMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCollect = () => {
    if (!amountReceived) return;
    setLoading(true);
    setTimeout(() => {
      setJobs((prev) => prev.map((j) => j.id === selectedJob.id ? { ...j, paid: true } : j));
      const remainingUnpaid = jobs.filter((j) => !j.paid && j.id !== selectedJob.id);
      if (remainingUnpaid.length > 0) setSelectedJob(remainingUnpaid[0]);
      setLoading(false);
      setSuccess(true);
      setAmountReceived("");
      setTimeout(() => setSuccess(false), 3500);
    }, 1000);
  };

  const unpaidJobs = jobs.filter((j) => !j.paid);
  const paidJobs   = jobs.filter((j) => j.paid);
  const balance    = amountReceived ? parseFloat(amountReceived) - selectedJob.amount : null;

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
        <div className="min-h-screen w-full space-y-5 pb-10 max-w-xl">

          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <a href="/dashboard/driver" className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={18} />
            </a>
            <div>
              <h1 className="text-2xl font-black text-foreground">Collect Payment</h1>
              <p className="text-muted-foreground text-sm font-medium">Record payment on delivery</p>
            </div>
          </div>

          {/* ── Success Toast ────────────────────────────────────── */}
          {success && (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">Payment recorded!</p>
                <p className="text-emerald-600/70 dark:text-emerald-500 text-xs">Transaction saved successfully.</p>
              </div>
            </div>
          )}

          {/* ── All Paid State ───────────────────────────────────── */}
          {unpaidJobs.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-14 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-emerald-500" />
              </div>
              <p className="font-bold text-foreground">All payments collected!</p>
              <p className="text-muted-foreground text-sm mt-1">No pending payments for today.</p>
            </div>
          ) : (
            <>
              {/* ── Invoice Selector ─────────────────────────────── */}
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-muted/40 border-b border-border px-5 py-3 flex items-center gap-2">
                  <Receipt size={14} className="text-muted-foreground" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Invoice</p>
                </div>
                <div className="p-5 space-y-4">
                  {/* Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpen(!open)}
                      className="w-full flex items-center justify-between bg-muted hover:bg-muted/70 border border-border rounded-xl px-4 py-3.5 text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{selectedJob.ticketNumber} — {selectedJob.customerName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{selectedJob.deviceType}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="font-black text-primary text-sm">Rs. {selectedJob.amount.toLocaleString()}</span>
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {open && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-2xl shadow-xl z-20 overflow-hidden">
                        {unpaidJobs.map((job, i) => (
                          <button
                            key={job.id}
                            onClick={() => { setSelectedJob(job); setOpen(false); setAmountReceived(""); }}
                            className={`w-full text-left px-4 py-3.5 hover:bg-muted transition-colors flex justify-between items-center ${
                              i !== unpaidJobs.length - 1 ? "border-b border-border" : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-foreground">{job.ticketNumber} — {job.customerName}</p>
                              <p className="text-xs text-muted-foreground">{job.deviceType}</p>
                            </div>
                            <span className="font-black text-primary text-sm shrink-0 ml-3">Rs. {job.amount.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Amount Due */}
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-2">Amount Due</p>
                    <p className="text-4xl font-black text-primary">Rs. {selectedJob.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-2">{selectedJob.customerName} · {selectedJob.deviceType}</p>
                  </div>
                </div>
              </div>

              {/* ── Payment Method ───────────────────────────────── */}
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-muted/40 border-b border-border px-5 py-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Payment Method</p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {PAYMENT_METHODS.map(({ key, label, icon: Icon, color, bg }) => (
                      <button
                        key={key}
                        onClick={() => setMethod(key)}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                          method === key
                            ? "border-primary bg-primary/5 text-primary shadow-sm"
                            : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-muted"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${method === key ? "bg-primary/10" : bg}`}>
                          <Icon size={14} className={method === key ? "text-primary" : color} />
                        </div>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Amount Received ──────────────────────────────── */}
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-muted/40 border-b border-border px-5 py-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount Received</p>
                </div>
                <div className="p-5 space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">Rs.</span>
                    <input
                      type="number"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      placeholder="0"
                      className="w-full pl-14 pr-4 py-4 bg-muted border border-border rounded-xl text-foreground font-black text-2xl placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>

                  {/* Quick fill buttons */}
                  <div className="flex gap-2">
                    {[selectedJob.amount, selectedJob.amount + 500, selectedJob.amount + 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setAmountReceived(String(amt))}
                        className="flex-1 text-xs font-bold py-2 rounded-xl bg-muted hover:bg-muted/70 text-muted-foreground border border-border transition-colors"
                      >
                        {amt.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {/* Balance */}
                  {balance !== null && (
                    <div className={`flex items-center justify-between px-4 py-3.5 rounded-xl border ${
                      balance >= 0
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                    }`}>
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-wide ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                          {balance >= 0 ? "Change to Return" : "Balance Remaining"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {balance >= 0 ? "Give this amount to customer" : "Customer still owes this amount"}
                        </p>
                      </div>
                      <span className={`text-2xl font-black ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        Rs. {Math.abs(balance).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {balance !== null && balance < 0 && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
                      <AlertCircle size={14} />
                      <span className="text-xs font-medium">Amount received is less than amount due</span>
                    </div>
                  )}

                  <button
                    onClick={handleCollect}
                    disabled={!amountReceived || loading || (balance !== null && balance < 0)}
                    className="w-full flex items-center justify-center gap-2.5 py-4 bg-primary text-primary-foreground font-black text-base rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 shadow-md shadow-primary/20 active:scale-[0.98]"
                  >
                    {loading
                      ? <><Loader2 size={18} className="animate-spin" /> Processing…</>
                      : <><CheckCircle size={18} /> Mark as Paid</>
                    }
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Paid Jobs Summary ────────────────────────────────── */}
          {paidJobs.length > 0 && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-muted/40 border-b border-border px-5 py-3 flex items-center justify-between">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Collected Today</p>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  Rs. {paidJobs.reduce((sum, j) => sum + j.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="divide-y divide-border">
                {paidJobs.map((job) => (
                  <div key={job.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                        <CheckCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{job.customerName}</p>
                        <p className="text-xs text-muted-foreground">{job.ticketNumber}</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      Rs. {job.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </DashboardShell>
  );
}