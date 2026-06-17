"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Search, User, Phone, Mail, Ticket, Clock, ChevronRight, Plus, Loader2 } from "lucide-react";

export default function FrontdeskCustomersPage() {
  return (
    <DashboardShell requiredRole="frontdesk">
      {() => <CustomersContent />}
    </DashboardShell>
  );
}

function CustomersContent() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<any>(null);

  const fetchCustomers = useCallback(async (q?: string) => {
    try {
      const url = q ? `/api/customers?search=${encodeURIComponent(q)}` : "/api/customers";
      const res = await api.get(url);
      setCustomers(res.data?.data ?? []);
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchCustomers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading customers…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Customers</h1>
          <p className="text-muted-foreground font-medium mt-0.5">{customers.length} total customers</p>
        </div>
        <a
          href="/dashboard/frontdesk/tickets/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm"
        >
          <Plus size={16} />
          New Ticket
        </a>
      </div>

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
        <div className="lg:col-span-2 space-y-2">
          {customers.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <User size={32} className="text-muted-foreground mx-auto mb-2" />
              <p className="font-bold text-foreground">No customers found</p>
            </div>
          ) : (
            customers.map((customer) => (
              <button
                key={customer._id}
                onClick={() => setSelected(customer)}
                className={`w-full text-left bg-card border rounded-xl p-4 hover:border-primary/50 transition-all ${
                  selected?._id === customer._id ? "border-primary bg-primary/5" : "border-border"
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
                    {(customer.activeTickets ?? 0) > 0 && (
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

        <div className="space-y-4">
          {selected ? (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 sticky top-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <User size={22} className="text-primary" />
                </div>
                <div>
                  <p className="font-black text-foreground">{selected.name}</p>
                  <p className="text-xs text-muted-foreground">{selected.phone}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-muted-foreground" />
                  <a href={`tel:${selected.phone}`} className="text-primary font-medium">{selected.phone}</a>
                </div>
                {selected.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{selected.email}</span>
                  </div>
                )}
                {selected.lastVisit && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Last visit: {new Date(selected.lastVisit).toLocaleDateString("en-PK")}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-foreground">{selected.totalTickets ?? 0}</p>
                  <p className="text-xs text-muted-foreground font-medium">Total Tickets</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{selected.activeTickets ?? 0}</p>
                  <p className="text-xs text-muted-foreground font-medium">Active Now</p>
                </div>
              </div>

              <a
                href={`/dashboard/frontdesk/tickets?customer=${selected._id}`}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-all"
              >
                <Ticket size={14} />
                View Tickets
              </a>
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
  );
}
