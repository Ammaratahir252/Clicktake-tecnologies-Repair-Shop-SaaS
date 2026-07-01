"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { Loader2 } from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      router.replace("/login");
      return;
    }

    let user: any;
    try {
      user = JSON.parse(raw);
    } catch {
      router.replace("/login");
      return;
    }

    const role = (user?.role ?? "").toString().trim().toLowerCase();

    // owner and manager can see reports
    if (!["owner", "manager"].includes(role)) {
      router.replace("/dashboard");
      return;
    }

    setCurrentUser(user);
  }, []);

  if (!currentUser) {
    return (
      <DashboardShell requiredRole={["owner", "manager"]}>
        {() => (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin w-8 h-8 mb-4" />
            <p>Loading reports...</p>
          </div>
        )}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell requiredRole={["owner", "manager"]}>
      {() => (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900">Reports</h1>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center text-slate-500">
            <p className="font-medium text-lg">Reports Module</p>
            <p className="text-sm mt-2">Coming soon. Real-time metrics and analytics.</p>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
