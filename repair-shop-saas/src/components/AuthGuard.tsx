"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // 1. Get the token from both possible places
    const token = Cookies.get("token") || localStorage.getItem("token");

    // 2. ONLY protect the dashboard. 
    // If there is no token and the user is trying to enter /dashboard, send them to login.
    if (!token && pathname.startsWith("/dashboard")) {
      window.location.replace("/login");
    } 
    // 3. In all other cases (Register/Login), let the user stay where they are.
    else {
      setIsVerified(true);
    }
  }, [pathname]);

  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}