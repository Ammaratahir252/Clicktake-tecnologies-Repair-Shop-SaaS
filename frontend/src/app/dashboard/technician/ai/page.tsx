"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, Sparkles, ChevronDown, Wrench, AlertCircle } from "lucide-react";

const QUICK_PROMPTS = [
  "iPhone 15 Pro Max screen flickering after water damage — possible causes?",
  "MacBook won't boot after RAM upgrade — troubleshooting steps",
  "Samsung Galaxy battery draining too fast — diagnosis checklist",
  "How to safely reflow solder on a laptop GPU?",
];

type Message = { role: "user" | "assistant"; content: string };

const MOCK_RESPONSES: Record<string, string> = {
  default: `Based on common repair scenarios, here are the most likely causes and steps to diagnose:

**1. Initial Assessment**
- Check for physical damage first — corrosion, bent pins, cracked PCB
- Run diagnostic mode if available
- Document the issue with photos before opening

**2. Common Causes**
- Power circuit failure (check charging IC)
- Logic board short circuit
- Software corruption or bootloop
- Failed component (NAND, RAM, mosfet)

**3. Recommended Steps**
1. Backup data if possible
2. Run DCPS test (measure current draw)
3. Check board under microscope for burn marks
4. Test with replacement parts if available

*Note: Always use ESD protection when working on sensitive components.*`,
};

export default function TechnicianAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    // Simulate AI response
    await new Promise((r) => setTimeout(r, 1200));
    setMessages((prev) => [...prev, { role: "assistant", content: MOCK_RESPONSES.default }]);
    setLoading(false);
  };

  return (
    <DashboardShell requiredRole="technician">
      {(user) => (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Bot size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground">AI Repair Assistant</h1>
              <p className="text-muted-foreground text-sm font-medium">Ask anything about repairs, diagnostics & parts</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Online
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-2xl p-5 text-center">
                  <Sparkles size={28} className="text-primary mx-auto mb-2" />
                  <p className="font-bold text-foreground">Ask the AI anything</p>
                  <p className="text-sm text-muted-foreground mt-1">Diagnose faults, get repair guides, and find parts</p>
                </div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Quick questions</p>
                <div className="space-y-2">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p)}
                      className="w-full text-left px-4 py-3 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot size={14} className="text-primary" />
                        <span className="text-xs font-bold text-primary">AI Assistant</span>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {msg.content.split("\n").map((line, j) => (
                          <p key={j} className={`${line.startsWith("**") ? "font-bold text-foreground" : "text-muted-foreground"} leading-relaxed`}>
                            {line.replace(/\*\*/g, "")}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground font-medium">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Describe the repair issue or ask a question…"
              className="flex-1 px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2">
            AI advice is for guidance only. Always verify with manufacturer documentation.
          </p>
        </div>
      )}
    </DashboardShell>
  );
}
