"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "assistant";
  content: string;
  id: string;
  diagnostic?: DiagnosticResult;
};

type DiagnosticResult = {
  summary: string;
  causes: { label: string; confidence: number; description: string }[];
  steps: string[];
  parts: string[];
  warning: string | null;
  ticketsAnalysed: number;
};

type EstimateResult = {
  laborMin: number;
  laborMax: number;
  partsMin: number;
  partsMax: number;
  totalMin: number;
  totalMax: number;
  confidence: number;
  breakdown: { item: string; estimatedCost: number }[];
  notes: string;
  samplesUsed: number;
};

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  "iPhone 15 Pro Max screen flickering after water damage",
  "MacBook won't boot after RAM upgrade",
  "Samsung Galaxy battery draining too fast",
  "How to safely reflow solder on a laptop GPU?",
  "iPad charging port not working",
  "PS5 HDMI port replacement procedure",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const color =
    value >= 75 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-bold text-muted-foreground">{value}%</span>
    </div>
  );
}

function DiagnosticCard({ data }: { data: DiagnosticResult }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="mt-4 bg-muted/30 border border-border/60 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-primary/5 border-b border-border/40 hover:bg-primary/8 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          <span className="text-sm font-bold text-primary">AI Diagnosis</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {data.ticketsAnalysed} past tickets analysed
          </span>
        </div>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-foreground font-medium">{data.summary}</p>

              {data.warning && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
                  <ShieldAlert size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">{data.warning}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Probable Causes
                </p>
                <div className="space-y-2.5">
                  {data.causes.map((c, i) => (
                    <div key={i} className="bg-background rounded-xl p-3 border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{c.label}</span>
                      </div>
                      <ConfidenceBar value={c.confidence} />
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {c.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Diagnostic Steps
                </p>
                <ol className="space-y-1.5">
                  {data.steps.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                      <span className="w-5 h-5 bg-primary/15 text-primary font-bold text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {data.parts.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Likely Parts Needed
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.parts.map((p, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EstimatePanel({
  deviceBrand,
  deviceModel,
  issue,
}: {
  deviceBrand: string;
  deviceModel: string;
  issue: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEstimate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/api/ai/estimate", { deviceBrand, deviceModel, issue });
      if (res.data.success) {
        setResult(res.data.data);
      } else {
        setError(res.data.message ?? "Failed");
      }
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <div className="mt-3">
        <button
          onClick={fetchEstimate}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 rounded-xl hover:bg-emerald-500/15 transition-all disabled:opacity-50"
        >
          <DollarSign size={14} />
          {loading ? "Predicting cost…" : "Get AI Estimate"}
        </button>
        {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">Estimated Cost (PKR)</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {result.samplesUsed} samples · {result.confidence}% confidence
          </span>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-foreground">
            PKR {result.totalMin.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">–</span>
          <span className="text-2xl font-black text-foreground">
            {result.totalMax.toLocaleString()}
          </span>
        </div>
        <div className="space-y-1.5">
          {result.breakdown.map((b, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{b.item}</span>
              <span className="font-semibold text-foreground">
                PKR {b.estimatedCost.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        {result.notes && (
          <p className="text-xs text-muted-foreground italic border-t border-border/40 pt-2">
            {result.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Parse device info from the user message ──────────────────────────────────
function parseDeviceInfo(text: string): { brand: string; model: string } {
  const brands = ["iphone", "samsung", "macbook", "huawei", "oneplus", "xiaomi", "oppo", "vivo"];
  const lower = text.toLowerCase();
  const brand = brands.find((b) => lower.includes(b)) ?? "";
  const modelMatch = text.match(/\b(iphone\s[\d\w]+|galaxy\s[a-z0-9]+|macbook\s[\w]+|\w+\s[0-9]+)\b/i);
  const model = modelMatch ? modelMatch[0] : "";
  return { brand, model };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TechnicianAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput("");
    const userMessage: Message = {
      role: "user",
      content: msg,
      id: Date.now().toString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const { brand, model } = parseDeviceInfo(msg);

      const res = await api.post("/api/ai/diagnostic", {
        deviceBrand: brand || undefined,
        deviceModel: model || undefined,
        issue: msg,
      });

      if (!res.data.success) throw new Error(res.data.message);

      const diagnostic: DiagnosticResult = res.data.data;

      const aiMsg: Message = {
        role: "assistant",
        content: diagnostic.summary,
        id: (Date.now() + 1).toString(),
        diagnostic,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        role: "assistant",
        content: `⚠️ ${err.response?.data?.message ?? err.message ?? "AI diagnostic failed. Check your API key and connection."}`,
        id: (Date.now() + 1).toString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const setHelpful = (idx: number, helpful: boolean) => {
    setMessages((prev) =>
      prev.map((msg, i) => (i === idx ? { ...msg, helpful } : msg))
    );
  };

  return (
    <DashboardShell requiredRole="technician">
      {() => (
        <div className="flex flex-col h-[calc(100dvh-4rem)] w-full max-w-5xl mx-auto overflow-hidden relative">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-64 bg-primary/8 rounded-full blur-[80px]" />
            <div className="absolute bottom-24 right-1/4 w-72 h-48 bg-violet-500/5 rounded-full blur-[80px]" />
          </div>

          {/* Header */}
          <div className="relative flex items-center justify-between px-4 md:px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-xl flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 bg-gradient-to-br from-primary to-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-primary/30">
                  <Bot size={18} className="text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-black text-foreground tracking-tight">
                  AI Diagnostic Assistant
                </h1>
                <p className="text-xs text-muted-foreground font-medium">
                  Powered by Claude · Uses your shop's real repair history
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-muted border border-border/50"
                >
                  Clear
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <Zap size={11} />
                Live AI
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="relative flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 scroll-smooth">
            <AnimatePresence>
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-8 mt-4 md:mt-12"
                >
                  <div className="text-center max-w-lg mx-auto">
                    <motion.div
                      initial={{ scale: 0.8, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-20 h-20 bg-gradient-to-br from-primary/20 to-violet-500/10 border border-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                    >
                      <Sparkles size={36} className="text-primary" />
                    </motion.div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight mb-3">
                      What needs diagnosing?
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      Describe the device and symptoms. Claude analyses your shop's real repair
                      history to give you accurate probable causes and steps.
                    </p>
                  </div>
                  <div className="max-w-2xl mx-auto">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                      <Sparkles size={11} /> Try asking
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {QUICK_PROMPTS.map((p, i) => (
                        <motion.button
                          key={p}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.08 }}
                          onClick={() => sendMessage(p)}
                          className="group text-left px-4 py-3.5 bg-card border border-border/60 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 transition-all duration-200"
                        >
                          {p}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "user" ? (
                    <div className="max-w-[80%] md:max-w-[65%] bg-primary text-primary-foreground rounded-3xl rounded-tr-md px-5 py-3.5 text-sm font-medium shadow-md shadow-primary/20">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-[92%] md:max-w-[85%] w-full">
                      <div className="bg-card border border-border/60 rounded-3xl rounded-tl-md shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-gradient-to-br from-primary to-violet-600 rounded-md flex items-center justify-center">
                              <Bot size={11} className="text-white" />
                            </div>
                            <span className="text-xs font-bold text-primary tracking-wide">
                              AI DIAGNOSIS
                            </span>
                          </div>
                          <CopyButton text={msg.content} />
                        </div>
                        <div className="px-5 py-4">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {msg.content}
                          </p>
                          {msg.diagnostic && (
                            <>
                              <DiagnosticCard data={msg.diagnostic} />
                              {msg.diagnostic.causes.length > 0 && (
                                <EstimatePanel
                                  deviceBrand={
                                    messages.find((m) => m.role === "user")?.content ?? ""
                                  }
                                  deviceModel=""
                                  issue={
                                    messages.find((m) => m.role === "user")?.content ?? ""
                                  }
                                />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-card border border-border/60 rounded-3xl rounded-tl-md px-5 py-4 flex items-center gap-3">
                  <div className="w-5 h-5 bg-gradient-to-br from-primary to-violet-600 rounded-md flex items-center justify-center flex-shrink-0">
                    <Bot size={11} className="text-white" />
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Analysing with your shop's repair data…
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} className="h-1" />
          </div>

          {/* Input */}
          <div className="relative px-4 md:px-6 py-4 bg-background/80 backdrop-blur-xl border-t border-border/40 flex-shrink-0">
            <div className="max-w-5xl mx-auto relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Device brand, model, symptoms, error codes…"
                className="w-full pl-5 pr-14 py-3.5 bg-card border border-border/60 rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all text-sm font-medium shadow-sm"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-primary text-primary-foreground rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/30 hover:opacity-90 transition-all"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Send size={15} />
                )}
              </motion.button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1.5">
              <AlertCircle size={11} />
              AI advice is for guidance only — verify with manufacturer documentation.
            </p>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}