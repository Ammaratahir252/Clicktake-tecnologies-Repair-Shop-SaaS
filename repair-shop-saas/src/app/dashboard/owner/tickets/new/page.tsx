"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketForm from "@/components/tickets/TicketForm";

export default function OwnerNewTicketPage() {
  return (
    <DashboardShell requiredRole="owner">
      {(user) => <TicketForm rolePath="/dashboard/owner/tickets" />}
    </DashboardShell>
  );
}

