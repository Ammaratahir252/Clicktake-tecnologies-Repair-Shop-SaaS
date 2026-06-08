"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useEffect } from "react";
import { Clock, Play, Pause, CheckCircle, Plus, ChevronDown, Timer } from "lucide-react";

const MOCK_TICKETS = [
  { id: "REP-2026-00451", customer: "Ahmed Khan", device: "iPhone 15 Pro Max" },
  { id: "REP-2026-00448", customer: "Sara Malik", device: "Samsung Galaxy S24" },
  { id: "REP-2026-00453", customer: "Bilal Sheikh", device: "iPad Pro" },
];

type Session = { ticketId: string; start: Date; end: Date | null; duration: number };

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}h ${m.toString().padStart(2, "0")}m`
    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function TechnicianTimePage() {
  const [selectedTicket, setSelectedTicket] = useState(MOCK_TICKETS[0]);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([
    { ticketId: "REP-2026-00448", start: new Date(Date.now() - 4500000), end: new Date(Date.now() - 2700000), duration: 1800 },
    { ticketId: "REP-2026-00451", start: new Date(Date.now() - 7200000), end: new Date(Date.now() - 5400000), duration: 1800 },
  ]);
  const startRef = useState<Date | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running) {
      interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [running]);

  const handleStart = () => {
    setRunning(true);
    setElapsed(0);
  };

  const handleStop = () => {
    setRunning(false);
    if (elapsed > 0) {
      setSessions((prev) => [
        {
          ticketId: selectedTicket.id,
          start: new Date(Date.now() - elapsed * 1000),
          end: new Date(),
          duration: elapsed,
        },
        ...prev,
      ]);
      setElapsed(0);
    }
  };

  const todaySessions = sessions;
  const totalToday = todaySessions.reduce((s, x) => s + x.duration, 0) + (running ? elapsed : 0);

  return (
    <DashboardShell requiredRole="technician">
      {(user) => (
        <div className="space-y-6 max-w-xl">
          <div>
            <h1 className="text-2xl font-black text-foreground">Time Tracking</h1>
            <p className="text-muted-foreground font-medium mt-0.5">Log time spent on each repair</p>
          </div>

          {/* Today Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-primary">{formatDuration(totalToday)}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Today Total</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-foreground">{todaySessions.length}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Sessions</p>
            </div>
          </div>

          {/* Timer Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
            {/* Ticket Selector */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Working on</p>
              <div className="relative">
                <button
                  onClick={() => !running && setOpen(!open)}
                  disabled={running}
                  className="w-full flex items-center justify-between bg-muted rounded-xl px-4 py-3 text-left disabled:opacity-60"
                >
                  <div>
                    <p className="font-bold text-foreground">{selectedTicket.id}</p>
                    <p className="text-xs text-muted-foreground">{selectedTicket.customer} · {selectedTicket.device}</p>
                  </div>
                  {!running && <ChevronDown size={14} className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
                </button>
                {open && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10">
                    {MOCK_TICKETS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTicket(t); setOpen(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                      >
                        <p className="font-bold text-sm text-foreground">{t.id}</p>
                        <p className="text-xs text-muted-foreground">{t.customer} · {t.device}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Timer Display */}
            <div className="text-center py-6">
              <div className={`text-5xl font-black tabular-nums transition-colors ${running ? "text-primary" : "text-foreground"}`}>
                {formatDuration(elapsed)}
              </div>
              {running && (
                <p className="text-sm text-muted-foreground font-medium mt-2 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Timer running…
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              {!running ? (
                <button
                  onClick={handleStart}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-black rounded-xl hover:opacity-90 transition-all"
                >
                  <Play size={20} />
                  Start Timer
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-red-500 text-white font-black rounded-xl hover:opacity-90 transition-all"
                >
                  <Pause size={20} />
                  Stop & Save
                </button>
              )}
            </div>
          </div>

          {/* Session History */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Today's Sessions</p>
            {todaySessions.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <Timer size={28} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground font-medium text-sm">No sessions logged yet</p>
              </div>
            ) : (
              todaySessions.map((session, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Clock size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{session.ticketId}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.start.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                        {session.end && ` → ${session.end.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-foreground tabular-nums">{formatDuration(session.duration)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
