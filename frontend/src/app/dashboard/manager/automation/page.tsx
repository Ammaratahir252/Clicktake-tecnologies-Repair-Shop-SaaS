"use client";

/**
 * app/dashboard/manager/automation/page.tsx
 * Module 8.2 — Visual Workflow Automation Builder
 *
 * COPY TO: src/app/dashboard/manager/automation/page.tsx
 * Also add a nav link to manager sidebar pointing here.
 *
 * Rules are stored in MongoDB (automationRules collection).
 * Each new rule is validated by Claude before saving.
 * RBAC: manager, owner
 */

import DashboardShell from "@/components/DashboardShell";
import { useState, useEffect } from "react";
import {
  Zap,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "low" | "medium" | "high";

type Rule = {
  _id: string;
  name: string;
  description?: string;
  trigger: string;
  triggerValue?: string;
  action: string;
  actionTarget?: string;
  isActive: boolean;
  triggerCount: number;
  aiValidation?: {
    isValid: boolean;
    riskLevel: RiskLevel;
    riskReason: string;
  };
  createdAt: string;
};

const TRIGGER_OPTIONS = [
  { value: "ticket_status_changed", label: "Ticket status changes to…" },
  { value: "estimate_amount_exceeds", label: "Estimate amount exceeds PKR…" },
  { value: "part_stock_below_limit", label: "Part stock falls below limit" },
  { value: "ticket_created", label: "New ticket is created" },
  { value: "ticket_overdue", label: "Ticket passes SLA deadline" },
];

const ACTION_OPTIONS = [
  { value: "notify_manager", label: "Notify manager (in-app)" },
  { value: "send_sms", label: "Send SMS to customer" },
  { value: "send_email", label: "Send email notification" },
  { value: "auto_assign_senior_tech", label: "Auto-assign to senior technician" },
  { value: "flag_for_review", label: "Flag ticket for review" },
  { value: "create_reorder_alert", label: "Create inventory reorder alert" },
];

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
  medium: "text-amber-600 bg-amber-500/10 border-amber-500/30",
  high: "text-red-600 bg-red-500/10 border-red-500/30",
};

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: Rule;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const triggerLabel =
    TRIGGER_OPTIONS.find((t) => t.value === rule.trigger)?.label ?? rule.trigger;
  const actionLabel =
    ACTION_OPTIONS.find((a) => a.value === rule.action)?.label ?? rule.action;

  return (
    <div
      className={`border rounded-2xl p-5 transition-all ${
        rule.isActive
          ? "bg-card border-border/60"
          : "bg-muted/30 border-border/30 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-foreground text-sm">{rule.name}</h3>
            {rule.aiValidation && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                  RISK_COLORS[rule.aiValidation.riskLevel]
                }`}
              >
                {rule.aiValidation.riskLevel} risk
              </span>
            )}
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              triggered {rule.triggerCount}×
            </span>
          </div>
          {rule.description && (
            <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onToggle(rule._id, rule.isActive)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={rule.isActive ? "Deactivate" : "Activate"}
          >
            {rule.isActive ? (
              <ToggleRight size={22} className="text-primary" />
            ) : (
              <ToggleLeft size={22} />
            )}
          </button>
          <button
            onClick={() => onDelete(rule._id)}
            className="text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* IF/THEN display */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-violet-600 bg-violet-500/10 border border-violet-500/20 px-2 py-1 rounded-lg">
          IF
        </span>
        <span className="text-xs text-muted-foreground">
          {triggerLabel}
          {rule.triggerValue ? ` "${rule.triggerValue}"` : ""}
        </span>
        <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg">
          THEN
        </span>
        <span className="text-xs text-muted-foreground">
          {actionLabel}
          {rule.actionTarget ? ` → ${rule.actionTarget}` : ""}
        </span>
      </div>

      {rule.aiValidation?.riskReason && (
        <p className="text-xs text-muted-foreground/70 italic mt-2">
          AI note: {rule.aiValidation.riskReason}
        </p>
      )}
    </div>
  );
}

// ─── New Rule Form ────────────────────────────────────────────────────────────

function NewRuleForm({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    trigger: "ticket_status_changed",
    triggerValue: "",
    action: "notify_manager",
    actionTarget: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async () => {
    if (!form.name.trim()) {
      setError("Rule name is required");
      return;
    }
    setLoading(true);
    setError(null);
    setValidationIssues([]);
    try {
      const res = await api.post("/api/ai/automation", form);
      if (res.data.success) {
        onCreated();
        onClose();
      } else {
        if (res.data.data?.issues) {
          setValidationIssues(res.data.data.issues);
        }
        setError(res.data.message ?? "Failed to create rule");
      }
    } catch (e: any) {
      const d = e.response?.data;
      if (d?.data?.issues) setValidationIssues(d.data.issues);
      setError(d?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-background border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-primary" />
            <h2 className="font-black text-foreground">New Automation Rule</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Rule Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Alert manager on high estimate"
              className="mt-1.5 w-full px-4 py-2.5 bg-muted/30 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional — why does this rule exist?"
              className="mt-1.5 w-full px-4 py-2.5 bg-muted/30 border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* IF section */}
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-violet-600 uppercase tracking-wider">
              IF (trigger)
            </p>
            <select
              value={form.trigger}
              onChange={(e) => set("trigger", e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {TRIGGER_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {(form.trigger === "ticket_status_changed" ||
              form.trigger === "estimate_amount_exceeds") && (
              <input
                type="text"
                value={form.triggerValue}
                onChange={(e) => set("triggerValue", e.target.value)}
                placeholder={
                  form.trigger === "ticket_status_changed"
                    ? "e.g. in_repair"
                    : "e.g. 5000"
                }
                className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
          </div>

          {/* THEN section */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-bold text-primary uppercase tracking-wider">
              THEN (action)
            </p>
            <select
              value={form.action}
              onChange={(e) => set("action", e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {ACTION_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            {(form.action === "send_sms" || form.action === "send_email") && (
              <input
                type="text"
                value={form.actionTarget}
                onChange={(e) => set("actionTarget", e.target.value)}
                placeholder={
                  form.action === "send_sms" ? "Phone number" : "Email address"
                }
                className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            )}
          </div>

          {/* Errors / validation issues */}
          {validationIssues.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-xs font-bold text-red-600 mb-1">AI Validation Issues:</p>
              <ul className="space-y-1">
                {validationIssues.map((issue, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
                    <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && !validationIssues.length && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          {/* AI note */}
          <p className="text-xs text-muted-foreground/60 italic flex items-center gap-1.5">
            <Zap size={11} />
            Claude will validate this rule before saving to your database.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/60 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground border border-border/60 rounded-xl hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-primary/30"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                AI Validating…
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                Create Rule
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AutomationPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/ai/automation");
      if (res.data.success) setRules(res.data.data ?? []);
    } catch {
      setError("Failed to load rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const toggleRule = async (id: string, currentActive: boolean) => {
    try {
      await api.patch(`/api/ai/automation/${id}`, { isActive: !currentActive });
      setRules((prev) =>
        prev.map((r) => (r._id === id ? { ...r, isActive: !currentActive } : r))
      );
    } catch {
      setError("Failed to toggle rule");
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Delete this automation rule?")) return;
    try {
      await api.delete(`/api/ai/automation/${id}`);
      setRules((prev) => prev.filter((r) => r._id !== id));
    } catch {
      setError("Failed to delete rule");
    }
  };

  const activeCount = rules.filter((r) => r.isActive).length;

  return (
    <DashboardShell requiredRole={["manager", "owner"]}>
      {() => (
        <div className="max-w-3xl">
          {/* Page header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
                <Zap size={22} className="text-primary" />
                Automation Rules
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                IF/THEN rules saved in your database · AI validates each rule before saving
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:opacity-90 shadow-md shadow-primary/30 transition-all"
            >
              <Plus size={16} />
              New Rule
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total Rules", value: rules.length },
              { label: "Active", value: activeCount },
              { label: "Inactive", value: rules.length - activeCount },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-card border border-border/60 rounded-2xl p-4 text-center"
              >
                <p className="text-2xl font-black text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Rules list */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-20">
              <Zap size={40} className="text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-medium">No automation rules yet.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Create your first IF/THEN rule to automate shop workflows.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <RuleCard
                  key={rule._id}
                  rule={rule}
                  onToggle={toggleRule}
                  onDelete={deleteRule}
                />
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 mt-4">{error}</p>
          )}

          {showForm && (
            <NewRuleForm
              onCreated={fetchRules}
              onClose={() => setShowForm(false)}
            />
          )}
        </div>
      )}
    </DashboardShell>
  );
}
