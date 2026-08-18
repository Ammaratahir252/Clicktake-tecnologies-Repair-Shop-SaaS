"use client";

/**
 * Role-agnostic "view all notifications" page — every logged-in role (owner,
 * manager, frontdesk, technician, driver, customer, super_admin, admin) lands
 * here from the bell dropdown's "View all" link. Shows the current user's full
 * notification history (not just the dropdown's last-10), with mark-read.
 * This is distinct from /dashboard/super-admin/notifications, which is a
 * platform-wide feed across every tenant/user — this page only ever shows
 * notifications addressed to the logged-in user.
 */

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Bell, Loader2, AlertTriangle, RefreshCw, XCircle, CheckCheck } from "lucide-react";

interface NotificationRecord {
  _id: string;
  type: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

const ALL_ROLES = ["super_admin", "admin", "owner", "manager", "technician", "frontdesk", "customer", "driver"];

export default function NotificationsPage() {
  return (
    <DashboardShell requiredRole={ALL_ROLES}>
      {() => <NotificationsContent />}
    </DashboardShell>
  );
}

function NotificationsContent() {
  const [items, setItems] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/notifications?limit=50");
      setItems(res.data?.data?.items ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    try {
      await api.patch(`/api/notifications/${id}`);
    } catch {
      // non-critical — worst case it stays "unread" until next fetch
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch("/api/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {
      // keep current state
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <Bell className="text-primary-foreground w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Notifications</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              {loading ? "Loading…" : `${items.length} notification${items.length !== 1 ? "s" : ""}${unreadCount > 0 ? ` · ${unreadCount} unread` : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-60"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted text-xs font-bold uppercase tracking-wider transition-all"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <button onClick={() => setError("")} className="ml-auto"><XCircle size={14} className="text-destructive/60" /></button>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin w-8 h-8 mr-3" />
            <span className="font-medium">Loading notifications…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="mx-auto text-muted-foreground/40 w-10 h-10 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((n) => (
              <button
                key={n._id}
                onClick={() => !n.readAt && markRead(n._id)}
                className={`w-full text-left px-6 py-4 flex items-start gap-3 hover:bg-muted/30 transition-colors ${!n.readAt ? "bg-primary/5" : ""}`}
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.readAt ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
