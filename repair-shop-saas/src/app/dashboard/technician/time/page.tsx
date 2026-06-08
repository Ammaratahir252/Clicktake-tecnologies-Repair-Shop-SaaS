"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useEffect, useRef } from "react";
import { Clock, Play, Pause, Timer, ChevronDown, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOCK_TICKETS = [
  { id: "REP-2026-00451", customer: "Ahmed Khan", device: "iPhone 15 Pro Max" },
  { id: "REP-2026-00448", customer: "Sara Malik", device: "Samsung Galaxy S24" },
  { id: "REP-2026-00453", customer: "Bilal Sheikh", device: "iPad Pro" },
];

type Session = {
  ticketId: string;
  customer: string;
  device: string;
  start: Date;
  end: Date | null;
  duration: number;
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
  return date.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
}

/** Animated circular progress ring */
function TimerRing({ elapsed, running }: { elapsed: number; running: boolean }) {
  const size = 200;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Progress resets every 60 minutes visually
  const progress = ((elapsed % 3600) / 3600) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow effect */}
      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-4 rounded-full bg-primary/10 blur-xl"
          />
        )}
      </AnimatePresence>

      {/* SVG Ring */}
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border/40"
        />
        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={running ? "hsl(var(--primary))" : "#94a3b8"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s" }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          animate={running ? { opacity: [1, 0.7, 1] } : { opacity: 1 }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`text-4xl font-black tabular-nums tracking-tight ${running ? "text-primary" : "text-foreground"}`}
        >
          {formatDuration(elapsed)}
        </motion.div>
        {running ? (
          <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            Running
          </p>
        ) : (
          <p className="text-xs text-muted-foreground font-medium mt-1">Ready</p>
        )}
      </div>
    </div>
  );
}

export default function TechnicianTimePage() {
  const [selectedTicket, setSelectedTicket] = useState(MOCK_TICKETS[0]);
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([
    {
      ticketId: "REP-2026-00448",
      customer: "Sara Malik",
      device: "Samsung Galaxy S24",
      start: new Date(Date.now() - 4500000),
      end: new Date(Date.now() - 2700000),
      duration: 1800,
    },
    {
      ticketId: "REP-2026-00451",
      customer: "Ahmed Khan",
      device: "iPhone 15 Pro Max",
      start: new Date(Date.now() - 7200000),
      end: new Date(Date.now() - 5400000),
      duration: 1800,
    },
  ]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (running) {
      interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [running]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
          customer: selectedTicket.customer,
          device: selectedTicket.device,
          start: new Date(Date.now() - elapsed * 1000),
          end: new Date(),
          duration: elapsed,
        },
        ...prev,
      ]);
      setElapsed(0);
    }
  };

  const totalToday = sessions.reduce((s, x) => s + x.duration, 0) + (running ? elapsed : 0);
  const longestSession = Math.max(...sessions.map((s) => s.duration), 0);

  return (
    <DashboardShell requiredRole="technician">
      {() => (
        <div className="flex flex-col h-[calc(100dvh-4rem)] w-full max-w-5xl mx-auto overflow-hidden">

          {/* Page Header */}
          <div className="px-6 py-5 flex-shrink-0 border-b border-border/40">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Time Tracking</h1>
            <p className="text-muted-foreground text-sm font-medium mt-0.5">Log and review time spent on each repair</p>
          </div>

          {/* Main Content — scrollable */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 max-w-5xl">

              {/* ── Left: Timer ── */}
              <div className="lg:col-span-3 space-y-5">

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Today Total", value: formatDuration(totalToday), icon: Clock, color: "text-primary bg-primary/10" },
                    { label: "Sessions", value: sessions.length.toString(), icon: Timer, color: "text-violet-500 bg-violet-500/10" },
                    { label: "Longest", value: longestSession > 0 ? formatDuration(longestSession) : "—", icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-card border border-border rounded-2xl p-4 text-center space-y-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto ${color}`}>
                        <Icon size={16} />
                      </div>
                      <p className="text-xl font-black text-foreground tabular-nums">{value}</p>
                      <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Timer Card */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">

                  {/* Ticket Selector */}
                  <div className="space-y-2" ref={dropdownRef}>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.12em]">Working on</p>
                    <div className="relative">
                      <button
                        onClick={() => !running && setOpen(!open)}
                        disabled={running}
                        className="w-full flex items-center justify-between bg-muted hover:bg-muted/70 transition-colors rounded-2xl px-4 py-3.5 text-left disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Clock size={14} className="text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground text-sm truncate">{selectedTicket.id}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {selectedTicket.customer} · {selectedTicket.device}
                            </p>
                          </div>
                        </div>
                        {!running && (
                          <ChevronDown
                            size={14}
                            className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
                          />
                        )}
                      </button>

                      <AnimatePresence>
                        {open && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-2xl shadow-xl z-20 overflow-hidden"
                          >
                            {MOCK_TICKETS.map((t, i) => (
                              <button
                                key={t.id}
                                onClick={() => { setSelectedTicket(t); setOpen(false); }}
                                className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3 ${i < MOCK_TICKETS.length - 1 ? "border-b border-border/50" : ""}`}
                              >
                                <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Clock size={12} className="text-primary" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm text-foreground">{t.id}</p>
                                  <p className="text-xs text-muted-foreground">{t.customer} · {t.device}</p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Ring Timer */}
                  <div className="flex justify-center py-2">
                    <TimerRing elapsed={elapsed} running={running} />
                  </div>

                  {/* Controls */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={running ? handleStop : handleStart}
                    className={`w-full flex items-center justify-center gap-3 py-4 font-black text-base rounded-2xl transition-all shadow-md ${
                      running
                        ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/25"
                        : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25"
                    }`}
                  >
                    <motion.div
                      animate={running ? { rotate: 0 } : { rotate: 0 }}
                      className="flex items-center gap-2"
                    >
                      {running ? <Pause size={20} /> : <Play size={20} />}
                      {running ? "Stop & Save Session" : "Start Timer"}
                    </motion.div>
                  </motion.button>
                </div>
              </div>

              {/* ── Right: Session History ── */}
              <div className="lg:col-span-2 space-y-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.12em]">
                  Session History ({sessions.length})
                </p>

                {sessions.length === 0 ? (
                  <div className="bg-card border border-border rounded-2xl p-10 text-center">
                    <Timer size={28} className="text-muted-foreground mx-auto mb-3" />
                    <p className="font-bold text-foreground text-sm">No sessions yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Start a timer to log your first session</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {sessions.map((session, i) => (
                        <motion.div
                          key={`${session.ticketId}-${session.start.getTime()}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Clock size={13} className="text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">{session.ticketId}</p>
                                <p className="text-xs text-muted-foreground truncate">{session.device}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {formatTime(session.start)}
                                  {session.end && ` → ${formatTime(session.end)}`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-base font-black text-foreground tabular-nums">
                                {formatDuration(session.duration)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}