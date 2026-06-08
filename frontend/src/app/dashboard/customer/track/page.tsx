"use client";

import DashboardShell from "@/components/DashboardShell";
import { RepairTracker } from "@/components/customer/RepairTracker";

// Mock data - replace with actual API call
const mockRepairData = {
  id: "1",
  ticketNumber: "REP-2026-00451",
  deviceType: "iPhone",
  deviceModel: "iPhone 15 Pro Max",
  issueDescription: "Cracked screen and battery replacement needed",
  currentStatus: "repair" as const,
  estimatedCompletion: "2026-06-10T15:00:00Z",
  createdAt: "2026-06-05T10:00:00Z",
  customerName: "John Doe",
  customerPhone: "+92 300 1234567",
  customerEmail: "john.doe@example.com",
};

export default function CustomerTrackPage() {
  return (
    <DashboardShell requiredRole="customer">
      {(user) => (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Track Your Repair</h1>
            <p className="text-muted-foreground mt-2">
              Monitor your device repair progress in real-time
            </p>
          </div>
          <RepairTracker repair={mockRepairData} />
        </div>
      )}
    </DashboardShell>
  );
}

// Made with Bob
