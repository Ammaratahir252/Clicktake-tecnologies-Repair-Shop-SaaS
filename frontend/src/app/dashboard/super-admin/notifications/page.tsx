"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import {
  Bell, Loader2, AlertTriangle, RefreshCw, XCircle, Building2, User as UserIcon,
} from "lucide-react";

interface NotificationRecord {
  _id: string;
  tenantId?: string;
  tenantName?: string;
  recipientUserId?: string;
  recipientName?: string;
  recipientRole?: string;
  type: string;
  title: string;
  message: string;
  readAt?: string | null;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  new_lead: "bg-purple-100 text-purple-700",
  admin_notice: "bg-red-100 text-red-700",
  ticket_created: "bg-blue-100 text-blue-700",
  status_changed: "bg-amber-100 text-amber-700",
};

export default function SuperAdminNotificationsPage() {
  return (
    <DashboardShell requiredRole={["super_admin", "admin"]}>
      {() => <NotificationsContent />}
    </DashboardShell>
  );
}

function NotificationsContent() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/notifications?limit=200");
      setNotifications(res.data?.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <Bell className="text-primary-foreground w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">Platform Notifications</h1>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">
              Every notification sent across every shop, in one feed.
            </p>
          </div>
        </div>
        <button
          onClick={fetchNotifications}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted text-xs font-bold uppercase tracking-wider transition-all"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
          <button onClick={() => setError("")} className="ml-auto"><XCircle size={14} className="text-destructive/60" /></button>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <span className="font-bold text-foreground text-sm">
            {loading ? "Loading…" : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin w-8 h-8 mr-3" />
            <span className="font-medium">Loading notifications…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="mx-auto text-muted-foreground/40 w-10 h-10 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div key={n._id} className="px-6 py-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                <span className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${TYPE_COLORS[n.type] ?? "bg-slate-100 text-slate-700"}`}>
                  {n.type.replace(/_/g, " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    {n.tenantName && (
                      <span className="flex items-center gap-1"><Building2 size={10} /> {n.tenantName}</span>
                    )}
                    {n.recipientName && (
                      <span className="flex items-center gap-1"><UserIcon size={10} /> {n.recipientName}{n.recipientRole ? ` (${n.recipientRole})` : ""}</span>
                    )}
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                    {!n.readAt && <span className="text-primary font-bold">Unread</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
