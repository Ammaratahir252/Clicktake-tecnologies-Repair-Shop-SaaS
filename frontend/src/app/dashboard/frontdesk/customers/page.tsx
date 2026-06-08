"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Search, User, Phone, Mail, Ticket, Clock, ChevronRight, Plus } from "lucide-react";

const MOCK_CUSTOMERS = [
  {
    id: "C-001",
    name: "Ahmed Khan",
    phone: "+92 300 1234567",
    email: "ahmed@example.com",
    totalTickets: 5,
    lastVisit: "2026-06-04",
    activeTickets: 2,
  },
  {
    id: "C-002",
    name: "Sara Malik",
    phone: "+92 321 9876543",
    email: "sara@example.com",
    totalTickets: 2,
    lastVisit: "2026-06-05",
    activeTickets: 1,
  },
  {
    id: "C-003",
    name: "Usman Raza",
    phone: "+92 333 5556677",
    email: "usman@example.com",
    totalTickets: 8,
    lastVisit: "2026-05-30",
    activeTickets: 0,
  },
  {
    id: "C-004",
    name: "Fatima Noor",
    phone: "+92 311 2223344",
    email: "fatima@example.com",
    totalTickets: 1,
    lastVisit: "2026-06-01",
    activeTickets: 1,
  },
  {
    id: "C-005",
    name: "Bilal Sheikh",
    phone: "+92 345 7778899",
    email: "bilal@example.com",
    totalTickets: 3,
    lastVisit: "2026-05-28",
    activeTickets: 0,
  },
];

export default function FrontdeskCustomersPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof MOCK_CUSTOMERS[0] | null>(null);

  const filtered = MOCK_CUSTOMERS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell requiredRole="frontdesk">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Customers</h1>
              <p className="text-muted-foreground font-medium mt-0.5">{MOCK_CUSTOMERS.length} total customers</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm">
              <Plus size={16} />
              New Customer
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, phone, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer List */}
            <div className="lg:col-span-2 space-y-2">
              {filtered.length === 0 ? (
                <div className="bg-card border border-border rounded-2xl p-10 text-center">
                  <User size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="font-bold text-foreground">No customers found</p>
                </div>
              ) : (
                filtered.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelected(customer)}
                    className={`w-full text-left bg-card border rounded-xl p-4 hover:border-primary/50 transition-all ${
                      selected?.id === customer.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                          <User size={18} className="text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {customer.activeTickets > 0 && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {customer.activeTickets} active
                          </span>
                        )}
                        <ChevronRight size={16} className="text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Customer Detail Panel */}
            <div className="space-y-4">
              {selected ? (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 sticky top-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <User size={22} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-black text-foreground">{selected.name}</p>
                      <p className="text-xs text-muted-foreground">{selected.id}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-muted-foreground" />
                      <a href={`tel:${selected.phone}`} className="text-primary font-medium">{selected.phone}</a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground">{selected.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground">Last visit: {new Date(selected.lastVisit).toLocaleDateString("en-PK")}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-foreground">{selected.totalTickets}</p>
                      <p className="text-xs text-muted-foreground font-medium">Total Tickets</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{selected.activeTickets}</p>
                      <p className="text-xs text-muted-foreground font-medium">Active Now</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-all">
                      <Ticket size={14} />
                      View Tickets
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all">
                      <Plus size={14} />
                      New Ticket
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  <User size={28} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Select a customer to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
