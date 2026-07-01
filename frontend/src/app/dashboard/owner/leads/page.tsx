"use client";

/**
 * OWNER — /dashboard/owner/leads
 *
 * GPS-routed customer leads for this shop/tenant.
 * Owner can view all leads, claim unclaimed ones, assign to staff,
 * and update lead status.
 *
 * Features:
 * - Stats: Total / New / Contacted / Converted
 * - Filter by status
 * - Search by customer name, phone, device, or issue
 * - Claim unclaimed leads
 * - Update status (contacted, converted, lost)
 * - Assign to staff member
 */

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  MapPin, Search, Loader2, AlertTriangle,
  XCircle, RefreshCw, Phone, Smartphone,
  CheckCircle2, Clock, UserPlus, TrendingUp,
  ChevronDown, UserCheck, Edit3,
} from "lucide-react";

interface Lead {
  _id: string;
  customerName?: string;
  name?: string;
  phone?: string;
  device?: string;
  deviceType?: string;
  issue?: string;
  address?: string;
  location?: string;
  status?: string;
  claimedBy?: string;
  assignedTo?: string;
  assignedName?: string;
  notes?: string;
  createdAt: string;
}

interface TeamMember {
  id?: string;
  _id?: string;
  name: string;
  role: string;
}

const STATUS_OPTIONS = ["new", "contacted", "converted", "lost"];

const getStatusStyle = (status?: string) => {
  switch ((status ?? "new").toLowerCase()) {
    case "new":       return "bg-blue-100 text-blue-700";
    case "contacted": return "bg-amber-100 text-amber-700";
    case "converted": return "bg-emerald-100 text-emerald-700";
    case "lost":      return "bg-red-100 text-red-700";
    default:          return "bg-muted text-muted-foreground";
  }
};

export default function OwnerLeadsPage() {
  return (
    <DashboardShell requiredRole="owner">
      {(user) => <LeadsContent owner={user} />}
    </DashboardShell>
  );
}

function LeadsContent({ owner }: { owner: any }) {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [filtered, setFiltered]   = useState<Lead[]>([]);
  const [team, setTeam]           = useState<TeamMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch]       = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingLead, setEditingLead]     = useState<Lead | null>(null);
  const [editStatus, setEditStatus]       = useState("");
  const [editAssignee, setEditAssignee]   = useState("");
  const [editNotes, setEditNotes]         = useState("");
  const [saveLoading, setSaveLoading]     = useState(false);
  const [successMsg, setSuccessMsg]       = useState("");

  useEffect(() => {
    fetchLeads();
    fetchTeam();
  }, []);

  useEffect(() => {
    let result = [...leads];
    if (statusFilter !== "All") {
      result = result.filter((l) => (l.status ?? "new").toLowerCase() === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          (l.customerName ?? l.name ?? "").toLowerCase().includes(q) ||
          (l.phone ?? "").includes(q) ||
          (l.device ?? l.deviceType ?? "").toLowerCase().includes(q) ||
          (l.issue ?? "").toLowerCase().includes(q) ||
          (l.address ?? l.location ?? "").toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [leads, search, statusFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/leads?limit=100");
      const data = res.data?.data;
      setLeads(Array.isArray(data) ? data : data?.leads ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await api.get("/api/users");
      const data = res.data?.data;
      setTeam(Array.isArray(data) ? data : []);
    } catch { /* non-critical */ }
  };

  const claimLead = async (leadId: string) => {
    setActionLoading(leadId);
    try {
      await api.post(`/api/leads/${leadId}/claim`);
      await fetchLeads();
      setSuccessMsg("Lead claimed successfully.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to claim lead.");
    } finally {
      setActionLoading(null);
    }
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditStatus(lead.status ?? "new");
    setEditAssignee(lead.assignedTo ?? "");
    setEditNotes(lead.notes ?? "");
  };

  const saveEdit = async () => {
    if (!editingLead) return;
    setSaveLoading(true);
    try {
      await api.patch(`/api/leads/${editingLead._id}`, {
        status: editStatus,
        assignedTo: editAssignee || undefined,
        notes: editNotes,
      });
      await fetchLeads();
      setEditingLead(null);
      setSuccessMsg("Lead updated.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update lead.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Stats
  const total     = leads.length;
  const newCount  = leads.filter((l) => (l.status ?? "new").toLowerCase() === "new").length;
  const contacted = leads.filter((l) => l.status?.toLowerCase() === "contacted").length;
  const converted = leads.filter((l) => l.status?.toLowerCase() === "converted").length;

  const displayName = (l: Lead) => l.customerName ?? l.name ?? "Unknown";
  const memberId    = (m: TeamMember) => m.id ?? m._id ?? "";

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center shadow-md">
            <MapPin className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Leads</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              GPS-routed customer leads for your shop.
            </p>
          </div>
        </div>
        <button
          onClick={fetchLeads}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stats Strip ────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",     value: total,     icon: TrendingUp,   color: "text-slate-700",   bg: "bg-slate-50",   border: "border-slate-100" },
            { label: "New",       value: newCount,  icon: UserPlus,     color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-100" },
            { label: "Contacted", value: contacted, icon: Clock,        color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-100" },
            { label: "Converted", value: converted, icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm`}>
              <Icon size={18} className={color} />
              <div>
                <p className={`text-xl font-black ${color}`}>{value}</p>
                <p className="text-[11px] text-muted-foreground font-semibold">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Alerts ─────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <button onClick={() => setError("")} className="ml-auto text-destructive/60 hover:text-destructive">
            <XCircle size={16} />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <p className="text-sm font-semibold text-emerald-700">{successMsg}</p>
        </div>
      )}

      {/* ── Filters & Search ───────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {["All", ...STATUS_OPTIONS].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                statusFilter === f
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-card text-muted-foreground border border-border hover:border-border/80"
              }`}
            >
              {f === "All" ? "All Statuses" : f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, phone, device, or issue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-all"
          />
        </div>
      </div>

      {/* ── Leads Table ────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <MapPin size={15} className="text-rose-500" />
          <span className="font-bold text-foreground text-sm">
            {loading ? "Loading…" : `${filtered.length} lead${filtered.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin w-8 h-8 mb-4" />
            <p className="text-sm font-medium">Loading leads…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="mx-auto text-muted-foreground/20 w-10 h-10 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              {search || statusFilter !== "All" ? "No leads match your filters." : "No leads yet. They'll appear here when customers reach out."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Device / Issue</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-foreground divide-y divide-border">
                {filtered.map((lead) => {
                  const isClaimed = !!lead.claimedBy;
                  const isLoading = actionLoading === lead._id;
                  return (
                    <tr key={lead._id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-foreground">{displayName(lead)}</p>
                        {lead.phone && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Phone size={10} className="text-muted-foreground" />
                            <span className="font-mono text-xs text-muted-foreground">{lead.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {(lead.device ?? lead.deviceType) && (
                          <div className="flex items-center gap-1.5">
                            <Smartphone size={11} className="text-muted-foreground" />
                            <span className="text-xs">{lead.device ?? lead.deviceType}</span>
                          </div>
                        )}
                        {lead.issue && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[160px] truncate">{lead.issue}</p>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {(lead.address ?? lead.location) ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} className="text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground max-w-[140px] truncate">
                              {lead.address ?? lead.location}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {lead.assignedName ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck size={12} className="text-muted-foreground" />
                            <span className="text-xs font-semibold">{lead.assignedName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${getStatusStyle(lead.status)}`}>
                          {lead.status ?? "new"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          {!isClaimed && (
                            <button
                              onClick={() => claimLead(lead._id)}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 disabled:opacity-40 transition-all shadow-sm"
                            >
                              {isLoading ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />}
                              Claim
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(lead)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-all"
                          >
                            <Edit3 size={11} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────── */}
      {editingLead && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-black text-foreground">Update Lead</h3>
              <p className="text-sm text-muted-foreground mt-1 font-medium">{displayName(editingLead)}</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Status</label>
                <div className="relative">
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full p-3 pr-8 bg-muted border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-rose-200 appearance-none"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Assign to */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Assign To</label>
                <div className="relative">
                  <select
                    value={editAssignee}
                    onChange={(e) => setEditAssignee(e.target.value)}
                    className="w-full p-3 pr-8 bg-muted border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-rose-200 appearance-none"
                  >
                    <option value="">Unassigned</option>
                    {team.map((m) => (
                      <option key={memberId(m)} value={memberId(m)}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Add a note about this lead…"
                  className="w-full p-3 bg-muted border border-border rounded-xl text-sm font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
                />
              </div>
            </div>

            <div className="p-6 bg-muted border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setEditingLead(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted-foreground/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saveLoading}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
              >
                {saveLoading && <Loader2 size={15} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}