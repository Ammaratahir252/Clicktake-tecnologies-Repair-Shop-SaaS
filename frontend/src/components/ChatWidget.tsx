"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2, Sparkles } from "lucide-react";
import { THEME } from "@/components/theme";

const { ACCENT, BORDER, TEXT, MUTED } = THEME;

type ChatMessage = { role: "user" | "assistant"; content: string };

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm the Dibnow assistant. Ask me about repair status, pricing, how the platform works, or anything else about the site.",
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: nextMessages.slice(0, -1).slice(-6),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Something went wrong");
      setMessages((prev) => [...prev, { role: "assistant", content: json.data?.reply || "Sorry, I didn't catch that." }]);
    } catch (err: any) {
      setError(err.message || "Could not reach the assistant — please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Chat with us"}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 58, height: 58, borderRadius: "50%",
          background: ACCENT, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(29,78,216,0.35)",
          transition: "transform 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? <X size={24} color="#fff" /> : <Bot size={26} color="#fff" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed", bottom: 92, right: 24, zIndex: 1000,
            width: "min(360px, calc(100vw - 32px))", height: "min(500px, calc(100vh - 140px))",
            background: "#fff", borderRadius: 20, border: `1px solid ${BORDER}`,
            boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
            display: "flex", flexDirection: "column", overflow: "hidden",
            fontFamily: "'DM Sans',sans-serif",
          }}
        >
          {/* Header */}
          <div style={{ padding: "16px 18px", background: ACCENT, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={17} color="#fff" />
            </div>
            <div>
              <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, margin: 0 }}>Dibnow Assistant</p>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, margin: 0 }}>Ask about repairs, pricing, or the platform</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: m.role === "user" ? ACCENT : "#f3f4f6",
                  color: m.role === "user" ? "#fff" : TEXT,
                  padding: "9px 13px", borderRadius: 14,
                  borderBottomRightRadius: m.role === "user" ? 4 : 14,
                  borderBottomLeftRadius: m.role === "assistant" ? 4 : 14,
                  fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 12 }}>
                <Loader2 size={13} className="spin-anim" /> Thinking…
              </div>
            )}
            {error && (
              <div style={{ alignSelf: "center", color: "#dc2626", fontSize: 12, textAlign: "center" }}>{error}</div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: 12, borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8, flexShrink: 0 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Type your question…"
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 10,
                border: `1.5px solid ${BORDER}`, fontSize: 13.5, outline: "none",
                color: TEXT, fontFamily: "inherit",
              }}
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              style={{
                width: 40, height: 40, borderRadius: 10, border: "none",
                background: ACCENT, color: "#fff", display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                opacity: sending || !input.trim() ? 0.5 : 1, flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`.spin-anim{animation:spin 1s linear infinite;} @keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </>
  );
}
