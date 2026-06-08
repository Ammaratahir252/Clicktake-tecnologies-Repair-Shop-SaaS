"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, AlertCircle, RotateCcw, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_PROMPTS = [
  "iPhone 15 Pro Max screen flickering after water damage — possible causes?",
  "MacBook won't boot after RAM upgrade — troubleshooting steps",
  "Samsung Galaxy battery draining too fast — diagnosis checklist",
  "How to safely reflow solder on a laptop GPU?",
];

type Message = { role: "user" | "assistant"; content: string; id: string };

const MOCK_RESPONSE = `## Initial Assessment

Check for physical damage first — corrosion, bent pins, or cracked PCB. Run diagnostic mode if the device is partially functional, and document everything with photos before opening.

## Common Causes

- **Power circuit failure** — inspect the charging IC under microscope
- **Logic board short circuit** — measure resistance at key test points  
- **Software corruption** — check for bootloop pattern (restart every 30–60s)
- **Failed component** — NAND flash, RAM, or blown mosfet are common culprits

## Recommended Steps

1. Backup data immediately if the device powers on at all
2. Run DCPS test — normal idle draw is 0.02–0.05A; short shows 0.4A+
3. Check board under microscope for burn marks or corrosion near liquid damage stickers
4. Test with known-good replacement parts to isolate the fault

## Parts to Check

| Component | Test Method | Normal Reading |
|-----------|-------------|----------------|
| Battery | Multimeter | 3.7–4.2V |
| Charging IC | DCPS | < 0.1A idle |
| NAND | Software diag | No I/O errors |

> **Note:** Always use ESD protection and work on an anti-static mat when handling logic boards.`;

/** Renders markdown-like formatting into React elements */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].startsWith("|---")) {
      const headers = line.split("|").filter(Boolean).map((h) => h.trim());
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(lines[i].split("|").filter(Boolean).map((c) => c.trim()));
        i++;
      }
      elements.push(
        <div key={i} className="overflow-x-auto my-4 rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60">
                {headers.map((h, j) => (
                  <th key={j} className="px-4 py-2.5 text-left font-bold text-foreground border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  {row.map((cell, k) => (
                    <td key={k} className="px-4 py-2.5 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // H2
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-base font-black text-foreground mt-5 mb-2 first:mt-0 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
          {line.replace("## ", "")}
        </h2>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <div key={i} className="border-l-4 border-primary/50 bg-primary/5 pl-4 pr-3 py-2.5 rounded-r-xl my-3 text-sm text-muted-foreground italic">
          {line.replace("> ", "").replace(/\*\*(.*?)\*\*/g, "$1")}
        </div>
      );
      i++;
      continue;
    }

    // Ordered list item
    if (/^\d+\./.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const text = line.replace(/^\d+\.\s*/, "");
      elements.push(
        <div key={i} className="flex gap-3 text-sm text-muted-foreground my-1">
          <span className="w-5 h-5 bg-primary/15 text-primary font-black text-xs rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            {num}
          </span>
          <span className="leading-relaxed" dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, "<strong class='text-foreground font-bold'>$1</strong>") }} />
        </div>
      );
      i++;
      continue;
    }

    // Unordered list item
    if (line.startsWith("- ")) {
      const text = line.replace("- ", "");
      elements.push(
        <div key={i} className="flex gap-2.5 text-sm text-muted-foreground my-1">
          <span className="w-1.5 h-1.5 bg-primary/60 rounded-full flex-shrink-0 mt-2" />
          <span
            className="leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: text.replace(/\*\*(.*?)\*\*/g, "<strong class='text-foreground font-semibold'>$1</strong>"),
            }}
          />
        </div>
      );
      i++;
      continue;
    }

    // Normal paragraph (skip empty lines)
    if (line.trim()) {
      elements.push(
        <p
          key={i}
          className="text-sm text-muted-foreground leading-relaxed my-1"
          dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*(.*?)\*\*/g, "<strong class='text-foreground font-semibold'>$1</strong>"),
          }}
        />
      );
    }
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function TechnicianAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    inputRef.current?.focus();

    const userMsg: Message = { role: "user", content: msg, id: Date.now().toString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1400));

    const aiMsg: Message = {
      role: "assistant",
      content: MOCK_RESPONSE,
      id: (Date.now() + 1).toString(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  };

  const clearChat = () => setMessages([]);

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
          <div className="relative flex items-center gap-4 px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-xl flex-shrink-0">
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-primary to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Bot size={20} className="text-white" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-foreground tracking-tight">AI Repair Assistant</h1>
              <p className="text-xs text-muted-foreground font-medium">Diagnostics · Troubleshooting · Part Recommendations</p>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-muted border border-border/50"
                >
                  <RotateCcw size={12} />
                  Clear
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Online
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="relative flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6 scroll-smooth">

            {/* Empty State */}
            <AnimatePresence>
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-8 mt-4 md:mt-12"
                >
                  <div className="text-center max-w-lg mx-auto">
                    <motion.div
                      initial={{ scale: 0.8, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="w-20 h-20 bg-gradient-to-br from-primary/20 to-violet-500/10 border border-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary/10"
                    >
                      <Sparkles size={36} className="text-primary" />
                    </motion.div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight mb-3">
                      What needs fixing?
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      Describe symptoms, share error codes, or ask about repair procedures. I'll help diagnose and guide you step-by-step.
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
                          className="group text-left px-4 py-3.5 bg-card border border-border/60 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                        >
                          <span className="group-hover:translate-x-0.5 inline-block transition-transform duration-200">
                            {p}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
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
                    <div className="max-w-[92%] md:max-w-[80%] bg-card border border-border/60 rounded-3xl rounded-tl-md shadow-sm overflow-hidden">
                      {/* AI message header */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-gradient-to-br from-primary to-violet-600 rounded-md flex items-center justify-center">
                            <Bot size={11} className="text-white" />
                          </div>
                          <span className="text-xs font-bold text-primary tracking-wide">AI ASSISTANT</span>
                        </div>
                        <CopyButton text={msg.content} />
                      </div>
                      {/* AI message body */}
                      <div className="px-5 py-4">
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading */}
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
                  <div className="flex items-center gap-1.5">
                    {[0, 0.15, 0.3].map((delay, i) => (
                      <motion.div
                        key={i}
                        animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay }}
                        className="w-2 h-2 bg-primary rounded-full"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Analysing…</span>
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
                placeholder="Describe the fault — device, symptoms, error codes…"
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
            <div className="flex items-center justify-center gap-1.5 mt-2.5 text-xs text-muted-foreground/60 font-medium">
              <AlertCircle size={11} />
              AI guidance only — always verify with manufacturer schematics
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}