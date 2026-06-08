"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome } from "@/lib/rbac";

/**
 * DASHBOARD INDEX — /dashboard
 * 
 * This page serves as a router. If a user navigates to /dashboard directly,
 * this component checks their role from localStorage and redirects them to 
 * their specific role dashboard (e.g., /dashboard/owner, /dashboard/technician).
 */
export default function DashboardIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      router.replace("/login");
      return;
    }
    
    try {
      const user = JSON.parse(raw);
      router.replace(getRoleHome(user.role));
    } catch {
      router.replace("/login");
    }
  }, [router]);

  // Optionally return a loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
