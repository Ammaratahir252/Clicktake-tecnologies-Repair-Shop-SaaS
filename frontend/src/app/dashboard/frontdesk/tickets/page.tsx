"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketList from "@/components/tickets/TicketList";

export default function FrontdeskTicketsPage() {
  return (
    <DashboardShell requiredRole="frontdesk">
      {(user) => (
        <TicketList
          rolePath="/dashboard/frontdesk/tickets"
          canCreate={true}
          canDelete={false}
        />
      )}
    </DashboardShell>
  );
}

