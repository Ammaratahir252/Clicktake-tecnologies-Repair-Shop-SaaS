"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRoleHome } from "@/lib/rbac";

export default function DashboardIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Call server logout to clear any httpOnly cookie, then navigate to login.
    // This breaks the middleware redirect loop when localStorage is empty but a cookie persists.
    const forceLogout = () => {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        .catch(() => {})
        .finally(() => window.location.replace('/login'));
    };

    const raw = localStorage.getItem('user');
    if (!raw) { forceLogout(); return; }

    try {
      const user = JSON.parse(raw);
      const home = getRoleHome(user.role);
      // If getRoleHome returns /login, the role is unknown — force a clean logout
      // to prevent the middleware redirect loop (/login -> /dashboard -> /login...)
      if (home === '/login') { forceLogout(); } else { router.replace(home); }
    } catch {
      forceLogout();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
