"use client";

import DashboardShell, { DashboardUser } from "@/components/DashboardShell";
import ChangePasswordCard from "@/components/settings/ChangePasswordCard";
import { Settings, User as UserIcon } from "lucide-react";

export default function DriverSettingsPage() {
  return (
    <DashboardShell requiredRole="driver">
      {(user) => <SettingsContent user={user} />}
    </DashboardShell>
  );
}

function SettingsContent({ user }: { user: DashboardUser }) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-md">
          <Settings className="text-white w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">Settings</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5">Manage your account.</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-sm font-black text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
          <UserIcon size={16} className="text-primary" /> Your Account
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Name</p>
            <p className="font-semibold text-foreground">{user.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <p className="font-semibold text-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <ChangePasswordCard />
    </div>
  );
}
