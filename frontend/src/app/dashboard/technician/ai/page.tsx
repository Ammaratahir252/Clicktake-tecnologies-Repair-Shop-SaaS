"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  Trash2,
  MessageSquare,
  Zap,
  Shield,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  AlertCircle,
  Clock,
} from "lucide-react";

const QUICK_PROMPTS = [
  "iPhone 15 Pro Max screen flickering after water damage",
  "MacBook won't boot after RAM upgrade",
  "Samsung Galaxy battery draining too fast",
  "How to safely reflow solder on a laptop GPU?",
  "iPad charging port not working",
  "PS5 HDMI port replacement procedure",
];

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  helpful?: boolean;
};

const MOCK_RESPONSES: Record<string, string> = {
  default: `Based on common repair scenarios, here are the most likely causes and steps to diagnose:

**🔍 Initial Assessment**
- Check for physical damage first — corrosion, bent pins, cracked PCB
- Run diagnostic mode if available
- Document the issue with photos before opening

**⚡ Common Causes**
- Power circuit failure (check charging IC)
- Logic board short circuit
- Software corruption or bootloop
- Failed component (NAND, RAM, mosfet)

**🔧 Recommended Steps**
1. Backup data if possible
2. Run DCPS test (measure current draw)
3. Check board under microscope for burn marks
4. Test with replacement parts if available
5. Use thermal camera to detect hot spots

**⚠️ Safety Precautions**
- Always use ESD protection when working on sensitive components
- Disconnect battery before any repair
- Work in a well-ventilated area

**💡 Pro Tips**
- Keep a repair log for future reference
- Take photos at each disassembly stage
- Label all screws and components`,
};

export default function TechnicianAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
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
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1500));

    const assistantMessage: Message = {
      role: "assistant",
      content: MOCK_RESPONSES.default,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setLoading(false);
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
      {(user) => (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
          {/* Header */}
          <div className="max-w-5xl mx-auto mb-6 animate-in fade-in slide-in-from-top duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shadow-lg">
                  <Bot size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-foreground flex items-center gap-2">
                    AI Repair Assistant
                    <Sparkles size={20} className="text-primary animate-pulse" />
                  </h1>
                  <p className="text-muted-foreground font-medium mt-1">
                    Expert diagnostics, repairs & parts guidance
                  </p>
                </div>
              </div>

              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/70 text-foreground font-bold rounded-xl transition-all text-sm"
                >
                  <Trash2 size={16} />
                  Clear Chat
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-5xl mx-auto">
            {messages.length === 0 ? (
              <div className="space-y-8 animate-in fade-in duration-700">
                {/* Welcome Card */}
                <div className="bg-card border border-border rounded-3xl p-8 md:p-10 text-center shadow-lg">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Sparkles size={40} className="text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-foreground mb-3">
                    Welcome to AI Repair Assistant
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto text-lg">
                    Get instant help with diagnostics, repair procedures, parts identification, and troubleshooting.
                  </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                      <Zap className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">Fast Diagnostics</h3>
                    <p className="text-sm text-muted-foreground">
                      Quick fault identification and root cause analysis
                    </p>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-4">
                      <MessageSquare className="text-purple-600 dark:text-purple-400" size={24} />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">Repair Guides</h3>
                    <p className="text-sm text-muted-foreground">
                      Step-by-step instructions for complex repairs
                    </p>
                  </div>

                  <div className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-4">
                      <Shield className="text-emerald-600 dark:text-emerald-400" size={24} />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">Safety First</h3>
                    <p className="text-sm text-muted-foreground">
                      Best practices and safety recommendations
                    </p>
                  </div>
                </div>

                {/* Quick Prompts */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Lightbulb size={18} className="text-primary" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                      Quick Questions
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {QUICK_PROMPTS.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(p)}
                        className="text-left px-5 py-4 bg-card border border-border rounded-xl text-sm font-medium text-foreground hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
                      >
                        <span className="flex items-start gap-3">
                          <MessageSquare size={18} className="text-primary mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{p}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Chat Messages */
              <div className="space-y-6 pb-6">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom duration-500`}
                  >
                    <div className={`max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "order-2" : ""}`}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-2 px-1">
                          <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Bot size={15} className="text-primary" />
                          </div>
                          <span className="text-xs font-bold text-primary">AI Assistant</span>
                        </div>
                      )}

                      <div
                        className={`rounded-2xl p-5 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "bg-card border border-border text-foreground shadow-sm"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="space-y-2 text-sm">
                            {msg.content.split("\n").map((line, j) => {
                              if (line.startsWith("**") && line.endsWith("**")) {
                                return (
                                  <p key={j} className="font-bold text-foreground mt-3 first:mt-0">
                                    {line.replace(/\*\*/g, "")}
                                  </p>
                                );
                              }
                              if (line.trim() === "") return <div key={j} className="h-1.5" />;
                              return <p key={j} className="text-muted-foreground leading-relaxed">{line}</p>;
                            })}

                            {/* Message Actions */}
                            <div className="flex items-center gap-2 pt-4 border-t border-border/50 mt-4">
                              <button
                                onClick={() => copyToClipboard(msg.content, i)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-muted hover:bg-muted/70 rounded-lg transition-all"
                              >
                                <Copy size={13} /> {copied === i ? "Copied!" : "Copy"}
                              </button>

                              <div className="flex items-center gap-1 ml-auto">
                                <button
                                  onClick={() => setHelpful(i, true)}
                                  className={`p-1.5 rounded-lg transition-all ${msg.helpful === true ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-muted hover:bg-muted/70"}`}
                                >
                                  <ThumbsUp size={13} />
                                </button>
                                <button
                                  onClick={() => setHelpful(i, false)}
                                  className={`p-1.5 rounded-lg transition-all ${msg.helpful === false ? "bg-red-100 dark:bg-red-900/30 text-red-600" : "bg-muted hover:bg-muted/70"}`}
                                >
                                  <ThumbsDown size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="leading-relaxed">{msg.content}</p>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground mt-1.5 block px-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start animate-in fade-in">
                    <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center gap-3">
                      <Loader2 size={18} className="animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground font-medium">AI is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="max-w-5xl mx-auto sticky bottom-0 pt-4 pb-6 bg-gradient-to-t from-background via-background to-transparent">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-lg">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Describe the repair issue or ask a question…"
                  className="flex-1 px-5 py-3.5 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="w-12 h-12 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1.5">
              <AlertCircle size={13} />
              AI advice is for guidance only. Always verify with manufacturer documentation.
            </p>
          </div>

          {/* Toast */}
          {copied !== null && (
            <div className="fixed bottom-24 right-4 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg animate-in fade-in slide-in-from-bottom">
              ✓ Copied to clipboard
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}