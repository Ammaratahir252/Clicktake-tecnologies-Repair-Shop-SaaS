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
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-sm mt-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 mb-6">
            <Clock size={32} />
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            {moduleName} — Coming Soon
          </h2>
          <p className="text-slate-500 font-medium max-w-md mx-auto mb-8">
            This module is currently under construction. Check back soon for updates to the {moduleName} features.
          </p>
          
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      )}
    </DashboardShell>
  );
}
