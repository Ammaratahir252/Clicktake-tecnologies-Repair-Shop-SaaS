"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketDetail from "@/components/tickets/TicketDetail";

export default function OwnerTicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardShell requiredRole="owner">
      {(user) => (
        <TicketDetail 
          ticketId={params.id} 
          rolePath="/dashboard/owner/tickets" 
          userRole={user.role} 
        />
      )}
    </DashboardShell>
  );
}
