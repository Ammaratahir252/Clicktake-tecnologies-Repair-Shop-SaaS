"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  CreditCard, Search, RefreshCw, Loader2, AlertTriangle,
  CheckCircle, XCircle, Building2, ChevronDown, DollarSign,
  Ban, Trash2, RotateCcw, Save,
} from "lucide-react";

interface SubRecord {
  _id:             string;
  tenantName:      string;
  tenantSubdomain: string;
  tenantEmail:     string;
  tenantIsActive:  boolean;
  tenantCreatedAt: string;
  subscriptionId:  string | null;
  plan:            string;
  status:          string;
  billingCycle:    string;
  amount:          number;
  currency:        string;
  startedAt:       string;
  nextBillingDate: string | null;
  cancelledAt:     string | null;
  notes:           string;
  hasDedicatedRecord: boolean;
}

const PLAN_OPTIONS   = ['free', 'pro', 'enterprise'];
const STATUS_OPTIONS = ['active', 'trial', 'suspended', 'cancelled'];
const CYCLE_OPTIONS  = ['monthly', 'annual'];

const PLAN_COLORS: Record<string, string> = {
  free:       'bg-slate-100 text-slate-600',
  pro:        'bg-blue-100 text-blue-700',
  enterprise: 'bg-indigo-100 text-indigo-700',
};

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  trial:     'bg-amber-100 text-amber-700',
  suspended: 'bg-orange-100 text-orange-700',
  cancelled: 'bg-red-100 text-red-700',
};

const PLAN_AMOUNTS: Record<string, Record<string, number>> = {
  free:       { monthly: 0,     annual: 0      },
  pro:        { monthly: 4999,  annual: 49999  },
  enterprise: { monthly: 14999, annual: 149999 },
};

export default function SuperAdminSubscriptionsPage() {
  return (
    <DashboardShell requiredRole={["super_admin", "admin"]}>
      {() => <SubscriptionsContent />}
    </DashboardShell>
  );
}

function SubscriptionsContent() {
  const [records,  setRecords]  = useState<SubRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [search,   setSearch]   = useState("");
  const [planFilter, setPlanFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<SubRecord | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Edit form state
  const [editPlan,    setEditPlan]    = useState("free");
  const [editStatus,  setEditStatus]  = useState("active");
  const [editCycle,   setEditCycle]   = useState("monthly");
  const [editAmount,  setEditAmount]  = useState("0");
  const [editNextBill, setEditNextBill] = useState("");
  const [editNotes,   setEditNotes]   = useState("");

  const fetchRecords = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await api.get("/api/admin/subscriptions");
      setRecords(res.data?.data ?? []);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to load subscriptions.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const openDetail = (r: SubRecord) => {
    setSelected(r);
    setEditPlan(r.plan);
    setEditStatus(r.status);
    setEditCycle(r.billingCycle);
    setEditAmount(String(r.amount));
    setEditNextBill(r.nextBillingDate ? r.nextBillingDate.slice(0, 10) : "");
    setEditNotes(r.notes);
    setShowDelete(false);
    setError(""); setSuccess("");
  };

  const handlePlanChange = (plan: string) => {
    setEditPlan(plan);
    const suggested = PLAN_AMOUNTS[plan]?.[editCycle] ?? 0;
    setEditAmount(String(suggested));
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const payload: Record<string, any> = {
        plan:    editPlan,
        status:  editStatus,
        billingCycle: editCycle,
        amount:  parseFloat(editAmount) || 0,
        notes:   editNotes,
      };
      if (editNextBill) payload.nextBillingDate = new Date(editNextBill).toISOString();
      if (editStatus === 'cancelled') payload.cancelledAt = new Date().toISOString();

      const res = await api.patch(`/api/admin/subscriptions/${selected._id}`, payload);
      const updated: SubRecord = {
        ...selected,
        plan:            editPlan,
        status:          editStatus,
        billingCycle:    editCycle,
        amount:          payload.amount,
        nextBillingDate: editNextBill ? new Date(editNextBill).toISOString() : null,
        notes:           editNotes,
        hasDedicatedRecord: true,
        subscriptionId:  res.data?.data?._id ?? selected.subscriptionId,
      };
      setRecords(prev => prev.map(r => r._id === selected._id ? updated : r));
      setSelected(updated);
      setSuccess("Subscription updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  const handleQuickAction = async (action: string) => {
    if (!selected) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      if (action === 'delete') {
        await api.delete(`/api/admin/subscriptions/${selected._id}`);
        setRecords(prev => prev.map(r =>
          r._id === selected._id ? { ...r, status: 'cancelled', tenantIsActive: false } : r
        ));
        setSelected(s => s ? { ...s, status: 'cancelled', tenantIsActive: false } : s);
        setEditStatus('cancelled');
        setSuccess("Subscription cancelled and tenant suspended.");
      } else {
        const statusMap: Record<string, string> = {
          suspend:    'suspended',
          activate:   'active',
          cancel:     'cancelled',
          reactivate: 'active',
        };
        const newStatus = statusMap[action];
        if (newStatus) {
          await api.patch(`/api/admin/subscriptions/${selected._id}`, { status: newStatus });
          setRecords(prev => prev.map(r =>
            r._id === selected._id ? { ...r, status: newStatus, tenantIsActive: newStatus === 'active' } : r
          ));
          setSelected(s => s ? { ...s, status: newStatus } : s);
          setEditStatus(newStatus);
          setSuccess(`Status set to ${newStatus}.`);
        }
      }
      setShowDelete(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || "Action failed.");
    } finally { setSaving(false); }
  };

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.tenantName.toLowerCase().includes(q) ||
                        r.tenantSubdomain.toLowerCase().includes(q) ||
                        (r.tenantEmail || '').toLowerCase().includes(q);
    const matchPlan   = planFilter   === 'all' || r.plan   === planFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  const stats = {
    total:    records.length,
    active:   records.filter(r => r.status === 'active').length,
    revenue:  records.filter(r => r.status === 'active' && r.billingCycle === 'monthly')
                     .reduce((s, r) => s + r.amount, 0),
    cancelled: records.filter(r => r.status === 'cancelled').length,
  };

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-PK') : '—';
  const fmtAmt  = (a: number) => a > 0 ? `Rs. ${a.toLocaleString()}` : 'Free';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Subscriptions</h1>
          <p className="text-muted-foreground font-medium mt-0.5">Manage all shop payment plans platform-wide</p>
        </div>
        <button onClick={fetchRecords} disabled={loading}
          className="p-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-all">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <button onClick={() => setError("")} className="ml-auto"><XCircle size={14} className="text-destructive/60" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 dark:bg-emerald-900/20">
          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{success}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Shops",     value: stats.total,     color: "text-foreground"   },
          { label: "Active Plans",    value: stats.active,    color: "text-emerald-500"  },
          { label: "MRR (est.)",      value: fmtAmt(stats.revenue), color: "text-blue-500" },
          { label: "Cancelled",       value: stats.cancelled, color: "text-red-500"      },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center shadow-sm">
            <p className={`text-xl font-black ${color}`}>
              {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : value}
            </p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by shop name, subdomain, or email…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-medium" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...PLAN_OPTIONS].map(f => (
            <button key={f} onClick={() => setPlanFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${planFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...STATUS_OPTIONS].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${statusFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="animate-spin w-6 h-6 mr-3" />
              <span>Loading subscriptions…</span>
            </div>
          )}
          {!loading && filtered.map(r => (
            <button key={r._id} onClick={() => openDetail(r)}
              className={`w-full text-left bg-card border rounded-xl p-4 hover:border-primary/50 transition-all ${selected?._id === r._id ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{r.tenantName}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[r.plan] ?? ''}`}>{r.plan}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[r.status] ?? ''}`}>{r.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.tenantSubdomain}.dibnow.com</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-sm text-foreground">{fmtAmt(r.amount)}</p>
                  <p className="text-xs text-muted-foreground">{r.billingCycle}</p>
                </div>
              </div>
            </button>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-10 text-center">
              <CreditCard size={28} className="text-muted-foreground mx-auto mb-2" />
              <p className="font-bold text-foreground">No subscriptions found</p>
            </div>
          )}
        </div>

        {/* Detail / Edit Panel */}
        <div>
          {selected ? (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 sticky top-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <CreditCard size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-black text-foreground text-sm">{selected.tenantName}</p>
                  <p className="text-xs text-muted-foreground">{selected.tenantEmail}</p>
                </div>
              </div>

              {/* Plan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Plan</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {PLAN_OPTIONS.map(p => (
                    <button key={p} onClick={() => handlePlanChange(p)}
                      className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${editPlan === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Status</label>
                <div className="relative">
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                    className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-2.5 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Billing Cycle */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Billing Cycle</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CYCLE_OPTIONS.map(c => (
                    <button key={c} onClick={() => { setEditCycle(c); setEditAmount(String(PLAN_AMOUNTS[editPlan]?.[c] ?? 0)); }}
                      className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${editCycle === c ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Amount (PKR)</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              {/* Next Billing Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Next Billing Date</label>
                <input type="date" value={editNextBill} onChange={e => setEditNextBill(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Admin Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}
                  placeholder="Internal notes…"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>

              <button onClick={handleSave} disabled={saving}
                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save Changes
              </button>

              {/* Quick Actions */}
              <div className="pt-1 space-y-1.5 border-t border-border">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest pt-2">Quick Actions</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {selected.status !== 'suspended' && (
                    <button onClick={() => handleQuickAction('suspend')} disabled={saving}
                      className="py-2 rounded-lg bg-orange-100 text-orange-700 text-xs font-bold hover:bg-orange-200 transition-all disabled:opacity-40 flex items-center justify-center gap-1">
                      <Ban size={11} /> Suspend
                    </button>
                  )}
                  {selected.status !== 'active' && (
                    <button onClick={() => handleQuickAction('activate')} disabled={saving}
                      className="py-2 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-all disabled:opacity-40 flex items-center justify-center gap-1">
                      <RotateCcw size={11} /> Reactivate
                    </button>
                  )}
                  {!showDelete ? (
                    <button onClick={() => setShowDelete(true)}
                      className="col-span-2 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition-all flex items-center justify-center gap-1">
                      <Trash2 size={11} /> Cancel & Suspend
                    </button>
                  ) : (
                    <div className="col-span-2 space-y-1.5">
                      <p className="text-xs text-red-600 font-semibold text-center">This will cancel the subscription and suspend the tenant. Confirm?</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button onClick={() => setShowDelete(false)}
                          className="py-2 rounded-lg bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/70 transition-all">
                          Cancel
                        </button>
                        <button onClick={() => handleQuickAction('delete')} disabled={saving}
                          className="py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-1">
                          {saving ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          Confirm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Meta info */}
              <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border">
                <div className="flex justify-between"><span>Started</span><span>{fmtDate(selected.startedAt)}</span></div>
                {selected.nextBillingDate && <div className="flex justify-between"><span>Next Billing</span><span>{fmtDate(selected.nextBillingDate)}</span></div>}
                {selected.cancelledAt && <div className="flex justify-between"><span>Cancelled</span><span className="text-red-500">{fmtDate(selected.cancelledAt)}</span></div>}
                <div className="flex justify-between"><span>DB Record</span><span className={selected.hasDedicatedRecord ? 'text-emerald-600' : 'text-muted-foreground'}>{selected.hasDedicatedRecord ? 'Yes' : 'Derived'}</span></div>
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <CreditCard size={24} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground font-medium">Select a subscription to manage</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
