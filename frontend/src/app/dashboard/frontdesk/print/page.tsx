"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Printer, Search, FileText, Receipt, Package, Download, Eye, X } from "lucide-react";

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
  const [preview, setPreview] = useState<string | null>(null); // Preview state

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

  const getTicketById = (id: string) => MOCK_TICKETS.find((t) => t.id === id);
  const previewTicket = getTicketById(preview || "");

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
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    printType === key ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  <Icon
                    size={16}
                    className={printType === key ? "text-primary" : "text-muted-foreground"}
                  />
                </div>
                <p className={`font-bold text-sm ${printType === key ? "text-primary" : "text-foreground"}`}>
                  {label}
                </p>
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
                  {/* Preview Button */}
                  <button
                    onClick={() => setPreview(ticket.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground font-bold rounded-lg text-xs hover:bg-muted/70 transition-all"
                  >
                    <Eye size={12} />
                    Preview
                  </button>
                  {/* Print Button */}
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

          {/* Preview Modal */}
          {preview && previewTicket && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {PRINT_TYPES.find((t) => t.key === printType)?.label} Preview
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">{previewTicket.id}</p>
                  </div>
                  <button
                    onClick={() => setPreview(null)}
                    className="p-2 hover:bg-muted rounded-lg transition-all"
                  >
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Modal Body - Preview Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white text-black">
                  <div className="max-w-2xl mx-auto space-y-6">
                    {/* Company Header */}
                    <div className="text-center border-b pb-6">
                      <h1 className="text-2xl font-bold">TechFix</h1>
                      <p className="text-sm text-gray-600">Professional Device Repair Service</p>
                      <p className="text-xs text-gray-500 mt-2">Phone: +92-300-XXXXX | Email: info@techfix.pk</p>
                    </div>

                    {/* Document Type */}
                    <div className="text-center">
                      <h2 className="text-lg font-bold uppercase">
                        {PRINT_TYPES.find((t) => t.key === printType)?.label}
                      </h2>
                    </div>

                    {/* Ticket Details */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-bold text-gray-600 uppercase">Ticket ID</p>
                        <p className="text-lg font-bold mt-1">{previewTicket.id}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-600 uppercase">Status</p>
                        <p className="text-lg font-bold mt-1 capitalize">{previewTicket.status}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs font-bold text-gray-600 uppercase">Customer Name</p>
                        <p className="text-lg font-bold mt-1">{previewTicket.customer}</p>
                      </div>
                    </div>

                    {/* Device Details */}
                    <div className="border-t border-b py-4">
                      <h3 className="font-bold mb-3 text-sm">Device Information</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Device:</span>
                          <span className="font-bold">{previewTicket.device}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Amount:</span>
                          <span className="font-bold">Rs. {previewTicket.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes/Terms */}
                    <div className="text-xs text-gray-600 space-y-2">
                      <p className="font-bold">Terms & Conditions:</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Please keep your ticket safe for reference</li>
                        <li>Device will be held for 30 days only</li>
                        <li>Payment required before handover</li>
                      </ul>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-xs text-gray-500 border-t pt-4">
                      <p>Thank you for choosing TechFix</p>
                      <p>Print Date: {new Date().toLocaleDateString("en-PK")}</p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer - Actions */}
                <div className="flex items-center gap-2 p-6 border-t border-border bg-muted/50">
                  <button
                    onClick={() => setPreview(null)}
                    className="flex-1 px-4 py-2.5 bg-muted text-foreground font-bold rounded-lg hover:bg-muted/70 transition-all text-sm"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handlePrint(previewTicket.id);
                      setPreview(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-all text-sm"
                  >
                    <Printer size={14} />
                    Print Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}