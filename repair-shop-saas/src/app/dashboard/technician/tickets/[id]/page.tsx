"use client";
import DashboardShell from "@/components/DashboardShell";
import TicketDetail from "@/components/tickets/TicketDetail";

export default function TechnicianTicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardShell requiredRole="technician">
      {(user) => (
        <TicketDetail 
          ticketId={params.id} 
          rolePath="/dashboard/technician/tickets" 
          userRole={user.role} 
        />
      )}
    </DashboardShell>
  );
}
