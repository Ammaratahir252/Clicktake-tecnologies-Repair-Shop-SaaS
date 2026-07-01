"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Clock, Play, Pause, CheckCircle, ChevronDown, Timer,
  Trash2, Edit2, Save, X, TrendingUp, Calendar, Loader2, Search,
} from "lucide-react";

type Session = {
  id:       string;
  ticketId: string;
  label:    string;
  start:    Date;
  end:      Date | null;
  duration: number;
  notes?:   string;
};

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}h ${m.toString().padStart(2, "0")}m`
    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function TechnicianTimePage() {
  return (
    <DashboardShell requiredRole="technician">
      {() => <TimeContent />}
    </DashboardShell>
  );
}

function TimeContent() {
  const [tickets, setTickets]         = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [open, setOpen]               = useState(false);
  const [running, setRunning]         = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const [sessionNotes, setSessionNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState(0);
  const [success, setSuccess]         = useState(false);
  const [sessions, setSessions]       = useState<Session[]>([]);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await api.get("/api/tickets");
      const all: any[] = res.data?.data ?? [];
      const active = all.filter((t) => !["delivered", "cancelled"].includes(t.status));
      setTickets(active);
      if (active.length > 0) setSelectedTicket(active[0]);
    } catch {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running) interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [running]);

  const handleStart = () => { setRunning(true); setElapsed(0); setSessionNotes(""); };

  const handleStop = () => {
    setRunning(false);
    if (elapsed > 0 && selectedTicket) {
      setSessions((prev) => [{
        id:       Date.now().toString(),
        ticketId: selectedTicket._id,
        label:    `${selectedTicket.ticketNumber} · ${selectedTicket.deviceBrand} ${selectedTicket.deviceModel}`,
        start:    new Date(Date.now() - elapsed * 1000),
        end:      new Date(),
        duration: elapsed,
        notes:    sessionNotes || undefined,
      }, ...prev]);
      setElapsed(0);
      setSessionNotes("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleDeleteSession = (id: string) => {
    if (confirm("Delete this session?")) setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateSession = (id: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, duration: editDuration } : s)));
    setEditingId(null);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  const filteredTickets = tickets.filter(
    (t) =>
      (t.ticketNumber ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customerId?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalToday = sessions.reduce((s, x) => s + x.duration, 0) + (running ? elapsed : 0);
  const averageSession = sessions.length > 0 ? Math.round(totalToday / (sessions.length + (running ? 1 : 0))) : 0;

  const ticketSessions = sessions.reduce((acc, session) => {
    const existing = acc.find((s) => s.ticketId === session.ticketId);
    if (existing) { existing.duration += session.duration; existing.count += 1; }
    else acc.push({ ticketId: session.ticketId, label: session.label, duration: session.duration, count: 1 });
    return acc;
  }, [] as Array<{ ticketId: string; label: string; duration: number; count: number }>);

  const topTicket = [...ticketSessions].sort((a, b) => b.duration - a.duration)[0];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Time Tracking
        </h1>
        <p className="text-muted-foreground font-medium mt-0.5">Log time spent on each repair</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 shadow-lg">
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle size={20} className="text-white" />
          </div>
          <div>
            <p className="text-emerald-900 dark:text-emerald-100 font-bold">Session saved!</p>
            <p className="text-emerald-700 dark:text-emerald-400 text-xs">Your time has been logged</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Timer */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-2xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-black text-primary">{formatDuration(totalToday)}</div>
              <p className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-wider">Today Total</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/20 rounded-2xl p-4 text-center">
              <div className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400">{sessions.length}</div>
              <p className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-wider">Sessions</p>
            </div>
          </div>

          {topTicket && (
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-2 border-purple-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Top Ticket</p>
                  <p className="font-black text-foreground mt-1 text-sm truncate">{topTicket.label}</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatDuration(topTicket.duration)} · {topTicket.count} sessions</p>
                </div>
              </div>
            </div>
          )}

          {/* Timer Card */}
          <div className="bg-gradient-to-br from-card to-muted/30 border-2 border-border rounded-2xl p-6 shadow-lg space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Working on</p>
              {loadingTickets ? (
                <div className="flex items-center gap-2 text-muted-foreground py-3">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading tickets…</span>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setOpen(true)}
                      disabled={running}
                      className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all disabled:opacity-60"
                    />
                  </div>

                  {open && !running && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-card border-2 border-border rounded-xl shadow-2xl z-20 max-h-64 overflow-y-auto">
                        {filteredTickets.length === 0 ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-muted-foreground text-sm">No tickets found</p>
                          </div>
                        ) : (
                          filteredTickets.map((t) => (
                            <button
                              key={t._id}
                              onClick={() => { setSelectedTicket(t); setOpen(false); setSearchQuery(""); }}
                              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                            >
                              <p className="font-bold text-sm text-foreground">{t.ticketNumber}</p>
                              <p className="text-xs text-muted-foreground">{t.customerId?.name ?? "Customer"} · {t.deviceBrand} {t.deviceModel}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {selectedTicket && !open && (
                    <div className="mt-2 bg-background border-2 border-border rounded-xl px-4 py-3">
                      <p className="font-bold text-sm text-foreground">{selectedTicket.ticketNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {selectedTicket.customerId?.name ?? "Customer"} · {selectedTicket.deviceBrand} {selectedTicket.deviceModel}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Timer Display */}
            <div className="text-center py-8 bg-gradient-to-b from-primary/5 to-transparent rounded-xl">
              <div className={`text-6xl md:text-7xl font-black tabular-nums transition-colors ${running ? "text-primary animate-pulse" : "text-foreground"}`}>
                {formatDuration(elapsed)}
              </div>
              {running && (
                <p className="text-sm text-muted-foreground font-bold mt-3 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Timer running…
                </p>
              )}
            </div>

            {running && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes (Optional)</label>
                <textarea
                  placeholder="What are you working on?"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  rows={2}
                />
              </div>
            )}

            <div className="flex gap-3">
              {!running ? (
                <button
                  onClick={handleStart}
                  disabled={!selectedTicket}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-black rounded-xl hover:shadow-lg transition-all text-sm shadow-md disabled:opacity-50"
                >
                  <Play size={20} fill="currentColor" />
                  Start Timer
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-black rounded-xl hover:shadow-lg transition-all text-sm shadow-md"
                >
                  <Pause size={20} fill="currentColor" />
                  Stop & Save
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Session History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Today's Sessions ({sessions.length})
            </p>
            {sessions.length > 0 && (
              <p className="text-xs font-bold text-muted-foreground">Avg: {formatDuration(averageSession)}</p>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="bg-gradient-to-br from-card to-muted/30 border-2 border-dashed border-border rounded-2xl p-12 text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Timer size={36} className="text-muted-foreground" />
              </div>
              <p className="font-bold text-foreground text-lg">No sessions logged yet</p>
              <p className="text-sm text-muted-foreground mt-2">Start timing a repair to log your work</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="bg-gradient-to-r from-card to-muted/30 border-2 border-border hover:border-primary/50 rounded-2xl p-4 transition-all shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                        <Clock size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground text-sm truncate">{session.label}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Calendar size={12} />
                          {formatTime(session.start)} → {session.end ? formatTime(session.end) : "ongoing"}
                        </p>
                        {session.notes && (
                          <p className="text-sm text-muted-foreground mt-2 bg-muted/50 px-3 py-2 rounded-lg border border-border">
                            {session.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {editingId === session.id ? (
                        <>
                          <input
                            type="number"
                            value={editDuration}
                            onChange={(e) => setEditDuration(parseInt(e.target.value) || 0)}
                            className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                          />
                          <button onClick={() => handleUpdateSession(session.id)} className="w-9 h-9 flex items-center justify-center bg-green-500 hover:bg-green-600 text-white rounded-lg">
                            <Save size={16} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="w-9 h-9 flex items-center justify-center bg-muted hover:bg-muted/70 text-foreground rounded-lg">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <p className="text-lg font-black text-foreground tabular-nums">{formatDuration(session.duration)}</p>
                          </div>
                          <button onClick={() => { setEditingId(session.id); setEditDuration(session.duration); }} className="w-9 h-9 flex items-center justify-center bg-muted hover:bg-blue-500/20 text-muted-foreground hover:text-blue-600 rounded-lg transition-all">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteSession(session.id)} className="w-9 h-9 flex items-center justify-center bg-muted hover:bg-red-500/20 text-muted-foreground hover:text-red-600 rounded-lg transition-all">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time by Ticket */}
      {ticketSessions.length > 0 && (
        <div className="bg-gradient-to-br from-card to-muted/30 border-2 border-border rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-black text-foreground mb-4">Time by Ticket</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ticketSessions.sort((a, b) => b.duration - a.duration).map((ts) => {
              const percentage = totalToday > 0 ? (ts.duration / totalToday) * 100 : 0;
              return (
                <div key={ts.ticketId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-foreground truncate">{ts.label}</p>
                    <p className="text-sm font-bold text-muted-foreground">{formatDuration(ts.duration)}</p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{ts.count} session{ts.count !== 1 ? "s" : ""}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
