"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import api from "@/lib/api";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function SettingsTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      router.replace("/login");
      return;
    }

    const resolveTenant = async () => {
      try {
        const hostname = window.location.hostname;
        let subdomain = "elitetech"; // Mock fallback if running on bare localhost
        
        const host = hostname.split(':')[0];
        if (host !== 'localhost' && !host.startsWith('127.0.0.1')) {
           const parts = host.split('.');
           subdomain = parts[0];
        }

        const res = await api.get(`/api/tenant/resolve?subdomain=${subdomain}`);
        if (res.data?.success) {
          setTenantInfo(res.data.data);
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    resolveTenant();
  }, []);

  return (
    <DashboardShell requiredRole={['owner', 'manager', 'technician', 'frontdesk', 'customer']}>
      {() => (
        <div className="space-y-6 max-w-2xl">
          <h1 className="text-2xl font-black text-slate-900">Shop Settings (Test)</h1>
          
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="font-bold text-slate-800 mb-4">Subdomain Resolution Status</h2>
            
            {loading ? (
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="animate-spin w-5 h-5" />
                <span className="text-sm font-medium">Resolving shop details...</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl font-semibold text-sm">
                <XCircle className="w-5 h-5" />
                Resolution Failed: Shop not found or inactive.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-4 rounded-xl font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  Shop Active & Resolved
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Shop Name</div>
                    <div className="font-semibold text-slate-800">{tenantInfo.shopName}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subdomain</div>
                    <div className="font-semibold text-slate-800">{tenantInfo.subdomain}.dibnow.com</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tenant ID</div>
                    <div className="font-mono text-xs text-slate-500">{tenantInfo.tenantId}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
