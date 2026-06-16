"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import DashboardShell from "@/components/DashboardShell";

interface ComingSoonProps {
  role: string | string[];
  moduleName: string;
}

export default function ComingSoon({ role, moduleName }: ComingSoonProps) {
  const router = useRouter();

  return (
    <DashboardShell requiredRole={role}>
      {(user) => (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm mt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-6">
            <Clock size={32} />
          </div>
          
          <h2 className="text-2xl font-black text-card-foreground mb-2">
            {moduleName} — Coming Soon
          </h2>
          <p className="text-muted-foreground font-medium max-w-md mx-auto mb-8">
            This module is currently under construction. Check back soon for updates to the {moduleName} features.
          </p>
          
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      )}
    </DashboardShell>
  );
}
