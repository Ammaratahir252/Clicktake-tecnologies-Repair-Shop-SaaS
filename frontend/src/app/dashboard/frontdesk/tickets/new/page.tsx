"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketForm from "@/components/tickets/TicketForm";

export default function FrontdeskNewTicketPage() {
  return (
    <DashboardShell requiredRole="frontdesk">
      {(user) => <TicketForm rolePath="/dashboard/frontdesk/tickets" />}
    </DashboardShell>
  );
}

