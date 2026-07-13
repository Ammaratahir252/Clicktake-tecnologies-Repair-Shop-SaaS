"use client";

/**
 * PortalFeatureGuard
 *
 * Even though DashboardShell already hides disabled tabs from the customer
 * sidebar, a customer could still type the URL directly (e.g.
 * /dashboard/customer/delivery) and reach a page the shop owner turned off.
 *
 * This component closes that gap: it checks the tenant's
 * branding.customerPortal preferences and redirects back to
 * /dashboard/customer if the requested feature is disabled.
 *
 * Usage (inside the DashboardShell render-prop, AFTER auth is resolved):
 *
 *   <DashboardShell requiredRole="customer">
 *     {() => (
 *       <PortalFeatureGuard feature="showDelivery">
 *         <DeliveryPageContent />
 *       </PortalFeatureGuard>
 *     )}
 *   </DashboardShell>
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

type CustomerPortalFeature = "showReviews" | "showDelivery" | "showEstimates";

interface PortalFeatureGuardProps {
  feature: CustomerPortalFeature;
  children: React.ReactNode;
}

export default function PortalFeatureGuard({ feature, children }: PortalFeatureGuardProps) {
  const router = useRouter();
  // "checking" → fetching prefs | "allowed" → render children | "blocked" → redirecting
  const [status, setStatus] = useState<"checking" | "allowed" | "blocked">("checking");

  useEffect(() => {
    let cancelled = false;

    api.get("/api/tenant/branding")
      .then((res) => {
        if (cancelled) return;
        const prefs = res.data?.data?.branding?.customerPortal;
        // Default to enabled (true) if owner never set a preference —
        // matches the schema default so old tenants aren't broken.
        const enabled = prefs?.[feature] ?? true;

        if (enabled) {
          setStatus("allowed");
        } else {
          setStatus("blocked");
          router.replace("/dashboard/customer");
        }
      })
      .catch(() => {
        // Network/API hiccup — fail open so a glitch never locks a
        // paying customer out of a feature they're entitled to.
        if (!cancelled) setStatus("allowed");
      });

    return () => {
      cancelled = true;
    };
  }, [feature, router]);

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6" />
        <span className="text-sm font-medium">Loading…</span>
      </div>
    );
  }

  if (status === "blocked") {
    // Redirect already triggered above — render nothing in the meantime.
    return null;
  }

  return <>{children}</>;
}
