"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketList from "@/components/tickets/TicketList";

export default function OwnerTicketsPage() {
  return (
    <DashboardShell requiredRole="owner">
      {(user) => (
        <TicketList
          rolePath="/dashboard/owner/tickets"
          canCreate={true}
          canDelete={true}
        />
      )}
    </DashboardShell>
  );
}

