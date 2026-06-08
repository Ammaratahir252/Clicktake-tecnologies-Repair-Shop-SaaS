"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { CreditCard, Banknote, CheckCircle, Loader2, ChevronDown, AlertCircle } from "lucide-react";

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
  { key: "cash", label: "Cash", icon: Banknote },
  { key: "card", label: "Card / POS", icon: CreditCard },
  { key: "easypaisa", label: "EasyPaisa", icon: CreditCard },
  { key: "jazzcash", label: "JazzCash", icon: CreditCard },
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
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setAmountReceived("");
    }, 1000);
  };

  const unpaidJobs = jobs.filter((j) => !j.paid);
  const balance = amountReceived ? parseFloat(amountReceived) - selectedJob.amount : null;

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
        <div className="space-y-6 max-w-lg">
          <div>
            <h1 className="text-2xl font-black text-foreground">Collect Payment</h1>
            <p className="text-muted-foreground font-medium mt-0.5">Record payment on delivery</p>
          </div>

          {success && (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
              <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
              <p className="text-emerald-700 dark:text-emerald-400 font-bold">Payment recorded successfully!</p>
            </div>
          )}

          {unpaidJobs.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
              <p className="font-bold text-foreground">All payments collected</p>
              <p className="text-muted-foreground text-sm">No pending payments for today.</p>
            </div>
          ) : (
            <>
              {/* Select Invoice */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Invoice</p>
                <div className="relative">
                  <button
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-center justify-between bg-muted rounded-xl px-4 py-3 text-left"
                  >
                    <div>
                      <p className="font-bold text-sm text-foreground">{selectedJob.ticketNumber} — {selectedJob.customerName}</p>
                      <p className="text-xs text-muted-foreground">{selectedJob.deviceType}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-primary">Rs. {selectedJob.amount.toLocaleString()}</span>
                      <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {open && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10">
                      {unpaidJobs.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => { setSelectedJob(job); setOpen(false); setAmountReceived(""); }}
                          className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-sm text-foreground">{job.ticketNumber} — {job.customerName}</p>
                            <p className="text-xs text-muted-foreground">{job.deviceType}</p>
                          </div>
                          <span className="font-black text-primary text-sm">Rs. {job.amount.toLocaleString()}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Amount Due */}
                <div className="bg-primary/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-1">Amount Due</p>
                  <p className="text-3xl font-black text-primary">Rs. {selectedJob.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setMethod(key)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                        method === key
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Received */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Amount Received</p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">Rs.</span>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0"
                    className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground font-bold text-lg placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {balance !== null && (
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl ${balance >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                    <span className="text-sm font-bold text-muted-foreground">
                      {balance >= 0 ? "Change to Return" : "Balance Remaining"}
                    </span>
                    <span className={`text-lg font-black ${balance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      Rs. {Math.abs(balance).toLocaleString()}
                    </span>
                  </div>
                )}

                <button
                  onClick={handleCollect}
                  disabled={!amountReceived || loading || (balance !== null && balance < 0)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-black text-base rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {loading ? "Processing…" : "Mark as Paid"}
                </button>

                {balance !== null && balance < 0 && (
                  <p className="flex items-center gap-2 text-sm text-red-500 font-medium">
                    <AlertCircle size={14} />
                    Amount received is less than amount due
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
