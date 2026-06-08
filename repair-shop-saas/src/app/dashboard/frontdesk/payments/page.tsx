"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Search, CreditCard, Banknote, CheckCircle, Clock, AlertCircle, TrendingUp, Receipt } from "lucide-react";

const MOCK_PAYMENTS = [
  {
    id: "PAY-001",
    ticketNumber: "REP-2026-00448",
    customerName: "Sara Malik",
    device: "Samsung Galaxy S24",
    amount: 12500,
    method: "cash",
    status: "paid",
    paidAt: "2026-06-06T11:30:00",
  },
  {
    id: "PAY-002",
    ticketNumber: "REP-2026-00439",
    customerName: "Usman Raza",
    device: "MacBook Pro 14\"",
    amount: 45000,
    method: "card",
    status: "paid",
    paidAt: "2026-06-06T09:15:00",
  },
  {
    id: "PAY-003",
    ticketNumber: "REP-2026-00451",
    customerName: "Ahmed Khan",
    device: "iPhone 15 Pro Max",
    amount: 28000,
    method: null,
    status: "pending",
    paidAt: null,
  },
  {
    id: "PAY-004",
    ticketNumber: "REP-2026-00453",
    customerName: "Bilal Sheikh",
    device: "iPad Pro",
    amount: 8500,
    method: "easypaisa",
    status: "paid",
    paidAt: "2026-06-05T16:45:00",
  },
  {
    id: "PAY-005",
    ticketNumber: "REP-2026-00455",
    customerName: "Fatima Noor",
    device: "Dell Laptop",
    amount: 18000,
    method: null,
    status: "pending",
    paidAt: null,
  },
];

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card / POS",
  easypaisa: "EasyPaisa",
  jazzcash: "JazzCash",
};

export default function FrontdeskPaymentsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = MOCK_PAYMENTS.filter((p) => {
    const matchSearch =
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      p.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  const totalPaid = MOCK_PAYMENTS.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = MOCK_PAYMENTS.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <DashboardShell requiredRole="frontdesk">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-black text-foreground">Payments</h1>
            <p className="text-muted-foreground font-medium mt-0.5">Today's payment overview</p>
          </div>

          {/* Stats */}
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

          {/* Search & Filter */}
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

          {/* Payment List */}
          <div className="space-y-2">
            {filtered.map((p) => (
              <div key={p.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
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
                    <p className="text-xs text-emerald-600 font-bold mt-0.5">
                      {METHOD_LABELS[p.method!]} · {new Date(p.paidAt!).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  ) : (
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <button className="text-xs font-bold text-primary hover:underline">Collect</button>
                    </div>
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
      )}
    </DashboardShell>
  );
}
