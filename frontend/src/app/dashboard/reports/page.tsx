"use client";

// /dashboard/reports has no reports of its own — each role has a real reports
// page. This route just forwards owners/managers to theirs and shows a proper
// access-denied panel for everyone else (no redirect loop: the targets are
// different routes that render their own content).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { Loader2, ShieldAlert } from "lucide-react";

const ROLE_REPORTS: Record<string, string> = {
  owner: "/dashboard/owner/reports",
  manager: "/dashboard/manager/reports",
};

export default function ReportsPage() {
  const router = useRouter();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let role = "";
    try {
      role = (JSON.parse(localStorage.getItem("user") ?? "{}")?.role ?? "")
        .toString().trim().toLowerCase();
    } catch { /* fall through to denied */ }

    const target = ROLE_REPORTS[role];
    if (target) {
      router.replace(target);
    } else if (!role) {
      router.replace("/login");
    } else {
      setDenied(true);
    }
  }, [router]);

  return (
    <DashboardShell requiredRole={["owner", "manager", "technician", "frontdesk", "driver", "customer"]}>
      {() =>
        denied ? (
          <div className="max-w-lg mx-auto mt-16 bg-card border border-border rounded-2xl shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-xl font-black text-foreground">Reports are not available for your role</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Only shop owners and managers can view business reports. If you believe you
              need access, ask your shop owner.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 px-5 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:opacity-90 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin w-8 h-8 mb-4" />
            <p>Opening your reports…</p>
          </div>
        )
      }
    </DashboardShell>
  );
}
