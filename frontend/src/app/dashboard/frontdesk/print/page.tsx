"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Printer, Search, FileText, Receipt, Package, Eye, X, Loader2 } from "lucide-react";

const PRINT_TYPES = [
  { key: "invoice",       label: "Invoice",       icon: Receipt,   description: "Full invoice with payment details" },
  { key: "job_card",      label: "Job Card",      icon: FileText,  description: "Repair job card for workshop" },
  { key: "delivery_slip", label: "Delivery Slip", icon: Package,   description: "Customer delivery receipt" },
];

export default function FrontdeskPrintPage() {
  return (
    <DashboardShell requiredRole="frontdesk">
      {() => <PrintContent />}
    </DashboardShell>
  );
}

function PrintContent() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopName, setShopName] = useState("Repair Shop");
  const [search, setSearch] = useState("");
  const [printType, setPrintType] = useState("invoice");
  const [printing, setPrinting] = useState<string | null>(null);
  const [preview, setPreview] = useState<any | null>(null);

  useEffect(() => {
    api.get("/api/shop/profile").then((res) => {
      if (res.data?.data?.name) setShopName(res.data.data.name);
    }).catch(() => {});
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.get("/api/tickets");
      setTickets(res.data?.data ?? []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    return (
      (t.customerId?.name ?? "").toLowerCase().includes(q) ||
      (t.ticketNumber ?? "").toLowerCase().includes(q)
    );
  });

  const handlePrint = (ticket: any) => {
    setPrinting(ticket._id);
    setTimeout(() => {
      setPrinting(null);
      window.print();
    }, 800);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading tickets…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Print Documents</h1>
        <p className="text-muted-foreground font-medium mt-0.5">Print invoices, job cards &amp; delivery slips</p>
      </div>

      {/* Print Type Selector */}
      <div className="grid grid-cols-3 gap-3">
        {PRINT_TYPES.map(({ key, label, icon: Icon, description }) => (
          <button
            key={key}
            onClick={() => setPrintType(key)}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              printType === key ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${printType === key ? "bg-primary/10" : "bg-muted"}`}>
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
        {filtered.map((ticket) => {
          const deviceLabel = `${ticket.deviceBrand ?? ""} ${ticket.deviceModel ?? ""}`.trim();
          return (
            <div
              key={ticket._id}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
                  <FileText size={15} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{ticket.customerId?.name ?? "Unknown"}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{ticket.ticketNumber}</span>
                    {deviceLabel && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{deviceLabel}</span>
                      </>
                    )}
                    {ticket.estimateAmount > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs font-bold text-primary">Rs. {ticket.estimateAmount.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setPreview(ticket)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-muted text-foreground font-bold rounded-lg text-xs hover:bg-muted/70 transition-all"
                >
                  <Eye size={12} />
                  Preview
                </button>
                <button
                  onClick={() => handlePrint(ticket)}
                  disabled={printing === ticket._id}
                  className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:opacity-90 transition-all disabled:opacity-60"
                >
                  {printing === ticket._id ? (
                    <span className="animate-pulse">…</span>
                  ) : (
                    <><Printer size={12} />Print</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-10 text-center">
            <Printer size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="font-bold text-foreground">No tickets found</p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {PRINT_TYPES.find((t) => t.key === printType)?.label} Preview
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{preview.ticketNumber}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 hover:bg-muted rounded-lg transition-all">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white text-black">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center border-b pb-6">
                  <h1 className="text-2xl font-bold">{shopName}</h1>
                  <p className="text-sm text-gray-600">Professional Device Repair Service</p>
                </div>

                <div className="text-center">
                  <h2 className="text-lg font-bold uppercase">
                    {PRINT_TYPES.find((t) => t.key === printType)?.label}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase">Ticket ID</p>
                    <p className="text-lg font-bold mt-1">{preview.ticketNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase">Status</p>
                    <p className="text-lg font-bold mt-1 capitalize">{(preview.status ?? "").replace("_", " ")}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-600 uppercase">Customer Name</p>
                    <p className="text-lg font-bold mt-1">{preview.customerId?.name ?? "Unknown"}</p>
                  </div>
                  {preview.customerId?.phone && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase">Phone</p>
                      <p className="text-base font-medium mt-1">{preview.customerId.phone}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-b py-4">
                  <h3 className="font-bold mb-3 text-sm">Device Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Device:</span>
                      <span className="font-bold">
                        {`${preview.deviceBrand ?? ""} ${preview.deviceModel ?? ""}`.trim() || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Issue:</span>
                      <span className="font-bold">{preview.issue || "—"}</span>
                    </div>
                    {preview.estimateAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold">Rs. {preview.estimateAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-2">
                  <p className="font-bold">Terms &amp; Conditions:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Please keep your ticket safe for reference</li>
                    <li>Device will be held for 30 days only</li>
                    <li>Payment required before handover</li>
                  </ul>
                </div>

                <div className="text-center text-xs text-gray-500 border-t pt-4">
                  <p>Thank you for choosing {shopName}</p>
                  <p>Print Date: {new Date().toLocaleDateString("en-PK")}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-6 border-t border-border bg-muted/50">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 px-4 py-2.5 bg-muted text-foreground font-bold rounded-lg hover:bg-muted/70 transition-all text-sm"
              >
                Close
              </button>
              <button
                onClick={() => { handlePrint(preview); setPreview(null); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-all text-sm"
              >
                <Printer size={14} />
                Print Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {PRINT_TYPES.find((t) => t.key === printType)?.label} Preview
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{preview.ticketNumber}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-2 hover:bg-muted rounded-lg transition-all">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white text-black">
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center border-b pb-6">
                  <h1 className="text-2xl font-bold">{shopName}</h1>
                  <p className="text-sm text-gray-600">Professional Device Repair Service</p>
                </div>

                <div className="text-center">
                  <h2 className="text-lg font-bold uppercase">
                    {PRINT_TYPES.find((t) => t.key === printType)?.label}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase">Ticket ID</p>
                    <p className="text-lg font-bold mt-1">{preview.ticketNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-600 uppercase">Status</p>
                    <p className="text-lg font-bold mt-1 capitalize">{(preview.status ?? "").replace("_", " ")}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-bold text-gray-600 uppercase">Customer Name</p>
                    <p className="text-lg font-bold mt-1">{preview.customerId?.name ?? "Unknown"}</p>
                  </div>
                  {preview.customerId?.phone && (
                    <div>
                      <p className="text-xs font-bold text-gray-600 uppercase">Phone</p>
                      <p className="text-base font-medium mt-1">{preview.customerId.phone}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-b py-4">
                  <h3 className="font-bold mb-3 text-sm">Device Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Device:</span>
                      <span className="font-bold">
                        {`${preview.deviceBrand ?? ""} ${preview.deviceModel ?? ""}`.trim() || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Issue:</span>
                      <span className="font-bold">{preview.issue || "—"}</span>
                    </div>
                    {preview.estimateAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-bold">Rs. {preview.estimateAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-2">
                  <p className="font-bold">Terms &amp; Conditions:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Please keep your ticket safe for reference</li>
                    <li>Device will be held for 30 days only</li>
                    <li>Payment required before handover</li>
                  </ul>
                </div>

                <div className="text-center text-xs text-gray-500 border-t pt-4">
                  <p>Thank you for choosing {shopName}</p>
                  <p>Print Date: {new Date().toLocaleDateString("en-PK")}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-6 border-t border-border bg-muted/50">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 px-4 py-2.5 bg-muted text-foreground font-bold rounded-lg hover:bg-muted/70 transition-all text-sm"
              >
                Close
              </button>
              <button
                onClick={() => { handlePrint(preview); setPreview(null); }}
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
  );
}
