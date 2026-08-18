"use client";

import DashboardShell from "@/components/DashboardShell";
import StaffManager from "@/components/staff/StaffManager";

export default function OwnerUsersPage() {
  return (
    <DashboardShell requiredRole="owner">
      {() => <StaffManager canAdd canEdit canDelete />}
    </DashboardShell>
  );
}
