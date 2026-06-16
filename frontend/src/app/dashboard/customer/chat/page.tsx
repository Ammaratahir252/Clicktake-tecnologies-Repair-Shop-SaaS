"use client";

/**
 * app/dashboard/customer/chat/page.tsx
 * Module 8.2 — Customer-Facing AI Chatbot
 *
 * Calls POST /api/ai/chat — Claude looks up real ticket data from MongoDB
 * if the customer mentions a ticket number in their message.
 *
 * RBAC: customer
 */

import DashboardShell from "@/components/DashboardShell";
import { useState, useRef, useEffect } from "react";
import {
  Bot, Send, MessageCircle, AlertCircle, RotateCcw,
  PhoneCall, CheckCircle2, ChevronRight,
} from "lucide-react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  role: "user" | "bot";
  content: string;
  needsHandoff?: boolean;
  suggestedActions?: string[];
};

// ─── FAQ quick-starts (shown before first message) ────────────────────────────

const QUICK_QUESTIONS = [
  "What's the status of my repair?",
  "How long does a screen replacement take?",
  "Do you offer warranty on repairs?",
  "What payment methods do you accept?",
];

// ─── Message bubble ───────────────────────────────────────────────────────────

function BotMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {/* Avatar + bubble */}
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-primary to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5 shadow-md shadow-primary/20">
            <Bot size={13} className="text-white" />
          </div>
          <div className="bg-card border border-border/60 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
          </div>
        </div>

        {/* Handoff notice */}
        {msg.needsHandoff && (
          <div className="ml-9 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <PhoneCall size={13} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              This needs a staff member. Please call or visit us directly.
            </p>
          </div>
        )}

        {/* Suggested actions */}
        {msg.suggestedActions && msg.suggestedActions.length > 0 && (
          <div className="ml-9 flex flex-wrap gap-2">
            {msg.suggestedActions.map((action, i) => (
              <span
                key={i}
                className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full flex items-center gap-1"
              >
                {action}
                <ChevronRight size={10} />
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerChatPage() {
  return (
    <DashboardShell requiredRole="customer">
      {() => <ChatContent />}
    </DashboardShell>
  );
}

function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Hello! 👋 I'm your repair shop assistant. I can help you check your repair status, answer questions about our services, or connect you with our team. What can I help you with?",
      suggestedActions: ["Check repair status", "Services & pricing"],
    },
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    inputRef.current?.focus();

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post("/api/ai/chat", {
        message: msg,
        history,
      });

      if (!res.data.success) throw new Error(res.data.message);

      const { reply, needsHandoff, suggestedActions } = res.data.data;

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: reply,
        needsHandoff,
        suggestedActions,
      };

      setMessages((prev) => [...prev, botMsg]);
      setHistory((prev) => [
        ...prev,
        { role: "user", content: msg },
        { role: "assistant", content: reply },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "bot",
          content: "Sorry, I'm having trouble connecting right now. Please try again or contact us directly.",
          needsHandoff: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "bot",
        content: "Hello again! How can I help you today?",
      },
    ]);
    setHistory([]);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] w-full max-w-2xl mx-auto overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-background/80 backdrop-blur-xl flex-shrink-0">
        <div className="relative">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-violet-600 rounded-2xl flex items-center justify-center shadow-md shadow-primary/25">
            <Bot size={18} className="text-white" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-background rounded-full" />
        </div>
        <div className="flex-1">
          <h1 className="font-black text-foreground">Repair Shop Assistant</h1>
          <p className="text-xs text-muted-foreground">Usually replies instantly</p>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl hover:bg-muted border border-border/50 transition-all"
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        {/* Quick start prompts (shown only once, before user sends first message) */}
        {messages.length === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-left px-4 py-3 bg-card border border-border/60 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[75%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3 text-sm font-medium shadow-md shadow-primary/20">
                {msg.content}
              </div>
            </div>
          ) : (
            <BotMessage key={msg.id} msg={msg} />
          )
        )}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-primary to-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5">
                <Bot size={13} className="text-white" />
              </div>
              <div className="bg-card border border-border/60 rounded-2xl rounded-bl-md px-5 py-3 flex items-center gap-2">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <span
                    key={i}
                    className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="px-4 py-4 bg-background/80 backdrop-blur-xl border-t border-border/40 flex-shrink-0">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message… (include ticket number for status)"
            className="w-full pl-5 pr-14 py-3.5 bg-card border border-border/60 rounded-2xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all font-medium shadow-sm"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-primary text-primary-foreground rounded-xl disabled:opacity-40 shadow-md shadow-primary/30 hover:opacity-90 transition-all"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground/50 mt-2 flex items-center justify-center gap-1.5">
          <AlertCircle size={10} />
          AI assistant — for urgent issues please call us directly
        </p>
      </div>
    </div>
  );
}
