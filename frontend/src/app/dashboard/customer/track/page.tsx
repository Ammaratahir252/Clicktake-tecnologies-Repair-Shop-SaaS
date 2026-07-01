"use client";

import DashboardShell from "@/components/DashboardShell";
import { RepairTracker } from "@/components/customer/RepairTracker";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Loader2, Package } from "lucide-react";

function mapStatus(status: string): "received" | "diagnosed" | "repair" | "qc" | "ready" | "delivered" {
  const map: Record<string, "received" | "diagnosed" | "repair" | "qc" | "ready" | "delivered"> = {
    received:      "received",
    diagnosed:     "diagnosed",
    estimate_sent: "diagnosed",
    approved:      "repair",
    in_repair:     "repair",
    ready:         "ready",
    delivered:     "delivered",
    cancelled:     "received",
  };
  return map[status] ?? "received";
}

export default function CustomerTrackPage() {
  return (
    <DashboardShell requiredRole="customer">
      {() => <TrackContent />}
    </DashboardShell>
  );
}

function TrackContent() {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/tickets")
      .then((res) => {
        const tickets: any[] = res.data?.data ?? [];
        const active = tickets.find(
          (t) => !["delivered", "cancelled"].includes(t.status)
        ) ?? tickets[0];
        setTicket(active ?? null);
      })
      .catch(() => setError("Could not load your repair status."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading your repair…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive font-medium">
        {error}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <Package size={40} />
        <p className="font-medium">No active repairs found.</p>
      </div>
    );
  }

  const repairData = {
    id:                  String(ticket._id),
    ticketNumber:        ticket.ticketNumber,
    deviceType:          ticket.deviceBrand,
    deviceModel:         ticket.deviceModel,
    issueDescription:    ticket.issue,
    currentStatus:       mapStatus(ticket.status),
    estimatedCompletion: ticket.updatedAt ?? ticket.createdAt,
    createdAt:           ticket.createdAt,
    customerName:        ticket.customerId?.name  ?? "Customer",
    customerPhone:       ticket.customerId?.phone ?? "",
    customerEmail:       ticket.customerId?.email ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Track Your Repair</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your device repair progress in real-time
        </p>
      </div>
      <RepairTracker repair={repairData} />
    </div>
  );
}
