"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import api from "@/lib/api";
import { Package, ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

const CATEGORY_SUGGESTIONS = [
  "Screen", "Battery", "Charging Port", "Speaker",
  "Camera", "Motherboard", "Back Cover", "Other"
];

function AddPartForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", sku: "", category: "", costPrice: "",
    sellPrice: "", lowStockLimit: "5", initialQuantity: "0",
    description: "", supplier: "",
  });
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [topError, setTopError] = useState("");
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [sellWarn, setSellWarn] = useState(false);

  const handleChange = (field: string, value: string) => {
    const val = field === "sku" ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
    setTopError("");
    if (field === "sellPrice" || field === "costPrice") {
      const cost = field === "costPrice" ? Number(value) : Number(form.costPrice);
      const sell = field === "sellPrice" ? Number(value) : Number(form.sellPrice);
      setSellWarn(Boolean(cost && sell && sell <= cost));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim())     errs.name      = "Part name is required";
    if (!form.sku.trim())      errs.sku       = "SKU is required";
    if (!form.category.trim()) errs.category  = "Category is required";
    if (!form.costPrice)       errs.costPrice = "Cost price is required";
    if (!form.sellPrice)       errs.sellPrice = "Sell price is required";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await api.post("/api/parts", {
        name: form.name.trim(), sku: form.sku.trim().toUpperCase(),
        category: form.category.trim(), costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice), lowStockLimit: Number(form.lowStockLimit) || 5,
        initialQuantity: Number(form.initialQuantity) || 0,
        description: form.description.trim() || undefined, supplier: form.supplier.trim() || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push("/dashboard/manager/inventory"), 1200);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrors(prev => ({ ...prev, sku: "This SKU already exists in your inventory" }));
      } else {
        setTopError(err.response?.data?.message ?? "Failed to create part");
      }
    } finally { setLoading(false); }
  };

  const inputBase = "w-full px-4 py-2.5 text-sm bg-slate-50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all";
  const inputClass = (f: string) => `${inputBase} ${errors[f] ? "border-red-300" : "border-slate-200"}`;

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
        <h2 className="text-xl font-black text-slate-900">Part Created!</h2>
        <p className="text-slate-500 mt-2">Redirecting to inventory…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/dashboard/manager/inventory")} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Add New Part</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create a part in your inventory catalog</p>
        </div>
      </div>

      {topError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <p className="text-sm font-semibold text-red-700">{topError}</p>
        </div>
      )}

      {sellWarn && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
          <p className="text-sm font-semibold text-amber-700">Sell price is ≤ cost price — margin will be zero or negative.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
            <Package size={18} className="text-white" />
          </div>
          <p className="font-bold text-slate-700">Part Details</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Part Name <span className="text-red-500">*</span></label>
          <input id="mgr-part-name" type="text" placeholder="e.g. iPhone 13 Screen" value={form.name} onChange={e => handleChange("name", e.target.value)} className={inputClass("name")} />
          {errors.name && <p className="text-xs text-red-500 mt-1 font-medium">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">SKU <span className="text-red-500">*</span></label>
            <input id="mgr-part-sku" type="text" placeholder="e.g. IPH13-SCR-BLK" value={form.sku} onChange={e => handleChange("sku", e.target.value)} className={`${inputClass("sku")} font-mono`} />
            {errors.sku && <p className="text-xs text-red-500 mt-1 font-medium">{errors.sku}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Category <span className="text-red-500">*</span></label>
            <input id="mgr-part-category" type="text" list="mgr-category-list" placeholder="e.g. Screen" value={form.category} onChange={e => handleChange("category", e.target.value)} className={inputClass("category")} />
            <datalist id="mgr-category-list">{CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
            {errors.category && <p className="text-xs text-red-500 mt-1 font-medium">{errors.category}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Cost Price (PKR) <span className="text-red-500">*</span></label>
            <input id="mgr-cost-price" type="number" min={0} step="1" placeholder="0" value={form.costPrice} onChange={e => handleChange("costPrice", e.target.value)} className={inputClass("costPrice")} />
            {errors.costPrice && <p className="text-xs text-red-500 mt-1 font-medium">{errors.costPrice}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Sell Price (PKR) <span className="text-red-500">*</span></label>
            <input id="mgr-sell-price" type="number" min={0} step="1" placeholder="0" value={form.sellPrice} onChange={e => handleChange("sellPrice", e.target.value)} className={inputClass("sellPrice")} />
            {errors.sellPrice && <p className="text-xs text-red-500 mt-1 font-medium">{errors.sellPrice}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Low Stock Alert Threshold</label>
          <input id="mgr-low-stock-limit" type="number" min={0} step="1" value={form.lowStockLimit} onChange={e => handleChange("lowStockLimit", e.target.value)} className={inputClass("lowStockLimit")} />
          <p className="text-xs text-slate-400 mt-1">Alert when stock falls to or below this number. Default: 5</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Initial Stock Quantity</label>
          <input
            id="mgr-initial-quantity"
            type="number"
            min={0}
            step="1"
            value={form.initialQuantity}
            onChange={e => handleChange("initialQuantity", e.target.value)}
            className={inputClass("initialQuantity")}
          />
          <p className="text-xs text-slate-400 mt-1">Starting stock count for this part. Leave 0 to add stock later via movements.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Supplier <span className="text-slate-400 font-normal">(optional)</span></label>
          <input id="mgr-supplier" type="text" placeholder="e.g. Ali Parts Wholesale" value={form.supplier} onChange={e => handleChange("supplier", e.target.value)} className={inputClass("supplier")} />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description <span className="text-slate-400 font-normal">(optional)</span></label>
          <textarea id="mgr-description" rows={3} placeholder="Additional notes…" value={form.description} onChange={e => handleChange("description", e.target.value)} className={`${inputClass("description")} resize-none`} />
        </div>

        <div className="pt-2">
          <button id="mgr-submit-part" type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-xl text-white shadow-md bg-purple-600 hover:bg-purple-700 transition-all active:scale-[0.98]">
            {loading ? <><Loader2 size={16} className="animate-spin" />Creating Part…</> : <><Package size={16} />Create Part</>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ManagerNewPartPage() {
  return (
    <DashboardShell requiredRole="manager">
      {() => <AddPartForm />}
    </DashboardShell>
  );
}
