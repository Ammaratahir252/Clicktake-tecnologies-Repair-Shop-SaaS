"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketList from "@/components/tickets/TicketList";

export default function ManagerTicketsPage() {
  return (
    <DashboardShell requiredRole="manager">
      {(user) => (
        <TicketList
          rolePath="/dashboard/manager/tickets"
          canCreate={true}
          canDelete={false}
        />
      )}
    </DashboardShell>
  );
}

