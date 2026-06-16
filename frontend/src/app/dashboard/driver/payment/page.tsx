"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import {
  CreditCard,
  Banknote,
  CheckCircle,
  Loader2,
  ChevronDown,
  AlertCircle,
  Wallet,
  TrendingUp,
  Clock,
  User,
  Phone,
  Zap,
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
  { key: "cash", label: "Cash", icon: Banknote, color: "from-orange-500 to-orange-600" },
  { key: "card", label: "Card / POS", icon: CreditCard, color: "from-blue-500 to-blue-600" },
  { key: "easypaisa", label: "EasyPaisa", icon: Wallet, color: "from-purple-500 to-purple-600" },
  { key: "jazzcash", label: "JazzCash", icon: CreditCard, color: "from-red-500 to-red-600" },
];

export default function DriverPaymentPage() {
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [selectedJob, setSelectedJob] = useState(MOCK_JOBS[0]);
  const [method, setMethod] = useState("cash");
  const [amountReceived, setAmountReceived] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);

  const handleCollect = () => {
    if (!amountReceived) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    const balance = parseFloat(amountReceived) - selectedJob.amount;
    if (balance < 0) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) => (j.id === selectedJob.id ? { ...j, paid: true } : j))
      );
      setLoading(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
      setAmountReceived("");
    }, 1500);
  };

  const unpaidJobs = jobs.filter((j) => !j.paid);
  const balance = amountReceived ? parseFloat(amountReceived) - selectedJob.amount : null;
  const totalCollected = jobs.filter((j) => j.paid).reduce((sum, j) => sum + j.amount, 0);

  return (
    <DashboardShell requiredRole="driver">
      {(user) => (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 space-y-6 p-4 md:p-6">
          {/* Animated Header */}
          <div className="space-y-2 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
                <Wallet size={24} className="text-white animate-bounce" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-foreground">Collect Payment</h1>
                <p className="text-muted-foreground font-medium">Record payment on delivery</p>
              </div>
            </div>
          </div>

          {/* Success Message - Enhanced */}
          {success && (
            <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 animate-in fade-in slide-in-from-top duration-300 z-50">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-4 shadow-2xl backdrop-blur-lg border border-emerald-400/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                    <CheckCircle size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold">Payment recorded successfully!</p>
                    <p className="text-emerald-100 text-sm mt-0.5">Amount: Rs. {selectedJob.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          {unpaidJobs.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 animate-in fade-in slide-in-from-top duration-700 delay-100">
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
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">Collected</p>
                </div>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">Rs. {totalCollected.toLocaleString()}</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200 dark:border-purple-700/50 col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={16} className="text-purple-600 dark:text-purple-400" />
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase">Target</p>
                </div>
                <p className="text-2xl font-black text-purple-700 dark:text-purple-300">
                  {unpaidJobs.length === 0 ? "100%" : `${Math.round((totalCollected / (totalCollected + unpaidJobs.reduce((sum, j) => sum + j.amount, 0))) * 100)}%`}
                </p>
              </div>
            </div>
          )}

          {unpaidJobs.length === 0 ? (
            <div className="animate-in fade-in duration-500">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-2 border-emerald-200 dark:border-emerald-700/50 rounded-3xl p-12 text-center">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
                  <CheckCircle size={40} className="text-white" />
                </div>
                <p className="font-black text-2xl text-emerald-700 dark:text-emerald-400 mb-2">All Payments Collected!</p>
                <p className="text-emerald-600 dark:text-emerald-500 font-medium">Great work! No pending payments for today.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Job & Methods */}
              <div className="lg:col-span-1 space-y-6 animate-in fade-in slide-in-from-left duration-500">
                {/* Select Invoice */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm bg-opacity-90">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User size={16} />
                    Invoice
                  </p>
                  <div className="relative">
                    <button
                      onClick={() => setOpen(!open)}
                      className="w-full flex items-center justify-between bg-gradient-to-r from-muted to-muted/50 hover:from-primary/10 hover:to-primary/5 rounded-xl px-4 py-4 text-left transition-all duration-300 group"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {selectedJob.ticketNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{selectedJob.customerName}</p>
                        <p className="text-xs text-muted-foreground">{selectedJob.deviceType}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-black text-lg text-primary bg-primary/10 px-3 py-1 rounded-lg">
                          Rs. {selectedJob.amount.toLocaleString()}
                        </span>
                        <ChevronDown
                          size={16}
                          className={`text-muted-foreground transition-all duration-300 ${open ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>

                    {/* Dropdown */}
                    {open && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        {unpaidJobs.map((job, idx) => (
                          <button
                            key={job.id}
                            onClick={() => {
                              setSelectedJob(job);
                              setOpen(false);
                              setAmountReceived("");
                            }}
                            className={`w-full text-left px-4 py-4 hover:bg-primary/5 transition-all duration-200 flex justify-between items-center group ${
                              idx !== unpaidJobs.length - 1 ? "border-b border-border" : ""
                            } ${selectedJob.id === job.id ? "bg-primary/10 border-l-4 border-l-primary" : ""}`}
                          >
                            <div className="flex-1">
                              <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {job.ticketNumber}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{job.customerName}</p>
                              <p className="text-xs text-muted-foreground">{job.deviceType}</p>
                            </div>
                            <span className="font-black text-primary text-sm ml-2">Rs. {job.amount.toLocaleString()}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Customer Contact */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-xl flex items-center gap-3 border border-border/50">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone size={14} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">Customer Phone</p>
                      <p className="text-sm font-bold text-foreground truncate">{selectedJob.customerPhone}</p>
                    </div>
                  </div>

                  {/* Amount Due - Animated */}
                  <div className="mt-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 text-center border border-primary/20 hover:border-primary/50 transition-all duration-300">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide mb-2">Amount Due</p>
                    <p className="text-4xl font-black text-primary animate-pulse">
                      Rs. {selectedJob.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Payment Method - Enhanced */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm bg-opacity-90">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Payment Method</p>
                  <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map(({ key, label, icon: Icon, color }) => (
                      <button
                        key={key}
                        onClick={() => setMethod(key)}
                        className={`relative group px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all duration-300 overflow-hidden ${
                          method === key
                            ? `border-primary bg-gradient-to-br ${color} text-white shadow-lg scale-105`
                            : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:scale-102"
                        }`}
                      >
                        {method === key && (
                          <div className="absolute inset-0 bg-white/20 animate-pulse" />
                        )}
                        <div className="relative flex items-center justify-center gap-2">
                          <Icon size={16} />
                          <span className="hidden sm:inline">{label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Payment Input */}
              <div className="lg:col-span-2 animate-in fade-in slide-in-from-right duration-500">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm bg-opacity-90 h-full">
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Wallet size={16} />
                    Amount Received
                  </p>

                  {/* Input Section */}
                  <div className={`space-y-4 transition-all duration-300 ${shake ? "animate-shake" : ""}`}>
                    <div className="relative group">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg group-focus-within:text-primary transition-colors">
                        Rs.
                      </span>
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        placeholder="0"
                        className="w-full pl-16 pr-6 py-4 bg-gradient-to-r from-muted to-muted/50 border-2 border-border group-focus-within:border-primary rounded-2xl text-foreground font-bold text-3xl placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all duration-300"
                      />
                    </div>

                    {/* Balance Display - Animated */}
                    {balance !== null && (
                      <div
                        className={`flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 animate-in fade-in ${
                          balance >= 0
                            ? "bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border border-emerald-200 dark:border-emerald-700/50"
                            : "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border border-red-200 dark:border-red-700/50"
                        }`}
                      >
                        <span
                          className={`text-sm font-bold ${
                            balance >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                          }`}
                        >
                          {balance >= 0 ? "💰 Change to Return" : "⚠️ Balance Remaining"}
                        </span>
                        <span
                          className={`text-2xl font-black ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          Rs. {Math.abs(balance).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Error Message */}
                    {balance !== null && balance < 0 && (
                      <div className="flex items-center gap-3 px-5 py-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700/50 animate-in slide-in-from-bottom">
                        <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                        <p className="text-sm font-bold text-red-700 dark:text-red-400">
                          Amount received is less than amount due
                        </p>
                      </div>
                    )}

                    {/* Submit Button - Enhanced */}
                    <button
                      onClick={handleCollect}
                      disabled={!amountReceived || loading || (balance !== null && balance < 0)}
                      className={`w-full flex items-center justify-center gap-3 py-5 font-black text-base rounded-2xl transition-all duration-300 transform ${
                        !amountReceived || loading || (balance !== null && balance < 0)
                          ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                          : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-2xl hover:scale-105 active:scale-95"
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Processing Payment…</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          <span>Mark as Paid</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border/50 text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      💡 Tip: Verify customer ID before collecting payment
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CSS for Shake Animation */}
          <style jsx>{`
            @keyframes shake {
              0%,
              100% {
                transform: translateX(0);
              }
              25% {
                transform: translateX(-10px);
              }
              75% {
                transform: translateX(10px);
              }
            }
            .animate-shake {
              animation: shake 0.5s ease-in-out;
            }
          `}</style>
        </div>
      )}
    </DashboardShell>
  );
}