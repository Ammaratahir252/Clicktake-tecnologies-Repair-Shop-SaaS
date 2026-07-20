"use client";

// Stock movement history — surfaces the (previously frontend-less)
// GET /api/stock-movements audit trail on the owner/manager inventory pages.
// The API is owner/manager-only; other roles never render this component.

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import { History, Loader2, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

const TYPE_STYLES: Record<string, string> = {
  restock:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  used:       "bg-blue-100 text-blue-700 border-blue-200",
  adjustment: "bg-amber-100 text-amber-700 border-amber-200",
  returned:   "bg-purple-100 text-purple-700 border-purple-200",
  damaged:    "bg-red-100 text-red-700 border-red-200",
};

const TYPE_FILTERS = ["all", "restock", "used", "adjustment", "returned", "damaged"];
const PAGE_SIZE = 15;

export default function StockMovementHistory() {
  const [movements, setMovements] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let url = `/api/stock-movements?page=${page}&limit=${PAGE_SIZE}`;
      if (typeFilter !== "all") url += `&type=${typeFilter}`;
      const res = await api.get(url);
      setMovements(res.data?.data?.movements ?? []);
      setTotal(res.data?.data?.total ?? 0);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load stock history.");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-border">
        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
          <History size={16} className="text-primary" /> Stock Movement History
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                typeFilter === t
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 size={18} className="animate-spin mr-2" />
          <span className="text-sm font-medium">Loading history…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 m-5 p-4 bg-destructive/10 text-destructive rounded-xl text-sm font-semibold">
          <AlertCircle size={16} /> {error}
        </div>
      ) : movements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No stock movements {typeFilter !== "all" ? `of type "${typeFilter}" ` : ""}recorded yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                <th className="px-5 py-3">Part</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Qty</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3">By</th>
                <th className="px-5 py-3">When</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium divide-y divide-border">
              {movements.map((m) => (
                <tr key={m._id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-bold text-foreground">{m.partId?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{m.partId?.sku ?? ""}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${TYPE_STYLES[m.type] ?? "bg-muted text-muted-foreground border-border"}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-bold text-foreground">{m.quantity}</td>
                  <td className="px-5 py-3 text-muted-foreground">{m.previousStock} → <span className="font-bold text-foreground">{m.newStock}</span></td>
                  <td className="px-5 py-3 text-muted-foreground">{m.performedBy?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium">
            Page {page} of {totalPages} · {total} movement{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 bg-muted rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 bg-muted rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
