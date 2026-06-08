"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Printer, Search, FileText, Receipt, Package, Download, Eye } from "lucide-react";

const PRINT_TYPES = [
  { key: "invoice", label: "Invoice", icon: Receipt, description: "Full invoice with payment details" },
  { key: "job_card", label: "Job Card", icon: FileText, description: "Repair job card for workshop" },
  { key: "delivery_slip", label: "Delivery Slip", icon: Package, description: "Customer delivery receipt" },
];

const MOCK_TICKETS = [
  { id: "REP-2026-00451", customer: "Ahmed Khan", device: "iPhone 15 Pro Max", amount: 28000, status: "ready" },
  { id: "REP-2026-00448", customer: "Sara Malik", device: "Samsung Galaxy S24", amount: 12500, status: "delivered" },
  { id: "REP-2026-00439", customer: "Usman Raza", device: 'MacBook Pro 14"', amount: 45000, status: "delivered" },
  { id: "REP-2026-00453", customer: "Bilal Sheikh", device: "iPad Pro", amount: 8500, status: "in_progress" },
  { id: "REP-2026-00455", customer: "Fatima Noor", device: "Dell Laptop", amount: 18000, status: "diagnosed" },
];

export default function FrontdeskPrintPage() {
  const [search, setSearch] = useState("");
  const [printType, setPrintType] = useState("invoice");
  const [printing, setPrinting] = useState<string | null>(null);

  const filtered = MOCK_TICKETS.filter(
    (t) =>
      t.customer.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase())
  );

  const handlePrint = (ticketId: string) => {
    setPrinting(ticketId);
    setTimeout(() => {
      setPrinting(null);
      window.print();
    }, 800);
  };

  return (
    <DashboardShell requiredRole="frontdesk">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-black text-foreground">Print Documents</h1>
            <p className="text-muted-foreground font-medium mt-0.5">Print invoices, job cards & delivery slips</p>
          </div>

          {/* Print Type Selector */}
          <div className="grid grid-cols-3 gap-3">
            {PRINT_TYPES.map(({ key, label, icon: Icon, description }) => (
              <button
                key={key}
                onClick={() => setPrintType(key)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  printType === key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                  printType === key ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Icon size={16} className={printType === key ? "text-primary" : "text-muted-foreground"} />
                </div>
                <p className={`font-bold text-sm ${printType === key ? "text-primary" : "text-foreground"}`}>{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ticket or customer name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
            />
          </div>

          {/* Ticket List */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Select ticket to print {PRINT_TYPES.find((t) => t.key === printType)?.label}
            </p>
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
                    <FileText size={15} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{ticket.customer}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{ticket.id}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{ticket.device}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-bold text-primary">Rs. {ticket.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground font-bold rounded-lg text-xs hover:bg-muted/70 transition-all">
                    <Eye size={12} />
                    Preview
                  </button>
                  <button
                    onClick={() => handlePrint(ticket.id)}
                    disabled={printing === ticket.id}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:opacity-90 transition-all disabled:opacity-60"
                  >
                    {printing === ticket.id ? (
                      <span className="animate-pulse">…</span>
                    ) : (
                      <>
                        <Printer size={12} />
                        Print
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-10 text-center">
                <Printer size={32} className="text-muted-foreground mx-auto mb-2" />
                <p className="font-bold text-foreground">No tickets found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
