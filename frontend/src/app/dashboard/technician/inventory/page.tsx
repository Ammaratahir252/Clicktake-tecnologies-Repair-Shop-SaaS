"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import api from "@/lib/api";
import {
  Package,
  Search,
  AlertTriangle,
  Loader2,
  Filter,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";

interface Part {
  _id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  lowStockLimit: number;
}

function ReadOnlyInventory({ role }: { role: "technician" | "frontdesk" }) {
  const [parts, setParts] = useState<Part[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [sortBy, setSortBy] = useState("name");

  const fetchParts = useCallback(async (q: string, cat: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("search", q);
      if (cat) params.set("category", cat);
      params.set("limit", "100");
      const res = await api.get(`/api/parts?${params.toString()}`);
      setParts(res.data.data.parts);
      setTotal(res.data.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParts("", "");
  }, [fetchParts]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => fetchParts(val, category), 400);
    setTimer(t);
  };

  const handleCategory = (val: string) => {
    setCategory(val);
    fetchParts(search, val);
  };

  const categories = Array.from(new Set(parts.map((p) => p.category))).sort();

  // Stats
  const outOfStock = parts.filter((p) => p.quantity === 0).length;
  const lowStock = parts.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockLimit).length;
  const inStock = parts.length - outOfStock - lowStock;

  // Sort parts
  const sortedParts = [...parts].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "quantity-low":
        return a.quantity - b.quantity;
      case "quantity-high":
        return b.quantity - a.quantity;
      case "category":
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 animate-in fade-in slide-in-from-top duration-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Package size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-foreground">Inventory</h1>
            <p className="text-muted-foreground font-medium mt-0.5">
              Read-only view · {role === "technician" ? "Technician" : "Front Desk"} access
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-top duration-700 delay-100">
        <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {inStock}
            </span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">In Stock</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{lowStock}</span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Low Stock</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown size={18} className="text-red-600 dark:text-red-400" />
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {outOfStock}
            </span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Out</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top duration-700 delay-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
            Search & Filter
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id={`${role}-inventory-search`}
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or SKU…"
              className="w-full pl-9 pr-4 py-3 text-sm bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              id={`${role}-category-filter`}
              value={category}
              onChange={(e) => handleCategory(e.target.value)}
              className="w-full pl-8 pr-4 py-3 text-sm bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 text-xs bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
          >
            <option value="name">Part Name (A-Z)</option>
            <option value="quantity-low">Lowest Stock First</option>
            <option value="quantity-high">Highest Stock First</option>
            <option value="category">Category (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top duration-700 delay-300">
        {loading && (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="animate-spin w-5 h-5" />
            <span className="text-sm font-medium">Loading inventory…</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 m-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/30 rounded-xl p-4">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && parts.length === 0 && (
          <div className="text-center py-20">
            <Package size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-bold text-muted-foreground">No parts found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || category ? "Try adjusting your filters" : "Inventory is empty"}
            </p>
          </div>
        )}

        {!loading && !error && parts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border">
                  {["Part Name", "SKU", "Category", "Stock Level"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-bold text-muted-foreground uppercase tracking-widest px-5 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedParts.map((part) => {
                  const isOut = part.quantity === 0;
                  const isLow = part.quantity > 0 && part.quantity <= part.lowStockLimit;

                  return (
                    <tr
                      key={part._id}
                      className={`border-b border-border hover:bg-muted/50 transition-colors ${
                        isOut ? "bg-red-50/30 dark:bg-red-950/20" : ""
                      }`}
                    >
                      <td className="px-5 py-4 font-bold text-foreground text-sm">{part.name}</td>
                      <td className="px-5 py-4">
                        <code className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
                          {part.sku}
                        </code>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {part.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-700/50">
                            <TrendingDown size={12} />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50">
                            <AlertCircle size={12} />
                            Low - {part.quantity}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/50">
                            <CheckCircle size={12} />
                            {part.quantity} Available
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground font-medium flex items-center justify-between">
              <span>
                {total} total part{total !== 1 ? "s" : ""} · {sortedParts.length} showing
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 bg-card rounded-lg border border-border">
                <Zap size={12} className="text-primary" />
                Read-only access
              </span>
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