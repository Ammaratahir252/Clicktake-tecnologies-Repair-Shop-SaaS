"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Zap, Star, TrendingUp, ShieldCheck, Check, ArrowRight,
  Loader2, AlertCircle, Store,
} from "lucide-react";

const BG     = "#fdf6ee";
const ACCENT = "#1d4ed8";
const TEXT   = "#1c1917";
const MUTED  = "#78716c";
const BORDER = "#e7d9c8";

const PLAN_ICON: Record<string, any> = {
  starter: Zap, pro: Star, business: TrendingUp, enterprise: ShieldCheck,
};
const PLAN_COLOR: Record<string, string> = {
  starter: "#0369a1", pro: "#1d4ed8", business: "#6d28d9", enterprise: "#c2410c",
};
const PLAN_BG: Record<string, string> = {
  starter: "#e0f2fe", pro: "#dbeafe", business: "#ede9fe", enterprise: "#ffedd5",
};

interface Plan {
  id: string;
  label: string;
  desc: string;
  priceFormatted: string;
  amount: number | null;
  interval: string | null;
  purchasable: boolean;
}

export default function SelectPlanPage() {
  const router = useRouter();

  const [tenantId, setTenantId] = useState("");
  const [email,    setEmail]    = useState("");
  const [plans,    setPlans]    = useState<Plan[]>([]);
  const [selected, setSelected] = useState("starter");
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Read tenantId / email / preselected plan from the URL — set by the
  // register page right after the account is created.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("tenantId") || "";
    const em  = params.get("email") || "";
    const pl  = params.get("plan");

    if (!tid) {
      // No tenant to attach a plan to — nothing useful to do on this page.
      router.push("/register");
      return;
    }
    setTenantId(tid);
    setEmail(em);
    if (pl) setSelected(pl.toLowerCase());
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get("/api/billing/plans");
        setPlans(res.data?.data || []);
      } catch {
        setErrorMessage("Couldn't load plans. Please refresh the page.");
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, []);

  const selectedPlan = plans.find(p => p.id === selected);

  const handleContinue = async () => {
    if (!selectedPlan) return;
    setErrorMessage("");

    // Free plan — nothing to charge, the tenant already exists on it. Straight to login.
    if (selectedPlan.id === "starter") {
      router.push("/login");
      return;
    }

    // No self-serve price configured for this plan (e.g. Enterprise) — route to sales instead.
    if (!selectedPlan.purchasable) {
      window.location.href = `mailto:sales@dibnowrepairsaas.com?subject=${encodeURIComponent(
        `Enterprise plan inquiry — ${email}`
      )}`;
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post("/api/billing/checkout", {
        plan: selectedPlan.id,
        email,
        tenantId,
      });
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
        return; // navigating away
      }
      setErrorMessage("Couldn't start checkout. Please try again.");
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Couldn't start checkout. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh",background:BG,fontFamily:"'DM Sans',system-ui,sans-serif",padding:"56px 24px" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style suppressHydrationWarning>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ maxWidth:920,margin:"0 auto" }}>
        {/* Header */}
        <div style={{ textAlign:"center",marginBottom:44 }}>
          <div style={{ width:52,height:52,borderRadius:14,background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px" }}>
            <Store size={24} color={ACCENT}/>
          </div>
          <h1 style={{ fontSize:34,fontWeight:800,color:TEXT,letterSpacing:"-0.6px",marginBottom:10,fontFamily:"'DM Serif Display',Georgia,serif" }}>
            Choose your plan
          </h1>
          <p style={{ color:MUTED,fontSize:15 }}>
            Your account is ready — pick a plan to get started. You can change this later.
          </p>
        </div>

        {errorMessage && (
          <div style={{ display:"flex",alignItems:"center",gap:10,padding:"13px 16px",borderRadius:14,marginBottom:24,fontSize:13,fontWeight:700,background:"rgba(239,68,68,0.07)",color:"#dc2626",border:"1px solid rgba(239,68,68,0.18)",maxWidth:520,marginLeft:"auto",marginRight:"auto" }}>
            <AlertCircle size={14}/> {errorMessage}
          </div>
        )}

        {loadingPlans ? (
          <div style={{ display:"flex",justifyContent:"center",padding:60 }}>
            <Loader2 size={28} color={ACCENT} style={{ animation:"spin 1s linear infinite" }}/>
          </div>
        ) : (
          <>
            {/* Plan cards */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:16,marginBottom:32 }}>
              {plans.map(plan => {
                const Icon = PLAN_ICON[plan.id] || Star;
                const color = PLAN_COLOR[plan.id] || ACCENT;
                const bg = PLAN_BG[plan.id] || "#dbeafe";
                const isSelected = selected === plan.id;
                return (
                  <button key={plan.id} type="button" onClick={() => setSelected(plan.id)}
                    style={{ display:"flex",flexDirection:"column",gap:10,padding:"22px 18px",borderRadius:18,border:`2px solid ${isSelected ? color : BORDER}`,background:isSelected ? bg : "#fff",textAlign:"left",cursor:"pointer",transition:"all 0.2s",fontFamily:"'DM Sans',sans-serif",boxShadow:isSelected?`0 10px 28px ${color}22`:"none" }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                      <div style={{ width:40,height:40,background:isSelected?"rgba(255,255,255,0.7)":bg,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        <Icon size={19} color={color}/>
                      </div>
                      {isSelected && <Check size={16} color={color}/>}
                    </div>
                    <div>
                      <p style={{ fontWeight:800,fontSize:16,color:TEXT,lineHeight:1 }}>{plan.label}</p>
                      <p style={{ fontWeight:700,fontSize:14,color,marginTop:6 }}>{plan.priceFormatted}</p>
                      <p style={{ fontSize:12,color:MUTED,marginTop:6,lineHeight:1.4 }}>{plan.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Continue */}
            <div style={{ maxWidth:420,margin:"0 auto" }}>
              <button type="button" onClick={handleContinue} disabled={submitting || !selectedPlan}
                style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"16px 24px",borderRadius:14,border:"none",cursor:submitting?"not-allowed":"pointer",fontWeight:800,fontSize:15,color:"#fff",fontFamily:"'DM Sans',sans-serif",background:submitting?"#94a3b8":`linear-gradient(135deg,${ACCENT} 0%,${ACCENT}cc 100%)`,boxShadow:submitting?"none":`0 10px 28px ${ACCENT}30`,opacity:submitting?0.6:1 }}>
                {submitting
                  ? <><Loader2 size={17} style={{ animation:"spin 1s linear infinite" }}/><span>Redirecting to payment…</span></>
                  : selectedPlan?.id === "starter"
                  ? <><span>Continue with Free Plan</span><ArrowRight size={16}/></>
                  : selectedPlan?.purchasable === false
                  ? <><span>Contact Sales</span><ArrowRight size={16}/></>
                  : <><span>Continue to Payment</span><ArrowRight size={16}/></>}
              </button>
              {selectedPlan && selectedPlan.id !== "starter" && selectedPlan.purchasable && (
                <p style={{ textAlign:"center",fontSize:12,color:MUTED,marginTop:14 }}>
                  You'll enter your card details securely on the next screen via Stripe.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
