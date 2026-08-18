"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { FileEdit, Plus, X, Loader2, Pencil, Trash2, Calendar } from "lucide-react";

interface Report {
  _id: string;
  authorName: string;
  title: string;
  body: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt: string;
}

const EMPTY_FORM = { title: "", body: "", periodStart: "", periodEnd: "" };

/** Manually-authored written reports (owner/manager) — distinct from the
 * auto-generated analytics on the same page. Self-contained: fetches its own
 * list, handles create/edit/delete against /api/reports. */
export default function WrittenReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    try {
      const res = await api.get("/api/reports");
      setReports(res.data?.data ?? []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  };

  const openEdit = (r: Report) => {
    setEditingId(r._id);
    setForm({
      title: r.title,
      body: r.body,
      periodStart: r.periodStart ? r.periodStart.slice(0, 10) : "",
      periodEnd: r.periodEnd ? r.periodEnd.slice(0, 10) : "",
    });
    setError("");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError("Title and body are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        body: form.body,
        periodStart: form.periodStart || undefined,
        periodEnd: form.periodEnd || undefined,
      };
      if (editingId) {
        await api.patch(`/api/reports/${editingId}`, payload);
      } else {
        await api.post("/api/reports", payload);
      }
      setShowForm(false);
      await fetchReports();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to save report.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    try {
      await api.delete(`/api/reports/${id}`);
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch {
      alert("Failed to delete report.");
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-teal-600 w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
            <FileEdit className="w-4 h-4 text-white" />
          </div>
          <h2 className="font-bold text-card-foreground">Written Reports</h2>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-3.5 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-all"
        >
          <Plus size={14} /> New Report
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading…
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No written reports yet. Use "New Report" to compose a weekly summary, incident note, or handover write-up.
          </p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r._id} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === r._id ? null : r._id)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      By {r.authorName} · {new Date(r.createdAt).toLocaleDateString()}
                      {r.periodStart && r.periodEnd && (
                        <> · Covers {new Date(r.periodStart).toLocaleDateString()}–{new Date(r.periodEnd).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <Pencil size={13} />
                    </span>
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); remove(r._id); }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={13} />
                    </span>
                  </div>
                </button>
                {expanded === r._id && (
                  <div className="px-4 pb-4 pt-1 border-t border-border/50">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{r.body}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-black text-foreground">{editingId ? "Edit Report" : "New Report"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-sm font-semibold border border-destructive/20">
                  {error}
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Week of Aug 11 — Ops Summary"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                    <Calendar size={11} /> Period Start
                  </label>
                  <input
                    type="date"
                    value={form.periodStart}
                    onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                    <Calendar size={11} /> Period End
                  </label>
                  <input
                    type="date"
                    value={form.periodEnd}
                    onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide block mb-1">Report *</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={8}
                  placeholder="Write your report…"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : "Save Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
