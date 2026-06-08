"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import api from "@/lib/api";
import { Package, Search, AlertTriangle, Loader2, Filter } from "lucide-react";

interface Part {
  _id: string; name: string; sku: string; category: string;
  quantity: number; lowStockLimit: number;
}

function ReadOnlyInventory({ role }: { role: "technician" | "frontdesk" }) {
  const [parts, setParts]     = useState<Part[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [search, setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const [timer, setTimer]     = useState<NodeJS.Timeout | null>(null);

  const fetchParts = useCallback(async (q: string, cat: string) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (q)   params.set("search", q);
      if (cat) params.set("category", cat);
      params.set("limit", "50");
      const res = await api.get(`/api/parts?${params.toString()}`);
      setParts(res.data.data.parts);
      setTotal(res.data.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to load inventory");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchParts("", ""); }, [fetchParts]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => fetchParts(val, category), 400);
    setTimer(t);
  };

  const handleCategory = (val: string) => { setCategory(val); fetchParts(search, val); };
  const categories = Array.from(new Set(parts.map(p => p.category))).sort();

  const accent = role === "technician" ? "amber" : "emerald";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900">Inventory</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Read-only view · {role === "technician" ? "Technician" : "Front Desk"} access
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id={`${role}-inventory-search`}
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className={`w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-${accent}-500 transition-all`}
          />
        </div>
        <div className="relative min-w-[160px]">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            id={`${role}-category-filter`}
            value={category}
            onChange={e => handleCategory(e.target.value)}
            className={`w-full pl-8 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-${accent}-500 appearance-none cursor-pointer`}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="animate-spin w-5 h-5" /><span className="text-sm">Loading inventory…</span>
          </div>
        )}
        {!loading && error && (
          <div className="flex items-center gap-3 m-6 bg-red-50 border border-red-100 rounded-xl p-4">
            <AlertTriangle size={16} className="text-red-400" /><p className="text-sm font-semibold text-red-600">{error}</p>
          </div>
        )}
        {!loading && !error && parts.length === 0 && (
          <div className="text-center py-20">
            <Package size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="font-bold text-slate-500">No parts found</p>
            <p className="text-sm text-slate-400 mt-1">{search || category ? "Try adjusting your filters" : "Inventory is empty"}</p>
          </div>
        )}
        {!loading && !error && parts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Part Name", "SKU", "Category", "Stock"].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parts.map(part => {
                  const isOut = part.quantity === 0;
                  const isLow = part.quantity <= part.lowStockLimit && !isOut;
                  return (
                    <tr key={part._id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${isOut ? "bg-red-50/30" : ""}`}>
                      <td className="px-5 py-3.5 font-bold text-slate-800 text-sm">{part.name}</td>
                      <td className="px-5 py-3.5">
                        <code className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{part.sku}</code>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${accent === "amber" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                          {part.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            ⚠ {part.quantity}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                            ✓ {part.quantity}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 font-medium">
              {total} total part{total !== 1 ? "s" : ""} · Read-only
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TechnicianInventoryPage() {
  return (
    <DashboardShell requiredRole="technician">
      {() => <ReadOnlyInventory role="technician" />}
    </DashboardShell>
  );
}
