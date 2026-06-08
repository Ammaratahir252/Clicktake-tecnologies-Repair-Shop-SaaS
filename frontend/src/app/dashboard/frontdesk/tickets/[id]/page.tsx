"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketDetail from "@/components/tickets/TicketDetail";

export default function FrontdeskTicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardShell requiredRole="frontdesk">
      {(user) => (
        <TicketDetail 
          ticketId={params.id} 
          rolePath="/dashboard/frontdesk/tickets" 
          userRole={user.role} 
        />
      )}
    </DashboardShell>
  );
}
