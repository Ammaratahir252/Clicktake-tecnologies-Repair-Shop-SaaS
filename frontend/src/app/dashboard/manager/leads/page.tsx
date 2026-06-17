"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Plus, Search, Phone, Mail, User, ChevronRight, Target, Clock, Loader2, X } from "lucide-react";

const LEAD_STATUSES = [
  { key: "new",       label: "New",       color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"         },
  { key: "contacted", label: "Contacted", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"     },
  { key: "qualified", label: "Qualified", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { key: "converted", label: "Converted", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { key: "lost",      label: "Lost",      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"             },
];

const SOURCES = ["Walk-in", "WhatsApp", "Instagram", "Referral", "Website", "Facebook"];

function StatusBadge({ status }: { status: string }) {
  const s = LEAD_STATUSES.find((x) => x.key === status) ?? LEAD_STATUSES[0];
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>;
}

const EMPTY_FORM = { name: "", phone: "", email: "", device: "", issue: "", source: "Walk-in" };

export default function ManagerLeadsPage() {
  return (
    <DashboardShell requiredRole="manager">
      {() => <LeadsContent />}
    </DashboardShell>
  );
}

function LeadsContent() {
  const [leads, setLeads]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [selected, setSelected] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const res = await api.get("/api/leads");
      setLeads(res.data?.data ?? []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleAddLead = async () => {
    if (!form.name || !form.phone || !form.device || !form.issue || !form.source) return;
    setSaving(true);
    try {
      const res = await api.post("/api/leads", form);
      setLeads((prev) => [res.data.data, ...prev]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdating(leadId);
    try {
      const res = await api.patch(`/api/leads/${leadId}`, { status: newStatus });
      setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, status: newStatus } : l)));
      if (selected?._id === leadId) setSelected({ ...selected, status: newStatus });
    } catch {
      // silently fail
    } finally {
      setUpdating(null);
    }
  };

  const filtered = leads.filter((l) => {
    const matchSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search);
    const matchFilter = filter === "all" || l.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    new:       leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading leads…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Leads</h1>
          <p className="text-muted-foreground font-medium mt-0.5">Track potential customers and conversions</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm"
        >
          <Plus size={16} />
          Add Lead
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "New",       value: stats.new,       color: "text-blue-500"    },
          { label: "Contacted", value: stats.contacted,  color: "text-amber-500"   },
          { label: "Qualified", value: stats.qualified,  color: "text-purple-500"  },
          { label: "Converted", value: stats.converted,  color: "text-emerald-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

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
        <div className="lg:col-span-2 space-y-2">
          {filtered.map((lead) => (
            <button
              key={lead._id}
              onClick={() => setSelected(lead)}
              className={`w-full text-left bg-card border rounded-xl p-4 hover:border-primary/50 transition-all ${
                selected?._id === lead._id ? "border-primary bg-primary/5" : "border-border"
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
                {selected.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={13} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{selected.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("en-PK") : "—"}
                  </span>
                </div>
              </div>
              <div className="bg-muted rounded-xl p-3 space-y-1 text-sm">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wide">Device</p>
                <p className="font-bold text-foreground">{selected.device}</p>
                <p className="text-muted-foreground">{selected.issue}</p>
                <p className="text-xs text-muted-foreground mt-1">Source: {selected.source}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Update Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {LEAD_STATUSES.map((s) => (
                    <button
                      key={s.key}
                      disabled={selected.status === s.key || updating === selected._id}
                      onClick={() => handleStatusChange(selected._id, s.key)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                        selected.status === s.key
                          ? s.color + " opacity-100"
                          : "bg-muted text-muted-foreground hover:text-foreground disabled:opacity-50"
                      }`}
                    >
                      {updating === selected._id && selected.status !== s.key ? "…" : s.label}
                    </button>
                  ))}
                </div>
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

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-black text-foreground">Add New Lead</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "name",   label: "Full Name *",  placeholder: "Ahmed Khan" },
                  { key: "phone",  label: "Phone *",      placeholder: "+92 300 ..." },
                  { key: "email",  label: "Email",        placeholder: "ahmed@..." },
                  { key: "device", label: "Device *",     placeholder: "iPhone 15" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">{label}</label>
                    <input
                      type="text"
                      value={(form as any)[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">Issue *</label>
                <input
                  type="text"
                  value={form.issue}
                  onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))}
                  placeholder="Cracked screen, won't charge…"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">Source *</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLead}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : "Add Lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
