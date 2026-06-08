"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import api from "@/lib/api";
import {
  ArrowLeft, Package, Edit3, Save, X, AlertTriangle,
  Loader2, TrendingUp, TrendingDown, RotateCcw,
  Wrench, CheckCircle2, Clock, User
} from "lucide-react";

interface Part {
  _id: string; name: string; sku: string; category: string;
  quantity: number; costPrice: number; sellPrice: number;
  lowStockLimit: number; description?: string; supplier?: string;
  isActive: boolean; createdAt: string; updatedAt: string;
}

interface Movement {
  _id: string; type: string; quantity: number;
  previousStock: number; newStock: number;
  performedBy: { name: string; email: string } | string;
  note?: string; createdAt: string;
}

const MOVEMENT_STYLES: Record<string, string> = {
  added:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  used:     "bg-blue-100 text-blue-700 border-blue-200",
  adjusted: "bg-amber-100 text-amber-700 border-amber-200",
  returned: "bg-purple-100 text-purple-700 border-purple-200",
  damaged:  "bg-red-100 text-red-700 border-red-200",
};

const MOVEMENT_ICONS: Record<string, React.ReactElement> = {
  added: <TrendingUp size={12} />, used: <Wrench size={12} />,
  adjusted: <RotateCcw size={12} />, returned: <RotateCcw size={12} />, damaged: <TrendingDown size={12} />,
};

function formatPKR(n: number) { return `PKR ${n.toLocaleString("en-PK")}`; }
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function PartDetailContent() {
  const router   = useRouter();
  const params   = useParams();
  const partId   = params?.partId as string;

  const [part, setPart]           = useState<Part | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [editing, setEditing]     = useState(false);
  const [editForm, setEditForm]   = useState<Partial<Part>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);
  const [stockType, setStockType]     = useState("added");
  const [stockQty, setStockQty]       = useState("");
  const [stockNote, setStockNote]     = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError]   = useState("");
  const [stockSuccess, setStockSuccess] = useState("");
  const [movLoading, setMovLoading]   = useState(false);

  const fetchPart = useCallback(async () => {
    if (!partId) return;
    setLoading(true); setError("");
    try { const res = await api.get(`/api/parts/${partId}`); setPart(res.data.data); }
    catch (err: any) { setError(err.response?.data?.message ?? "Failed to load part"); }
    finally { setLoading(false); }
  }, [partId]);

  const fetchMovements = useCallback(async () => {
    if (!partId) return;
    setMovLoading(true);
    try { const res = await api.get(`/api/parts/${partId}/stock`); setMovements(res.data.data ?? []); }
    catch { /* non-critical */ }
    finally { setMovLoading(false); }
  }, [partId]);

  useEffect(() => { fetchPart(); fetchMovements(); }, [fetchPart, fetchMovements]);

  const startEdit = () => {
    if (!part) return;
    setEditForm({ name: part.name, category: part.category, costPrice: part.costPrice, sellPrice: part.sellPrice, lowStockLimit: part.lowStockLimit, description: part.description ?? "", supplier: part.supplier ?? "" });
    setEditing(true); setEditError(""); setEditSuccess(false);
  };

  const cancelEdit = () => { setEditing(false); setEditError(""); };

  const saveEdit = async () => {
    if (!part) return;
    setEditLoading(true); setEditError("");
    try {
      const res = await api.patch(`/api/parts/${partId}`, { name: editForm.name, category: editForm.category, costPrice: Number(editForm.costPrice), sellPrice: Number(editForm.sellPrice), lowStockLimit: Number(editForm.lowStockLimit), description: editForm.description || undefined, supplier: editForm.supplier || undefined });
      setPart(res.data.data); setEditing(false); setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 3000);
    } catch (err: any) { setEditError(err.response?.data?.message ?? "Failed to update"); }
    finally { setEditLoading(false); }
  };

  const handleStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(stockQty, 10);
    if (!qty || qty <= 0) { setStockError("Quantity must be a positive integer"); return; }
    setStockLoading(true); setStockError(""); setStockSuccess("");
    try {
      const res = await api.post(`/api/parts/${partId}/stock`, { type: stockType, quantity: qty, note: stockNote.trim() || undefined });
      setPart(res.data.data.part); setStockQty(""); setStockNote("");
      setStockSuccess(`Stock ${stockType} — updated to ${res.data.data.part.quantity} units`);
      setTimeout(() => setStockSuccess(""), 4000);
      fetchMovements();
    } catch (err: any) { setStockError(err.response?.data?.message ?? "Failed to update stock"); }
    finally { setStockLoading(false); }
  };

  const isLow = part ? part.quantity <= part.lowStockLimit : false;

  if (loading) return <div className="flex items-center justify-center py-24 gap-3 text-slate-400"><Loader2 className="animate-spin w-6 h-6" /><span className="text-sm">Loading part…</span></div>;

  if (error || !part) return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => router.push("/dashboard/manager/inventory")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-semibold">
        <ArrowLeft size={16} /> Back to Inventory
      </button>
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
        <AlertTriangle size={18} className="text-red-500" /><p className="text-sm font-semibold text-red-700">{error || "Part not found"}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => router.push("/dashboard/manager/inventory")} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">
          <ArrowLeft size={16} /> Back to Inventory
        </button>
      </div>

      {editSuccess && <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"><CheckCircle2 size={16} className="text-emerald-500" /><p className="text-sm font-semibold text-emerald-700">Part updated successfully</p></div>}

      {/* Section 1 — Part Info */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center"><Package size={18} className="text-white" /></div>
            <div>
              <h2 className="font-black text-slate-900 text-lg">{part.name}</h2>
              <code className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{part.sku}</code>
            </div>
          </div>
          {!editing && (
            <button id="mgr-edit-part-btn" onClick={startEdit} className="inline-flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 transition-all">
              <Edit3 size={13} /> Edit
            </button>
          )}
        </div>

        {!editing && (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-5">
            {[
              { label: "Category",       value: <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">{part.category}</span> },
              { label: "Cost Price",     value: <span className="font-bold text-slate-700">{formatPKR(part.costPrice)}</span> },
              { label: "Sell Price",     value: <span className="font-bold text-emerald-700">{formatPKR(part.sellPrice)}</span> },
              { label: "Low Stock Limit", value: <span className="font-bold text-slate-700">{part.lowStockLimit} units</span> },
              { label: "Supplier",       value: <span className="text-slate-600">{part.supplier || "—"}</span> },
              { label: "Last Updated",   value: <span className="text-slate-500 text-xs">{formatDate(part.updatedAt)}</span> },
            ].map(({ label, value }) => (
              <div key={label}><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p><div className="text-sm">{value}</div></div>
            ))}
          </div>
        )}

        {editing && (
          <div className="p-6 space-y-4">
            {editError && <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><AlertTriangle size={15} className="text-red-500" /><p className="text-sm font-semibold text-red-700">{editError}</p></div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { id: "mgr-edit-name", label: "Part Name", key: "name", type: "text" },
                { id: "mgr-edit-category", label: "Category", key: "category", type: "text" },
                { id: "mgr-edit-cost", label: "Cost Price (PKR)", key: "costPrice", type: "number" },
                { id: "mgr-edit-sell", label: "Sell Price (PKR)", key: "sellPrice", type: "number" },
                { id: "mgr-edit-limit", label: "Low Stock Limit", key: "lowStockLimit", type: "number" },
                { id: "mgr-edit-supplier", label: "Supplier", key: "supplier", type: "text" },
              ].map(({ id, label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{label}</label>
                  <input id={id} type={type} value={(editForm as any)[key] ?? ""} onChange={e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))} className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button id="mgr-save-edit-btn" onClick={saveEdit} disabled={editLoading} className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl text-white bg-purple-600 hover:bg-purple-700 transition-all">
                {editLoading ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Save size={14} />Save Changes</>}
              </button>
              <button id="mgr-cancel-edit-btn" onClick={cancelEdit} className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2 — Stock Adjustment */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2"><TrendingUp size={18} className="text-purple-600" /><h3 className="font-black text-slate-800">Stock Adjustment</h3></div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Stock</p>
            <p className={`text-3xl font-black ${part.quantity === 0 ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>{part.quantity}</p>
            {isLow && <p className="text-xs font-bold text-amber-600 mt-0.5">⚠ Below limit ({part.lowStockLimit})</p>}
          </div>
        </div>
        <form onSubmit={handleStockAdjust} className="p-6 space-y-4">
          {stockError && <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3"><AlertTriangle size={15} className="text-red-500" /><p className="text-sm font-semibold text-red-700">{stockError}</p></div>}
          {stockSuccess && <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"><CheckCircle2 size={15} className="text-emerald-500" /><p className="text-sm font-semibold text-emerald-700">{stockSuccess}</p></div>}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Movement Type</label>
            <div className="flex flex-wrap gap-2">
              {["added", "adjusted", "returned", "damaged"].map(t => (
                <button key={t} type="button" id={`mgr-stock-type-${t}`} onClick={() => setStockType(t)} className={`text-xs font-bold px-4 py-2 rounded-xl border capitalize transition-all ${stockType === t ? `${MOVEMENT_STYLES[t]} shadow-sm` : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"}`}>{t}</button>
              ))}
            </div>
            {stockType === "adjusted" && <p className="text-xs text-amber-600 font-semibold mt-2">⚠ &quot;Adjusted&quot; sets stock to the exact quantity entered</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Quantity</label>
              <input id="mgr-stock-quantity" type="number" min={1} step={1} value={stockQty} onChange={e => { setStockQty(e.target.value); setStockError(""); }} placeholder={stockType === "adjusted" ? "Set exact amount" : "Units"} className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Note <span className="text-slate-400 font-normal">(optional)</span></label>
              <input id="mgr-stock-note" type="text" value={stockNote} onChange={e => setStockNote(e.target.value)} placeholder="Reason for adjustment" className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
          </div>
          <button id="mgr-update-stock-btn" type="submit" disabled={stockLoading || !stockQty} className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl text-white shadow-md bg-purple-600 hover:bg-purple-700 transition-all active:scale-[0.98] disabled:opacity-50">
            {stockLoading ? <><Loader2 size={16} className="animate-spin" />Updating…</> : <><TrendingUp size={16} />Update Stock</>}
          </button>
        </form>
      </div>

      {/* Section 3 — Movement History */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Clock size={17} className="text-slate-500" /><h3 className="font-black text-slate-800">Movement History</h3>
          <span className="ml-auto text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 font-semibold">Last 50</span>
        </div>
        {movLoading && <div className="flex items-center justify-center py-10 gap-2 text-slate-400"><Loader2 className="animate-spin w-4 h-4" /><span className="text-sm">Loading…</span></div>}
        {!movLoading && movements.length === 0 && (
          <div className="text-center py-12"><Clock size={32} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-400 font-medium">No movements yet</p></div>
        )}
        {!movLoading && movements.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Type", "Quantity", "Before → After", "Performed By", "Date", "Note"].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map(mov => {
                  const style = MOVEMENT_STYLES[mov.type] ?? "bg-slate-100 text-slate-600 border-slate-200";
                  const icon  = MOVEMENT_ICONS[mov.type];
                  const performer = typeof mov.performedBy === "object" ? mov.performedBy.name : "Unknown";
                  return (
                    <tr key={mov._id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5"><span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${style}`}>{icon} {mov.type}</span></td>
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-700">{mov.quantity}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-mono text-slate-500">{mov.previousStock}</span>
                        <span className="text-slate-400 mx-1.5">→</span>
                        <span className={`text-sm font-mono font-bold ${mov.newStock < mov.previousStock ? "text-red-600" : "text-emerald-600"}`}>{mov.newStock}</span>
                      </td>
                      <td className="px-5 py-3.5"><div className="flex items-center gap-1.5 text-sm text-slate-600"><User size={12} className="text-slate-400" />{performer}</div></td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">{formatDate(mov.createdAt)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[160px] truncate">{mov.note ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ManagerPartDetailPage() {
  return (
    <DashboardShell requiredRole="manager">
      {() => <PartDetailContent />}
    </DashboardShell>
  );
}
