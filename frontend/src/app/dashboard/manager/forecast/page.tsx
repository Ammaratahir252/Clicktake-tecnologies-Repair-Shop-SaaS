"use client";

/**
 * app/dashboard/manager/forecast/page.tsx
 * Module 8.3 — AI Inventory Demand Forecaster
 *
 * Calls GET /api/ai/forecast — real parts + stockMovements data → Claude analysis
 * RBAC: manager, owner
 */

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import {
  BarChart2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Minus,
  Loader2,
  Package,
  Lightbulb,
  Zap,
} from "lucide-react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Urgency = "critical" | "high" | "medium" | "low";
type Health = "good" | "fair" | "poor";

type ForecastAlert = {
  partName: string;
  sku: string;
  currentStock: number;
  urgency: Urgency;
  recommendedReorderQty: number;
  reason: string;
};

type ForecastResult = {
  summary: string;
  alerts: ForecastAlert[];
  insights: string[];
  overallHealth: Health;
  partsAnalysed: number;
  movementsAnalysed: number;
  model: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const URGENCY_CONFIG: Record<Urgency, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "text-red-700",     bg: "bg-red-500/10",     border: "border-red-500/30",     label: "CRITICAL" },
  high:     { color: "text-orange-700",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  label: "HIGH" },
  medium:   { color: "text-amber-700",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "MEDIUM" },
  low:      { color: "text-emerald-700", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "LOW" },
};

const HEALTH_CONFIG: Record<Health, { color: string; bg: string; icon: typeof CheckCircle2; label: string }> = {
  good: { color: "text-emerald-700", bg: "bg-emerald-500/10", icon: CheckCircle2, label: "Good" },
  fair: { color: "text-amber-700",   bg: "bg-amber-500/10",   icon: Minus,        label: "Fair" },
  poor: { color: "text-red-700",     bg: "bg-red-500/10",     icon: TrendingDown, label: "Poor" },
};

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert }: { alert: ForecastAlert }) {
  const cfg = URGENCY_CONFIG[alert.urgency] ?? URGENCY_CONFIG.medium;
  return (
    <div className={`border rounded-2xl p-5 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-foreground text-sm">{alert.partName}</h3>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">SKU: {alert.sku}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-muted-foreground">In stock</p>
          <p className={`text-xl font-black ${cfg.color}`}>{alert.currentStock}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{alert.reason}</p>
      <div className="mt-3 flex items-center gap-2 bg-background/60 border border-border/40 rounded-xl px-4 py-2.5">
        <TrendingUp size={14} className="text-primary flex-shrink-0" />
        <span className="text-sm text-foreground">
          Reorder <span className="font-black text-primary">{alert.recommendedReorderQty} units</span>
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ForecastPage() {
  return (
    <DashboardShell requiredRole={["manager", "owner"]}>
      {() => <ForecastContent />}
    </DashboardShell>
  );
}

function ForecastContent() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/ai/forecast");
      if (res.data.success) {
        setResult(res.data.data);
      } else {
        setError(res.data.message ?? "Forecast failed");
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Network error — check your API key and connection.");
    } finally {
      setLoading(false);
    }
  };

  const healthCfg = result ? HEALTH_CONFIG[result.overallHealth] : null;
  const HealthIcon = healthCfg?.icon ?? CheckCircle2;

  return (
    <div className="max-w-3xl space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <BarChart2 size={22} className="text-primary" />
            Demand Forecaster
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI analyses your real inventory &amp; usage data · Powered by Claude
          </p>
        </div>
        <button
          onClick={runForecast}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 shadow-md shadow-primary/30 transition-all"
        >
          {loading ? (
            <><Loader2 size={15} className="animate-spin" />Analysing…</>
          ) : (
            <><RefreshCw size={15} />{result ? "Re-run Forecast" : "Run AI Forecast"}</>
          )}
        </button>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!loading && !result && !error && (
        <div className="text-center py-20 bg-card border border-border/60 rounded-2xl">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-primary/60" />
          </div>
          <h3 className="font-bold text-foreground mb-1">Ready to forecast</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Click "Run AI Forecast" to analyse your inventory and get reorder recommendations powered by Claude.
          </p>
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-3 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Overall health + summary */}
          <div className={`border rounded-2xl p-6 ${healthCfg?.bg} ${healthCfg?.bg.replace("bg-", "border-").replace("/10", "/30")}`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl border ${healthCfg?.bg} ${healthCfg?.bg.replace("bg-", "border-").replace("/10", "/20")}`}>
                <HealthIcon size={22} className={healthCfg?.color} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-black text-foreground">Inventory Health</h2>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${healthCfg?.color} ${healthCfg?.bg} ${healthCfg?.bg.replace("bg-", "border-").replace("/10", "/30")}`}>
                    {healthCfg?.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{result.summary}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <span className="text-xs text-muted-foreground bg-background/60 border border-border/40 rounded-full px-3 py-1 font-semibold">
                {result.partsAnalysed} parts analysed
              </span>
              <span className="text-xs text-muted-foreground bg-background/60 border border-border/40 rounded-full px-3 py-1 font-semibold">
                {result.movementsAnalysed} movements (30d)
              </span>
              <span className="text-xs text-muted-foreground bg-background/60 border border-border/40 rounded-full px-3 py-1 font-semibold flex items-center gap-1">
                <Zap size={10} /> {result.model}
              </span>
            </div>
          </div>

          {/* Alerts */}
          {result.alerts.length > 0 && (
            <section>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Reorder Alerts ({result.alerts.length})
              </h2>
              <div className="space-y-3">
                {result.alerts.map((alert, i) => (
                  <AlertCard key={i} alert={alert} />
                ))}
              </div>
            </section>
          )}

          {result.alerts.length === 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                No urgent reorder alerts — all parts are above their reorder thresholds.
              </p>
            </div>
          )}

          {/* Insights */}
          {result.insights.length > 0 && (
            <section>
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Lightbulb size={14} className="text-primary" />
                AI Insights
              </h2>
              <div className="space-y-2">
                {result.insights.map((insight, i) => (
                  <div key={i} className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-start gap-3">
                    <span className="w-5 h-5 bg-primary/15 text-primary font-black text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
