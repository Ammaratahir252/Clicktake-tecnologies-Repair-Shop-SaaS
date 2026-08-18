"use client";

/**
 * Chat — a shared team-wide channel plus one-on-one direct messages, both
 * scoped to exactly one shop. Every staff member (owner, manager, frontdesk,
 * technician, driver) on THIS tenant can use both; nothing crosses tenants.
 *
 * Tenant isolation is enforced entirely server-side:
 *  - /api/chat/messages (team channel) scopes every query to the caller's own
 *    verified tenantId from the JWT.
 *  - /api/chat/direct (DMs) does the same, AND additionally verifies the other
 *    participant is a real staff member of that SAME tenant before a thread
 *    can even be opened — a client-supplied id for someone in a different shop
 *    simply 404s, so a DM thread can never be established across tenants.
 *  - /api/chat/contacts only ever lists teammates from the caller's own tenant.
 * This page never sends or trusts a tenantId itself — that's the point.
 *
 * Basic Instagram-DM-style features, nothing fancier: read receipts ("Seen",
 * DM only — a group channel showing per-message read state for everyone gets
 * complicated fast, so that's deliberately out of scope), a typing indicator,
 * date separators between message groups, and deleting your own messages.
 *
 * Not a WebSocket chat — this app has no realtime server infrastructure, so
 * everything live (new messages, typing, seen) arrives via polling (same
 * pattern already used for the notification bell) — simple and robust.
 *
 * Performance notes (this page is polled continuously by every open tab, so
 * its cost has to stay flat under load — see comments at each site):
 *  - All three poll loops (messages, contacts+seen, typing) skip their work
 *    entirely while the tab is hidden/backgrounded, and catch up immediately
 *    on regaining visibility instead of waiting out the next tick.
 *  - The message poll cancels a still-in-flight request before starting the
 *    next one (no unbounded request pile-up under a slow network/server) and
 *    backs off exponentially with jitter on consecutive failures (no retry
 *    storm during a partial outage).
 *  - Contacts + seen-status poll on their own slower cadence, decoupled from
 *    the message poll — they don't need message-level freshness.
 *  - The text input lives in its own <Composer> component so a keystroke
 *    re-renders only the input box, never the (potentially 50+ item) message
 *    list. <MessageList>/<MessageBubble> are memoized so unrelated state
 *    (contacts refresh, seen-receipt updates) can't force them to re-render.
 */

import DashboardShell, { DashboardUser } from "@/components/DashboardShell";
import { useEffect, useRef, useState, useCallback, useMemo, memo, type RefObject } from "react";
import api from "@/lib/api";
import { MessageSquare, Send, Loader2, ChevronUp, AlertTriangle, Users, Hash, Trash2 } from "lucide-react";

interface ChatMsg {
  _id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  createdAt: string;
}

interface Contact {
  _id: string;
  name: string;
  role: string;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
}

type Conversation = { type: "team" } | { type: "dm"; userId: string; name: string; role: string };

const STAFF_ROLES = ["owner", "manager", "frontdesk", "technician", "driver"];

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  manager: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  frontdesk: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  technician: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  driver: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const POLL_MS = 4000;
const POLL_BACKOFF_CAP_MS = 30000;
const CONTACTS_POLL_MS = 12000; // 3x the message cadence — the sidebar doesn't need message-level freshness
const TYPING_POLL_MS = 2000;
const TYPING_PING_THROTTLE_MS = 2000;

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}

function isAbortError(err: any): boolean {
  return err?.code === "ERR_CANCELED" || err?.name === "CanceledError";
}

function sameStringArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// ─── Message bubble — memoized so it only re-renders when ITS OWN props
// change, not whenever the parent re-renders for an unrelated reason
// (contacts refresh, seen-receipt tick, another bubble's delete-in-flight
// state). `msg` keeps a stable object reference across polls for every
// message that isn't brand new (setMessages only ever spreads in NEW items,
// it never clones existing ones), so this bails out for the whole scrollback
// on almost every render. ─────────────────────────────────────────────────
type MessageBubbleProps = {
  msg: ChatMsg;
  isMe: boolean;
  showSender: boolean;
  dateSeparatorLabel: string | null;
  isSeen: boolean;
  deleting: boolean;
  onDelete: (id: string) => void;
};

const MessageBubble = memo(function MessageBubble({
  msg,
  isMe,
  showSender,
  dateSeparatorLabel,
  isSeen,
  deleting,
  onDelete,
}: MessageBubbleProps) {
  return (
    <div>
      {dateSeparatorLabel && (
        <div className="flex items-center justify-center py-3">
          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">
            {dateSeparatorLabel}
          </span>
        </div>
      )}
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} py-1 group`}>
        <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
          {showSender && (
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-xs font-bold text-foreground">{msg.senderName}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${ROLE_COLORS[msg.senderRole] ?? "bg-muted text-muted-foreground"}`}>
                {msg.senderRole}
              </span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
            <div
              className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
              }`}
            >
              {msg.message}
            </div>
            {isMe && (
              <button
                onClick={() => onDelete(msg._id)}
                disabled={deleting}
                title="Delete message"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded-lg shrink-0 disabled:opacity-60"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground px-1">
            {new Date(msg.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
          </span>
          {isSeen && <span className="text-[10px] text-muted-foreground px-1">Seen</span>}
        </div>
      </div>
    </div>
  );
});

// ─── Message list — memoized so it's fully isolated from Composer's
// per-keystroke re-renders and from ChatContent's own less-frequent state
// (contacts, sending state). Only re-renders when something about the
// conversation itself actually changed. ─────────────────────────────────
type MessageListProps = {
  loading: boolean;
  messages: ChatMsg[];
  conversationType: "team" | "dm";
  conversationName?: string;
  myId: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadOlder: () => void;
  seenMessageId: string | null;
  typingUsers: string[];
  deletingId: string | null;
  onDelete: (id: string) => void;
  bottomRef: RefObject<HTMLDivElement>;
};

const MessageList = memo(function MessageList({
  loading,
  messages,
  conversationType,
  conversationName,
  myId,
  hasMore,
  loadingMore,
  onLoadOlder,
  seenMessageId,
  typingUsers,
  deletingId,
  onDelete,
  bottomRef,
}: MessageListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading…
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
        <MessageSquare size={32} className="mb-2 opacity-40" />
        <p className="text-sm font-medium">
          {conversationType === "team" ? "No messages yet — say hi to your team." : `No messages yet — say hi to ${conversationName}.`}
        </p>
      </div>
    );
  }

  return (
    <>
      {hasMore && (
        <div className="flex justify-center pb-2">
          <button
            onClick={onLoadOlder}
            disabled={loadingMore}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-all disabled:opacity-60"
          >
            {loadingMore ? <Loader2 size={12} className="animate-spin" /> : <ChevronUp size={12} />}
            Load older messages
          </button>
        </div>
      )}
      {messages.map((m, i) => {
        const isMe = m.senderId === myId;
        const showSender = conversationType === "team" && !isMe;
        const showDateSeparator = i === 0 || dateLabel(m.createdAt) !== dateLabel(messages[i - 1].createdAt);
        return (
          <MessageBubble
            key={m._id}
            msg={m}
            isMe={isMe}
            showSender={showSender}
            dateSeparatorLabel={showDateSeparator ? dateLabel(m.createdAt) : null}
            isSeen={seenMessageId === m._id}
            deleting={deletingId === m._id}
            onDelete={onDelete}
          />
        );
      })}
      {typingUsers.length > 0 && (
        <div className="flex justify-start py-1">
          <div className="flex flex-col gap-1">
            {conversationType === "team" && (
              <span className="text-[10px] font-bold text-muted-foreground px-1">
                {typingUsers.length === 1 ? typingUsers[0] : `${typingUsers.length} people`} typing…
              </span>
            )}
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1 w-fit">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </>
  );
});

// ─── Composer — owns `input`/`sending` locally so every keystroke re-renders
// ONLY this small component, never the message list above it. Reports
// results up via stable callbacks instead of lifting input state to the
// parent. ─────────────────────────────────────────────────────────────────
type ComposerProps = {
  conversation: Conversation;
  onSent: (msg: ChatMsg) => void;
  onError: (message: string) => void;
};

const Composer = memo(function Composer({ conversation, onSent, onError }: ComposerProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const lastTypingPingRef = useRef(0);

  const typingScope = conversation.type === "team" ? "team" : conversation.userId;
  const sendUrl = conversation.type === "team" ? "/api/chat/messages" : "/api/chat/direct";
  const sendPayload = (text: string) =>
    conversation.type === "team" ? { message: text } : { recipientId: conversation.userId, message: text };

  const handleTyping = (value: string) => {
    setInput(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingPingRef.current > TYPING_PING_THROTTLE_MS) {
      lastTypingPingRef.current = now;
      api.post("/api/chat/typing", { scope: typingScope }).catch(() => {});
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await api.post(sendUrl, sendPayload(text));
      const sent: ChatMsg = res.data?.data;
      setInput("");
      lastTypingPingRef.current = 0;
      if (sent) onSent(sent);
    } catch (err: any) {
      onError(err.response?.data?.message ?? "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-border p-3 flex items-end gap-2 shrink-0">
      <textarea
        value={input}
        onChange={(e) => handleTyping(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        placeholder={conversation.type === "team" ? "Message your team…" : `Message ${conversation.name}…`}
        rows={1}
        className="flex-1 resize-none px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary max-h-32"
      />
      <button
        onClick={send}
        disabled={!input.trim() || sending}
        className="w-10 h-10 shrink-0 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      </button>
    </div>
  );
});

export default function ChatPage() {
  return (
    <DashboardShell requiredRole={STAFF_ROLES}>
      {(user) => <ChatContent user={user} />}
    </DashboardShell>
  );
}

function conversationKey(c: Conversation) {
  return c.type === "team" ? "team" : `dm:${c.userId}`;
}

function ChatContent({ user }: { user: DashboardUser }) {
  const myId = user.id || (user as any)._id;

  const [conversation, setConversation] = useState<Conversation>({ type: "team" });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [seenAt, setSeenAt] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMsg[]>([]);
  messagesRef.current = messages;
  const conversationRef = useRef<Conversation>(conversation);
  conversationRef.current = conversation;

  // Tabs spend most of their life backgrounded — every poll loop below checks
  // this before doing any work, and visibilitychange triggers an immediate
  // catch-up fetch instead of waiting out the next tick.
  const isVisibleRef = useRef(typeof document !== "undefined" ? !document.hidden : true);

  const listUrl = useCallback((c: Conversation, extra: string) => {
    return c.type === "team" ? `/api/chat/messages${extra}` : `/api/chat/direct?with=${c.userId}${extra ? "&" + extra.slice(1) : ""}`;
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const fetchContacts = useCallback(() => {
    api
      .get("/api/chat/contacts")
      .then((res) => setContacts(res.data?.data ?? []))
      .catch(() => {})
      .finally(() => setContactsLoading(false));
  }, []);

  const fetchSeen = useCallback((withId: string) => {
    api
      .get(`/api/chat/direct/seen?with=${withId}`)
      .then((res) => {
        const val = res.data?.data?.readAt ?? null;
        setSeenAt((prev) => (prev === val ? prev : val));
      })
      .catch(() => {});
  }, []);

  // Load the active conversation from scratch whenever it changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setTypingUsers([]);
    setSeenAt(null);
    api
      .get(listUrl(conversation, "?limit=50"))
      .then((res) => {
        if (cancelled) return;
        const items: ChatMsg[] = res.data?.data ?? [];
        setMessages(items);
        setHasMore(items.length === 50);
      })
      .catch(() => !cancelled && setError("Failed to load messages."))
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 50);
      });

    if (conversation.type === "dm") {
      api.patch("/api/chat/direct/read", { with: conversation.userId }).catch(() => {});
      setContacts((prev) => prev.map((c) => (c._id === conversation.userId ? { ...c, unread: 0 } : c)));
      fetchSeen(conversation.userId);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey(conversation)]);

  // ── Message poll: self-scheduling (not setInterval) so it can back off ──
  // Cancels a still-in-flight request before starting the next one — under a
  // slow network/server, a fixed-interval poll just piles up more and more
  // overlapping requests, which is exactly the wrong direction under load.
  // On failure, the delay before the next attempt grows exponentially (with
  // jitter, capped at 30s) instead of retrying at a fixed cadence — every
  // client doing that at once is a retry storm that prevents recovery.
  const messageTickRef = useRef<() => void>(() => {});
  useEffect(() => {
    const abortRef: { current: AbortController | null } = { current: null };
    let failures = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = (delay: number) => {
      timeoutId = setTimeout(tick, delay);
    };

    const tick = () => {
      if (!isVisibleRef.current) {
        scheduleNext(POLL_MS);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const conv = conversationRef.current;
      const current = messagesRef.current;
      const last = current[current.length - 1];
      // When the conversation is still empty locally (a brand-new DM thread,
      // or the team channel before anyone's posted), there's no `after`
      // timestamp to poll from — fall back to a real page fetch (same as the
      // initial load) instead of a throwaway request, so the very first
      // incoming message actually gets applied instead of being fetched and
      // silently discarded every tick.
      const after = last ? last.createdAt : undefined;

      api
        .get(listUrl(conv, after ? `?after=${encodeURIComponent(after)}` : "?limit=50"), { signal: controller.signal })
        .then((res) => {
          failures = 0;
          const incoming: ChatMsg[] = res.data?.data ?? [];
          if (incoming.length === 0) return;
          // The fallback fetch above is capped at 50 like the initial load —
          // if it came back full, there may be even older history the "Load
          // older" button hasn't offered yet.
          if (!after && incoming.length === 50) setHasMore(true);
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m._id));
            const fresh = incoming.filter((m) => !existingIds.has(m._id));
            if (fresh.length === 0) return prev;
            return [...prev, ...fresh];
          });
          if (conv.type === "dm") {
            api.patch("/api/chat/direct/read", { with: conv.userId }).catch(() => {});
          }
        })
        .catch((err) => {
          if (isAbortError(err)) return; // our own cancellation, not a real failure
          failures = Math.min(failures + 1, 5);
        })
        .finally(() => {
          const backoff = Math.min(POLL_MS * 2 ** failures, POLL_BACKOFF_CAP_MS);
          scheduleNext(failures === 0 ? POLL_MS : backoff + Math.random() * 500);
        });
    };

    messageTickRef.current = tick;
    scheduleNext(POLL_MS);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      abortRef.current?.abort();
    };
  }, [listUrl]);

  // ── Contacts + seen-status poll: its own slower cadence, decoupled from
  // the message poll — the sidebar doesn't need message-level freshness, so
  // there's no reason to pay for it every 4s. ─────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (!isVisibleRef.current) return;
      fetchContacts();
      const conv = conversationRef.current;
      if (conv.type === "dm") fetchSeen(conv.userId);
    };
    fetchContacts(); // initial load
    const interval = setInterval(tick, CONTACTS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchContacts, fetchSeen]);

  // ── Typing poll — a faster cadence than messages so the indicator feels
  // responsive.
  //
  // `scope` on a TypingStatus row is "who this signal is aimed AT" (see
  // typingStatus.model.ts). For the team channel that's the literal 'team'.
  // For a DM it's the RECIPIENT's own id — so to see "is someone typing to
  // me right now", I must poll with my own id as the scope, not the other
  // party's id (that would ask "who's typing at them", not at me). `peer`
  // further narrows a DM poll to the ONE person this thread is with, so a
  // different teammate typing to me elsewhere can't light up this indicator.
  useEffect(() => {
    const poll = () => {
      if (!isVisibleRef.current) return;
      const conv = conversationRef.current;
      const url =
        conv.type === "team"
          ? `/api/chat/typing?scope=team`
          : `/api/chat/typing?scope=${myId}&peer=${conv.userId}`;
      api
        .get(url)
        .then((res) => {
          const next: string[] = res.data?.data ?? [];
          // Skip the state update entirely when nothing actually changed —
          // the common case is "nobody's typing" every single tick, and a
          // fresh-but-identical [] every 2s shouldn't force a re-render.
          setTypingUsers((prev) => (sameStringArray(prev, next) ? prev : next));
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, TYPING_POLL_MS);
    return () => clearInterval(interval);
  }, [conversationKey(conversation), myId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Catch up immediately on regaining visibility instead of waiting out
  // whatever's left of the current interval/timeout.
  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      if (isVisibleRef.current) {
        messageTickRef.current();
        fetchContacts();
        const conv = conversationRef.current;
        if (conv.type === "dm") fetchSeen(conv.userId);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [fetchContacts, fetchSeen]);

  // Auto-scroll on new messages, but only if already near the bottom.
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const el = scrollRef.current;
      const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 200 : true;
      if (nearBottom) scrollToBottom();
    }
    prevCountRef.current = messages.length;
  }, [messages, scrollToBottom]);

  const loadOlder = useCallback(async () => {
    const current = messagesRef.current;
    if (!current.length) return;
    setLoadingMore(true);
    const el = scrollRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    try {
      const res = await api.get(listUrl(conversationRef.current, `?before=${encodeURIComponent(current[0].createdAt)}&limit=50`));
      const older: ChatMsg[] = res.data?.data ?? [];
      setHasMore(older.length === 50);
      setMessages((prev) => [...older, ...prev]);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    } catch {
      setError("Failed to load older messages.");
    } finally {
      setLoadingMore(false);
    }
  }, [listUrl]);

  // Stable identity (refs only, no deps) so passing this to every memoized
  // MessageBubble never defeats their memoization.
  const deleteMessage = useCallback(async (id: string) => {
    if (!confirm("Delete this message? This can't be undone.")) return;
    setDeletingId(id);
    const conv = conversationRef.current;
    const url = conv.type === "team" ? `/api/chat/messages/${id}` : `/api/chat/direct/${id}`;
    try {
      await api.delete(url);
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to delete message.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleMessageSent = useCallback(
    (msg: ChatMsg) => {
      setMessages((prev) => [...prev, msg]);
      fetchContacts();
    },
    [fetchContacts]
  );

  const handleSendError = useCallback((message: string) => setError(message), []);

  const totalUnread = contacts.reduce((s, c) => s + c.unread, 0);

  // Which message (if any) gets the "Seen" caption — the LAST message I sent,
  // only once its createdAt is covered by the other person's latest read
  // point. Memoized so this scan only re-runs when messages/seenAt actually
  // change, not on every ChatContent render (e.g. a contacts refresh).
  const seenMessageId = useMemo(() => {
    if (conversation.type !== "dm" || !seenAt) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === myId) {
        return new Date(messages[i].createdAt).getTime() <= new Date(seenAt).getTime() ? messages[i]._id : null;
      }
    }
    return null;
  }, [messages, seenAt, conversation.type, myId]);

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-5xl mx-auto gap-4">
      {/* ── Sidebar: Team channel + Direct Messages ─────────────────────── */}
      <div className="w-64 shrink-0 bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="px-4 py-3.5 border-b border-border">
          <h1 className="text-sm font-black text-foreground uppercase tracking-wide">Chat</h1>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <button
            onClick={() => setConversation({ type: "team" })}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
              conversation.type === "team" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
            }`}
          >
            <Hash size={16} className="shrink-0" />
            <span className="text-sm font-bold truncate">Team Chat</span>
          </button>

          <div className="px-4 pt-4 pb-1.5 flex items-center gap-1.5">
            <Users size={11} className="text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Direct Messages</span>
          </div>

          {contactsLoading ? (
            <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground">
              <Loader2 size={13} className="animate-spin" /> <span className="text-xs">Loading…</span>
            </div>
          ) : contacts.length === 0 ? (
            <p className="px-4 py-2 text-xs text-muted-foreground">No other staff on this shop yet.</p>
          ) : (
            contacts.map((c) => {
              const active = conversation.type === "dm" && conversation.userId === c._id;
              return (
                <button
                  key={c._id}
                  onClick={() => setConversation({ type: "dm", userId: c._id, name: c.name, role: c.role })}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${ROLE_COLORS[c.role] ?? "bg-muted text-muted-foreground"}`}>
                    {c.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.lastMessage ?? `New — say hi`}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
        {totalUnread > 0 && (
          <div className="px-4 py-2 border-t border-border text-[11px] font-bold text-primary">
            {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* ── Active conversation ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-3 shrink-0">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md shrink-0">
            {conversation.type === "team" ? (
              <MessageSquare className="text-primary-foreground w-5 h-5" />
            ) : (
              <span className="text-primary-foreground font-black text-sm">{conversation.name?.[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black text-foreground truncate">
              {conversation.type === "team" ? "Team Chat" : conversation.name}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              {conversation.type === "team" ? "Your whole shop — nobody outside it can see this." : `${conversation.role} · private thread`}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 mb-3 shrink-0">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs font-semibold text-destructive">{error}</p>
          </div>
        )}

        <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            <MessageList
              loading={loading}
              messages={messages}
              conversationType={conversation.type}
              conversationName={conversation.type === "dm" ? conversation.name : undefined}
              myId={myId}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadOlder={loadOlder}
              seenMessageId={seenMessageId}
              typingUsers={typingUsers}
              deletingId={deletingId}
              onDelete={deleteMessage}
              bottomRef={bottomRef}
            />
          </div>

          <Composer conversation={conversation} onSent={handleMessageSent} onError={handleSendError} />
        </div>
      </div>
    </div>
  );
}
