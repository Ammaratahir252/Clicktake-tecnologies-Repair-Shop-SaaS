"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketList from "@/components/tickets/TicketList";

export default function TechnicianTicketsPage() {
  return (
    <DashboardShell requiredRole="technician">
      {(user) => (
        <TicketList
          rolePath="/dashboard/technician/tickets"
          canCreate={false}
          canDelete={false}
        />
      )}
    </DashboardShell>
  );
}

