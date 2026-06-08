"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketForm from "@/components/tickets/TicketForm";

export default function ManagerNewTicketPage() {
  return (
    <DashboardShell requiredRole="manager">
      {(user) => <TicketForm rolePath="/dashboard/manager/tickets" />}
    </DashboardShell>
  );
}

