"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import api from "@/lib/api";
import {
  Package, Plus, Search, AlertTriangle, Loader2,
  ChevronRight, Filter, TrendingDown, RefreshCw
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Part {
  _id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
  lowStockLimit: number;
  supplier?: string;
  isActive: boolean;
}

interface PartsData {
  parts: Part[];
  total: number;
  page: number;
  limit: number;
  lowStockCount: number;
  outOfStockCount: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StockBadge({ qty, limit }: { qty: number; limit: number }) {
  if (qty === 0)
    return <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">Out of Stock</span>;
  if (qty <= limit)
    return <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">⚠ {qty}</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">✓ {qty}</span>;
}

function formatPKR(n: number) {
  return `PKR ${n.toLocaleString("en-PK")}`;
}

// ─── Main Content ─────────────────────────────────────────────────────────────

function InventoryContent({ rolePath }: { rolePath: string }) {
  const router = useRouter();
  const [data, setData]               = useState<PartsData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchParts = useCallback(async (q: string, cat: string, ls: boolean) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q)   params.set("search", q);
      if (cat) params.set("category", cat);
      if (ls)  params.set("lowStock", "true");
      params.set("limit", "50");

      const res = await api.get(`/api/parts?${params.toString()}`);
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchParts("", "", false); }, [fetchParts]);

  // Debounced search
  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer) clearTimeout(searchTimer);
    const t = setTimeout(() => fetchParts(val, category, lowStockOnly), 400);
    setSearchTimer(t);
  };

  const handleCategory = (val: string) => {
    setCategory(val);
    fetchParts(search, val, lowStockOnly);
  };

  const handleLowStock = (val: boolean) => {
    setLowStockOnly(val);
    fetchParts(search, category, val);
  };

  // Unique categories from loaded parts
  const categories = Array.from(new Set(data?.parts.map(p => p.category) ?? [])).sort();

  const isOwner = rolePath.includes("/owner/");

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Parts catalog & stock levels</p>
        </div>
        {isOwner && (
          <a
            href={`${rolePath}/new`}
            id="add-part-btn"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm px-4 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            Add Part
          </a>
        )}
      </div>

      {/* ── Status Alert Banners ──────────────────────────────────────────── */}
      {data && data.outOfStockCount > 0 && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl px-5 py-4">
          <AlertTriangle size={20} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-400">
              🚫 {data.outOfStockCount} part{data.outOfStockCount !== 1 ? "s are" : " is"} completely out of stock
            </p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">Restock these parts to fulfil repairs</p>
          </div>
        </div>
      )}
      {data && data.lowStockCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl px-5 py-4">
          <AlertTriangle size={20} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">
              ⚠ {data.lowStockCount} part{data.lowStockCount !== 1 ? "s are" : " is"} running low on stock
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">Stock is at or below each part's alert threshold</p>
          </div>
          <button
            onClick={() => handleLowStock(!lowStockOnly)}
            className="ml-auto text-xs font-bold text-amber-600 dark:text-amber-500 underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-400 transition-colors whitespace-nowrap"
          >
            {lowStockOnly ? "Show All" : "Show Low Only"}
          </button>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="inventory-search"
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Category filter */}
        <div className="relative min-w-[160px]">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            id="category-filter"
            value={category}
            onChange={e => handleCategory(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 text-sm bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Low Stock toggle */}
        <button
          id="low-stock-toggle"
          onClick={() => handleLowStock(!lowStockOnly)}
          className={`inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border transition-all ${
            lowStockOnly
              ? "bg-red-600 text-white border-red-600 shadow-md"
              : "bg-card text-muted-foreground border-border hover:border-red-300 hover:text-red-600"
          }`}
        >
          <TrendingDown size={14} />
          Low Stock Only
        </button>

        {/* Refresh */}
        <button
          onClick={() => fetchParts(search, category, lowStockOnly)}
          className="p-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:bg-muted/80 transition-all"
          title="Refresh"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="animate-spin w-5 h-5" />
            <span className="text-sm font-medium">Loading parts…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 m-6 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <AlertTriangle size={16} className="text-destructive" />
            <p className="text-sm font-semibold text-destructive">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && data?.parts.length === 0 && (
          <div className="text-center py-20">
            <Package size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-bold text-muted-foreground">No parts in inventory</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || category || lowStockOnly ? "Try adjusting your filters" : "Add your first part to get started"}
            </p>
            {!search && !category && !lowStockOnly && isOwner && (
              <a
                href={`${rolePath}/new`}
                className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-all"
              >
                <Plus size={15} /> Add First Part
              </a>
            )}
          </div>
        )}

        {/* Table */}
        {!loading && !error && data && data.parts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border">
                  {["Part Name", "SKU", "Category", "Stock", "Limit", "Cost Price", "Sell Price", "Actions"].map(h => (
                    <th key={h} className="text-left text-xs font-bold text-muted-foreground uppercase tracking-widest px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.parts.map(part => {
                    const isOut = part.quantity === 0;
                    const isLow = !isOut && part.quantity <= part.lowStockLimit;
                    return (
                      <tr
                        key={part._id}
                        className={`border-b border-border hover:bg-muted/50 transition-colors ${
                          isOut ? "bg-red-50/60 dark:bg-red-950/20" : isLow ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
                        }`}
                      >
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-card-foreground text-sm">{part.name}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">{part.sku}</code>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {part.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StockBadge qty={part.quantity} limit={part.lowStockLimit} />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground font-medium">
                        {part.lowStockLimit}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-card-foreground font-semibold">
                        {formatPKR(part.costPrice)}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold text-emerald-700">
                        {formatPKR(part.sellPrice)}
                      </td>
                      <td className="px-5 py-3.5">
                        <a
                          href={`${rolePath}/${part._id}`}
                          id={`view-part-${part._id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg transition-all"
                        >
                          {isOwner ? "Manage" : "View"} <ChevronRight size={12} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>{data.total} total part{data.total !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-3">
                {data.outOfStockCount > 0 && (
                  <span className="text-red-500 font-bold">🚫 {data.outOfStockCount} out of stock</span>
                )}
                {data.lowStockCount > 0 && (
                  <span className="text-amber-600 font-bold">⚠ {data.lowStockCount} low stock</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page Exports ─────────────────────────────────────────────────────────────

export default function OwnerInventoryPage() {
  return (
    <DashboardShell requiredRole="owner">
      {() => <InventoryContent rolePath="/dashboard/owner/inventory" />}
    </DashboardShell>
  );
}

// Made with Bob
