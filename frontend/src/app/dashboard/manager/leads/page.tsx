"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Plus, Search, Phone, Mail, User, ChevronRight, Target, TrendingUp, Clock } from "lucide-react";

const LEAD_STATUSES = [
  { key: "new",        label: "New",          color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "contacted",  label: "Contacted",    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "qualified",  label: "Qualified",    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { key: "converted",  label: "Converted",    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { key: "lost",       label: "Lost",         color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

const SOURCES = ["Walk-in", "WhatsApp", "Instagram", "Referral", "Website", "Facebook"];

const MOCK_LEADS = [
  { id: "L-001", name: "Hamza Tariq", phone: "+92 300 5551234", email: "hamza@example.com", device: "iPhone 14 Pro", issue: "Cracked screen", source: "Instagram", status: "qualified", date: "2026-06-05" },
  { id: "L-002", name: "Maham Siddiqui", phone: "+92 321 3334455", email: "maham@example.com", device: "Samsung S23", issue: "Won't charge", source: "WhatsApp", status: "contacted", date: "2026-06-05" },
  { id: "L-003", name: "Omer Farooq", phone: "+92 333 7778899", email: "omer@example.com", device: "Dell XPS 13", issue: "Blue screen error", source: "Referral", status: "new", date: "2026-06-06" },
  { id: "L-004", name: "Kiran Anwar", phone: "+92 345 1112233", email: "kiran@example.com", device: "iPad Air", issue: "Battery swollen", source: "Walk-in", status: "converted", date: "2026-06-04" },
  { id: "L-005", name: "Talha Riaz", phone: "+92 311 6667788", email: "talha@example.com", device: "OnePlus 11", issue: "Camera not working", source: "Facebook", status: "lost", date: "2026-06-03" },
];

function StatusBadge({ status }: { status: string }) {
  const s = LEAD_STATUSES.find((x) => x.key === status) ?? LEAD_STATUSES[0];
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>;
}

export default function ManagerLeadsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [leads, setLeads] = useState(MOCK_LEADS);
  const [selected, setSelected] = useState<typeof MOCK_LEADS[0] | null>(null);

  const filtered = leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search);
    const matchFilter = filter === "all" || l.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  return (
    <DashboardShell requiredRole="manager">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Leads</h1>
              <p className="text-muted-foreground font-medium mt-0.5">Track potential customers and conversions</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm">
              <Plus size={16} />
              Add Lead
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "New", value: stats.new, color: "text-blue-500" },
              { label: "Contacted", value: stats.contacted, color: "text-amber-500" },
              { label: "Qualified", value: stats.qualified, color: "text-purple-500" },
              { label: "Converted", value: stats.converted, color: "text-emerald-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {["all", ...LEAD_STATUSES.map((s) => s.key)].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                    filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead List */}
            <div className="lg:col-span-2 space-y-2">
              {filtered.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className={`w-full text-left bg-card border rounded-xl p-4 hover:border-primary/50 transition-all ${
                    selected?.id === lead.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                        <User size={15} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.device} · {lead.issue}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={lead.status} />
                      <ChevronRight size={14} className="text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="bg-card border border-border rounded-2xl p-10 text-center">
                  <Target size={28} className="text-muted-foreground mx-auto mb-2" />
                  <p className="font-bold text-foreground">No leads found</p>
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div>
              {selected ? (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 sticky top-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-black text-foreground">{selected.name}</p>
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-muted-foreground" />
                      <a href={`tel:${selected.phone}`} className="text-primary font-medium">{selected.phone}</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-muted-foreground" />
                      <span className="text-muted-foreground">{selected.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={13} className="text-muted-foreground" />
                      <span className="text-muted-foreground">{new Date(selected.date).toLocaleDateString("en-PK")}</span>
                    </div>
                  </div>
                  <div className="bg-muted rounded-xl p-3 space-y-1 text-sm">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">Device</p>
                    <p className="font-bold text-foreground">{selected.device}</p>
                    <p className="text-muted-foreground">{selected.issue}</p>
                    <p className="text-xs text-muted-foreground mt-1">Source: {selected.source}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-all">
                      Convert to Ticket
                    </button>
                    <button className="py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all">
                      Follow Up
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-8 text-center">
                  <Target size={24} className="text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">Select a lead to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
