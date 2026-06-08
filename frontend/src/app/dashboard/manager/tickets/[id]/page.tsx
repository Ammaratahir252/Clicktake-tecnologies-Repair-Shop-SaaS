"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketDetail from "@/components/tickets/TicketDetail";

export default function ManagerTicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardShell requiredRole="manager">
      {(user) => (
        <TicketDetail 
          ticketId={params.id} 
          rolePath="/dashboard/manager/tickets" 
          userRole={user.role} 
        />
      )}
    </DashboardShell>
  );
}
