"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Store, User, Globe, Mail, Lock, Loader2, Wrench,
  MonitorSmartphone, Key, Truck, HeartHandshake, ArrowLeft,
  Eye, EyeOff, CheckCircle2, ShieldCheck, ArrowRight,
  Phone, Check, X, AlertCircle, Star, Zap, TrendingUp
} from "lucide-react";
import Link from "next/link";

const BG     = "#fdf6ee";
const BG2    = "#fef9f3";
const BG3    = "#f5ede0";
const ACCENT = "#1d4ed8";
const ACCENT2= "#1e3a8a";
const TEXT   = "#1c1917";
const MUTED  = "#78716c";
const BORDER = "#e7d9c8";

const ROLE_ACCENT: Record<string, string> = {
  owner:      "#1d4ed8",
  customer:   "#0369a1",
  technician: "#92400e",
  frontdesk:  "#065f46",
  manager:    "#6d28d9",
  driver:     "#c2410c",
};
const ROLE_BG: Record<string, string> = {
  owner:      `linear-gradient(160deg,${ACCENT} 0%,${ACCENT2} 55%,#0f172a 100%)`,
  customer:   "linear-gradient(160deg,#075985 0%,#0c4a6e 55%,#0f172a 100%)",
  technician: "linear-gradient(160deg,#78350f 0%,#451a03 55%,#1c1917 100%)",
  frontdesk:  "linear-gradient(160deg,#065f46 0%,#022c22 55%,#1c1917 100%)",
  manager:    "linear-gradient(160deg,#5b21b6 0%,#2e1065 55%,#0f172a 100%)",
  driver:     "linear-gradient(160deg,#9a3412 0%,#7c2d12 55%,#1c1917 100%)",
};
const ROLE_BGLIGHT: Record<string, string> = {
  owner:"#dbeafe", customer:"#e0f2fe", technician:"#fef3c7",
  frontdesk:"#d1fae5", manager:"#ede9fe", driver:"#ffedd5",
};

export default function RegisterPage() {
  const router = useRouter();
  const [step,            setStep]            = useState(1);
  const [selectedRole,    setSelectedRole]    = useState<string>("");
  const [isSuccess,       setIsSuccess]       = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<"idle"|"checking"|"available"|"taken"|"invalid">("idle");
  const [formData, setFormData] = useState({
    shopName:"", ownerName:"", subdomain:"",
    email:"", password:"", name:"", tenantId:"", phone:""
  });
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const roles = [
    { id:"owner",      title:"Shop Owner",   icon:Store,            color:"#1d4ed8", bg:"#dbeafe",
      perks:["Full dashboard access","Revenue analytics","Team management","Multi-location support"] },
    { id:"customer",   title:"Customer",     icon:HeartHandshake,   color:"#0369a1", bg:"#e0f2fe",
      perks:["Track repairs live","Approve estimates","Online payments","Repair history"] },
    { id:"technician", title:"Technician",   icon:Wrench,           color:"#92400e", bg:"#fef3c7",
      perks:["Assigned ticket queue","Time tracking","AI diagnostics","Parts requests"] },
    { id:"frontdesk",  title:"Front Desk",   icon:MonitorSmartphone,color:"#065f46", bg:"#d1fae5",
      perks:["Customer intake","Ticket creation","Process payments","Print receipts"] },
    { id:"manager",    title:"Manager",      icon:Key,              color:"#6d28d9", bg:"#ede9fe",
      perks:["Ticket oversight","Staff scheduling","Inventory control","SLA monitoring"] },
    { id:"driver",     title:"Driver",       icon:Truck,            color:"#c2410c", bg:"#ffedd5",
      perks:["Delivery job queue","GPS navigation","Customer contact","Confirm deliveries"] },
  ];

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setStep(2);
    setErrorMessage("");
    setErrors({});
  };

  const validateField = (name: string, value: string) => {
    let error = "";
    if (!value) { error = "This field is required"; }
    else {
      if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Valid email required";
      if (name === "password") {
        if (value.length < 8) error = "Min 8 characters";
        else if (!/[A-Z]/.test(value)) error = "Needs an uppercase letter";
        else if (!/[0-9]/.test(value)) error = "Needs a number";
        else if (!/[!@#$%^&*]/.test(value)) error = "Needs a special character";
      }
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleBlur   = (e: React.FocusEvent<HTMLInputElement>)  => validateField(e.target.name, e.target.value);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = name === "subdomain"
      ? value.toLowerCase().replace(/[^a-z0-9-]/g,"").replace(/\s+/g,"-") : value;
    setFormData(prev => ({ ...prev, [name]: formatted }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]:"" }));
  };

  const passStrength = (() => {
    let s = 0;
    if (formData.password.length >= 8) s++;
    if (/[A-Z]/.test(formData.password)) s++;
    if (/[0-9]/.test(formData.password)) s++;
    if (/[!@#$%^&*]/.test(formData.password)) s++;
    return s;
  })();

  useEffect(() => {
    if (selectedRole !== "owner") return;
    const sub = formData.subdomain.trim();
    if (!sub) { setSubdomainStatus("idle"); return; }
    if (!/^[a-z0-9-]+$/.test(sub)) { setSubdomainStatus("invalid"); return; }
    setSubdomainStatus("checking");
    const id = setTimeout(async () => {
      try {
        await axios.get(`/api/tenant/resolve?subdomain=${sub}`);
        setSubdomainStatus("taken");
      } catch (err: any) {
        setSubdomainStatus(err.response?.status === 404 ? "available" : "idle");
      }
    }, 500);
    return () => clearTimeout(id);
  }, [formData.subdomain, selectedRole]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const fields = ["email","password"];
    if (selectedRole === "owner")    fields.push("shopName","ownerName","subdomain");
    else if (selectedRole === "customer") fields.push("name","phone");
    else fields.push("name","tenantId");

    let ok = true;
    fields.forEach(f => { if (!validateField(f, formData[f as keyof typeof formData])) ok = false; });
    if (!ok) return;

    setIsLoading(true);
    setErrorMessage("");
    try {
      await axios.post("/api/auth/register", { ...formData, role: selectedRole });
      setIsSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeRole = roles.find(r => r.id === selectedRole);
  const accent  = selectedRole ? ROLE_ACCENT[selectedRole] : ACCENT;
  const panelBg = selectedRole ? ROLE_BG[selectedRole] : `linear-gradient(160deg,${ACCENT} 0%,${ACCENT2} 55%,#0f172a 100%)`;

  const inputSt = (field: string): React.CSSProperties => ({
    width:"100%",paddingLeft:44,paddingRight:16,paddingTop:13,paddingBottom:13,
    borderRadius:14,border:`1.5px solid ${errors[field]?"#ef4444":BORDER}`,
    background:"#fff",color:TEXT,fontSize:14,fontWeight:500,outline:"none",
    fontFamily:"'DM Sans',sans-serif",transition:"all 0.2s",
  });

  /* ── Success ── */
  if (isSuccess) {
    return (
      <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:BG,padding:24,fontFamily:"'DM Sans',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
        <div style={{ background:"#fff",border:`1.5px solid ${BORDER}`,borderRadius:24,padding:"56px 48px",width:"100%",maxWidth:400,textAlign:"center",boxShadow:"0 40px 80px rgba(28,25,23,0.07)" }}>
          <div style={{ width:72,height:72,borderRadius:"50%",background:"#d1fae5",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px" }}>
            <CheckCircle2 size={36} color="#065f46"/>
          </div>
          <h2 style={{ color:TEXT,fontWeight:700,fontSize:32,letterSpacing:"-1px",marginBottom:10,fontFamily:"'DM Serif Display',Georgia,serif" }}>Account Created!</h2>
          <p style={{ color:MUTED,fontSize:15,marginBottom:28 }}>Redirecting you to login…</p>
          <Loader2 size={22} color={ACCENT} style={{ animation:"spin 1s linear infinite",margin:"0 auto",display:"block" }}/>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh",display:"flex",background:BG,fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      <style suppressHydrationWarning>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}
        .shake{animation:shake 0.4s ease}
        .fade-up{animation:fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both}
        *{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:#bfdbfe;color:#1e3a8a;}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:${BG}}
        ::-webkit-scrollbar-thumb{background:${BORDER};border-radius:99px}
      `}</style>

      {/* ═══ LEFT PANEL ═══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{
        width:"45%",flexShrink:0,flexDirection:"column",justifyContent:"space-between",
        padding:56,position:"relative",overflow:"hidden",
        background:panelBg,transition:"background 0.5s ease",
      }}>
        <div style={{ position:"absolute",top:"-80px",right:"-80px",width:500,height:500,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.07)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",top:"-40px",right:"-40px",width:340,height:340,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:0,left:0,width:"100%",height:"50%",background:"radial-gradient(ellipse at 10% 90%, rgba(255,255,255,0.05) 0%, transparent 60%)",pointerEvents:"none" }}/>
        <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.04 }} aria-hidden>
          <defs><pattern id="hatchR" patternUnits="userSpaceOnUse" width="40" height="40">
            <path d="M0 40L40 0M-5 5L5-5M35 45L45 35" stroke="#fff" strokeWidth="0.8" fill="none"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#hatchR)"/>
        </svg>

        {/* Logo */}
        <div style={{ position:"relative",zIndex:1,display:"flex",alignItems:"center",gap:14 }}>
          <div style={{ width:52,height:52,background:"rgba(255,255,255,0.14)",borderRadius:16,border:"1px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 24px rgba(0,0,0,0.2)",transform:"rotate(-4deg)" }}>
            <Wrench color="#fff" size={22}/>
          </div>
          <div>
            <p style={{ color:"#fff",fontWeight:700,fontSize:22,letterSpacing:"-0.5px",lineHeight:1,fontFamily:"'DM Serif Display',Georgia,serif" }}>Dibnow</p>
            <p style={{ color:"rgba(255,255,255,0.4)",fontSize:10,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase" }}>RepairSaaS</p>
          </div>
        </div>

        {/* Panel content */}
        <div style={{ position:"relative",zIndex:1 }}>
          {step === 1 ? (
            <>
              <div style={{ display:"inline-flex",alignItems:"center",gap:7,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:999,padding:"7px 14px",marginBottom:24 }}>
                <Zap size={12} color="rgba(255,255,255,0.8)"/>
                <span style={{ color:"rgba(255,255,255,0.8)",fontSize:11,fontWeight:700,letterSpacing:"0.08em" }}>JOIN 500+ REPAIR SHOPS</span>
              </div>
              <h1 style={{ color:"#fff",fontWeight:700,fontSize:"clamp(30px,3.2vw,48px)",lineHeight:1.1,letterSpacing:"-1.2px",marginBottom:18,fontFamily:"'DM Serif Display',Georgia,serif" }}>
                Start running<br/>your shop<br/>
                <em style={{ fontStyle:"italic",background:"linear-gradient(90deg,#93c5fd,#c4b5fd)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>smarter.</em>
              </h1>
              <p style={{ color:"rgba(255,255,255,0.5)",fontSize:15,lineHeight:1.8,maxWidth:300,marginBottom:40 }}>
                Pick your role to get a dashboard tailored for exactly how you work.
              </p>
              {/* Mini stats */}
              <div style={{ display:"flex",gap:20,marginBottom:40 }}>
                {[{val:"500+",label:"Shops"},{ val:"4.9",label:"Rating"},{val:"6",label:"Roles"}].map(s=>(
                  <div key={s.label}>
                    <p style={{ color:"#fff",fontWeight:700,fontSize:22,letterSpacing:"-0.5px",fontFamily:"'DM Serif Display',Georgia,serif",lineHeight:1 }}>{s.val}</p>
                    <p style={{ color:"rgba(255,255,255,0.4)",fontSize:11,fontWeight:600,marginTop:2 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Trust badges */}
              <div style={{ display:"flex",gap:8 }}>
                {[
                  { icon:ShieldCheck, text:"SSL Secured" },
                  { icon:Star,        text:"4.9 Rated"   },
                  { icon:TrendingUp,  text:"99% Uptime"  },
                ].map(({ icon:Icon,text }) => (
                  <div key={text} style={{ display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.09)",border:"1px solid rgba(255,255,255,0.13)",borderRadius:10,padding:"7px 11px" }}>
                    <Icon size={12} color="rgba(255,255,255,0.7)"/>
                    <span style={{ color:"rgba(255,255,255,0.65)",fontSize:11,fontWeight:700 }}>{text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Role detail panel */}
              {activeRole && (
                <>
                  <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:999,padding:"7px 14px",marginBottom:28 }}>
                    <activeRole.icon size={12} color="rgba(255,255,255,0.85)"/>
                    <span style={{ color:"rgba(255,255,255,0.85)",fontSize:11,fontWeight:700,letterSpacing:"0.08em" }}>REGISTERING AS</span>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:22 }}>
                    <div style={{ width:60,height:60,background:"rgba(255,255,255,0.12)",borderRadius:18,border:"1px solid rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <activeRole.icon size={28} color="#fff"/>
                    </div>
                    <h2 style={{ color:"#fff",fontWeight:700,fontSize:32,letterSpacing:"-1px",lineHeight:1,fontFamily:"'DM Serif Display',Georgia,serif" }}>{activeRole.title}</h2>
                  </div>
                  <p style={{ color:"rgba(255,255,255,0.5)",fontSize:15,lineHeight:1.75,marginBottom:32,maxWidth:290 }}>
                    {roles.find(r=>r.id===selectedRole)?.perks && "What you get with this role:"}
                  </p>
                  <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                    {activeRole.perks.map(perk => (
                      <div key={perk} style={{ display:"flex",alignItems:"center",gap:12 }}>
                        <div style={{ width:22,height:22,borderRadius:99,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <Check size={11} color="rgba(255,255,255,0.9)"/>
                        </div>
                        <span style={{ color:"rgba(255,255,255,0.75)",fontSize:14,fontWeight:600 }}>{perk}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ position:"relative",zIndex:1 }}>
          <p style={{ color:"rgba(255,255,255,0.18)",fontSize:12 }}>© 2026 DibnowRepairSaaS</p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ══════════════════════════════════════════════════════ */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflowY:"auto" }}>
        <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"52px 32px",minHeight:"100vh" }}>

          {/* Mobile logo */}
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:36 }} className="lg:hidden">
            <div style={{ width:40,height:40,background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Wrench color="#fff" size={18}/>
            </div>
            <p style={{ color:TEXT,fontWeight:700,fontSize:18,fontFamily:"'DM Serif Display',Georgia,serif" }}>DibnowRepairSaaS</p>
          </div>

          <div style={{ width:"100%",maxWidth:500 }}>

            {/* ── STEP 1: Role Picker ──────────────────────────────────────── */}
            {step === 1 && (
              <div className="fade-up">
                {/* Back */}
                <div style={{ marginBottom:28 }}>
                  <Link href="/" style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:13,fontWeight:700,color:MUTED,textDecoration:"none" }}
                    onMouseEnter={e=>(e.currentTarget.style.color=TEXT)} onMouseLeave={e=>(e.currentTarget.style.color=MUTED)}>
                    <ArrowLeft size={14}/> Back to Home
                  </Link>
                </div>

                <div style={{ marginBottom:36 }}>
                  <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:"#dbeafe",border:"1px solid rgba(29,78,216,0.2)",borderRadius:999,padding:"7px 16px",marginBottom:18 }}>
                    <ShieldCheck size={13} color={ACCENT}/>
                    <span style={{ color:ACCENT,fontSize:11,fontWeight:800,letterSpacing:"0.08em" }}>CREATE FREE ACCOUNT</span>
                  </div>
                  <h2 style={{ color:TEXT,fontWeight:700,fontSize:"clamp(28px,4vw,44px)",lineHeight:1.1,letterSpacing:"-1.2px",marginBottom:10,fontFamily:"'DM Serif Display',Georgia,serif" }}>
                    Choose your role
                  </h2>
                  <p style={{ color:MUTED,fontSize:15,lineHeight:1.6 }}>Select how you'll use DibnowRepairSaaS.</p>
                </div>

                {/* Role grid — 2 cols */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:30 }}>
                  {roles.map(r => {
                    const Icon = r.icon;
                    return (
                      <button key={r.id} type="button" onClick={() => handleRoleSelect(r.id)}
                        style={{ display:"flex",flexDirection:"column",alignItems:"flex-start",gap:10,padding:"18px 16px",borderRadius:18,border:`1.5px solid ${BORDER}`,background:"#fff",textAlign:"left",cursor:"pointer",transition:"all 0.22s cubic-bezier(0.22,1,0.36,1)",fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden" }}
                        onMouseEnter={e=>{
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.borderColor=r.color;
                          el.style.background=r.bg;
                          el.style.transform="translateY(-3px)";
                          el.style.boxShadow=`0 12px 28px ${r.color}18`;
                        }}
                        onMouseLeave={e=>{
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.borderColor=BORDER;
                          el.style.background="#fff";
                          el.style.transform="none";
                          el.style.boxShadow="none";
                        }}>
                        <div style={{ width:42,height:42,background:r.bg,border:`1.5px solid ${r.color}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <Icon size={20} color={r.color}/>
                        </div>
                        <div>
                          <p style={{ color:TEXT,fontWeight:800,fontSize:14,marginBottom:4,lineHeight:1 }}>{r.title}</p>
                          <div style={{ display:"flex",alignItems:"center",gap:4,color:r.color,fontSize:11,fontWeight:700 }}>
                            <ArrowRight size={10}/>
                            <span>Get started</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ textAlign:"center",fontSize:14,paddingTop:8,borderTop:`1px solid ${BORDER}` }}>
                  <span style={{ color:MUTED }}>Already have an account? </span>
                  <Link href="/login" style={{ color:ACCENT,fontWeight:800,textDecoration:"none" }}>Sign In →</Link>
                </div>
              </div>
            )}

            {/* ── STEP 2: Form ─────────────────────────────────────────────── */}
            {step === 2 && activeRole && (
              <div className="fade-up">
                {/* Back */}
                <button type="button" onClick={() => setStep(1)}
                  style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:700,color:MUTED,background:"none",border:"none",cursor:"pointer",marginBottom:30,fontFamily:"'DM Sans',sans-serif" }}
                  onMouseEnter={e=>(e.currentTarget.style.color=TEXT)} onMouseLeave={e=>(e.currentTarget.style.color=MUTED)}>
                  <ArrowLeft size={14}/> Back to roles
                </button>

                {/* Role badge + heading */}
                <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:32,padding:"16px 18px",borderRadius:16,background:ROLE_BGLIGHT[selectedRole]||"#dbeafe",border:`1.5px solid ${accent}20` }}>
                  <div style={{ width:48,height:48,background:"rgba(255,255,255,0.7)",border:`1.5px solid ${accent}25`,borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                    <activeRole.icon size={22} color={accent}/>
                  </div>
                  <div>
                    <p style={{ fontSize:11,fontWeight:800,color:accent,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3 }}>Registering as</p>
                    <p style={{ color:TEXT,fontWeight:800,fontSize:20,letterSpacing:"-0.4px",fontFamily:"'DM Serif Display',Georgia,serif" }}>{activeRole.title}</p>
                  </div>
                  <div style={{ marginLeft:"auto" }}>
                    <button type="button" onClick={() => setStep(1)}
                      style={{ fontSize:11,fontWeight:700,color:accent,background:"rgba(255,255,255,0.6)",border:`1px solid ${accent}25`,borderRadius:8,padding:"5px 12px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                      Change
                    </button>
                  </div>
                </div>

                {/* Error */}
                {errorMessage && (
                  <div className="shake" style={{ display:"flex",alignItems:"center",gap:10,padding:"13px 16px",borderRadius:14,marginBottom:20,fontSize:13,fontWeight:700,background:"rgba(239,68,68,0.07)",color:"#dc2626",border:"1px solid rgba(239,68,68,0.18)" }}>
                    <AlertCircle size={14}/> {errorMessage}
                  </div>
                )}

                <form onSubmit={handleRegister} style={{ display:"flex",flexDirection:"column",gap:16 }}>

                  {selectedRole === "owner" && (
                    <>
                      <div>
                        <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Shop Name</label>
                        <div style={{ position:"relative" }}>
                          <Store size={15} style={{ position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                          <input name="shopName" value={formData.shopName} onChange={handleChange} onBlur={handleBlur} placeholder="e.g. Abid Repair Shop" style={inputSt("shopName")}
                            onFocus={e=>{ e.target.style.borderColor=accent; e.target.style.boxShadow=`0 0 0 3px ${accent}15` }}
                            onBlur2={e=>{ e.target.style.borderColor=BORDER; e.target.style.boxShadow="none" }}/>
                        </div>
                        {errors.shopName && <p style={{ fontSize:11,color:"#dc2626",marginTop:5,marginLeft:4 }}>{errors.shopName}</p>}
                      </div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                        <div>
                          <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Owner Name</label>
                          <div style={{ position:"relative" }}>
                            <User size={15} style={{ position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                            <input name="ownerName" value={formData.ownerName} onChange={handleChange} onBlur={handleBlur} placeholder="Your name" style={inputSt("ownerName")}/>
                          </div>
                          {errors.ownerName && <p style={{ fontSize:11,color:"#dc2626",marginTop:5,marginLeft:4 }}>{errors.ownerName}</p>}
                        </div>
                        <div>
                          <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Subdomain</label>
                          <div style={{ position:"relative" }}>
                            <Globe size={15} style={{ position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                            <input name="subdomain" value={formData.subdomain} onChange={handleChange} onBlur={handleBlur} placeholder="myshop" style={{ ...inputSt("subdomain"),paddingRight:34 }}/>
                            <div style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)" }}>
                              {subdomainStatus==="checking"  && <Loader2 size={13} color={MUTED} style={{ animation:"spin 1s linear infinite" }}/>}
                              {subdomainStatus==="available" && <Check size={13} color="#22c55e"/>}
                              {subdomainStatus==="taken"     && <X size={13} color="#ef4444"/>}
                              {subdomainStatus==="invalid"   && <AlertCircle size={13} color="#f97316"/>}
                            </div>
                          </div>
                          <p style={{ fontSize:11,marginTop:4,marginLeft:4,fontWeight:600,color:subdomainStatus==="available"?"#22c55e":subdomainStatus==="taken"?"#ef4444":subdomainStatus==="invalid"?"#f97316":MUTED }}>
                            {subdomainStatus==="idle"?"yourshop.dibnow.com":subdomainStatus==="checking"?"Checking…":subdomainStatus==="available"?"✓ Available!":subdomainStatus==="taken"?"✗ Taken":"Only a-z, 0-9, -"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {selectedRole !== "owner" && (
                    <div>
                      <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Full Name</label>
                      <div style={{ position:"relative" }}>
                        <User size={15} style={{ position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                        <input name="name" value={formData.name} onChange={handleChange} onBlur={handleBlur} placeholder="Your full name" style={inputSt("name")}
                          onFocus={e=>{ e.target.style.borderColor=accent; e.target.style.boxShadow=`0 0 0 3px ${accent}15` }}
                          onBlur={e=>{ e.target.style.borderColor=errors["name"]?"#ef4444":BORDER; e.target.style.boxShadow="none" }}/>
                      </div>
                      {errors.name && <p style={{ fontSize:11,color:"#dc2626",marginTop:5,marginLeft:4 }}>{errors.name}</p>}
                    </div>
                  )}

                  <div>
                    <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Email Address</label>
                    <div style={{ position:"relative" }}>
                      <Mail size={15} style={{ position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                      <input name="email" type="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder="your@email.com" style={inputSt("email")}
                        onFocus={e=>{ e.target.style.borderColor=accent; e.target.style.boxShadow=`0 0 0 3px ${accent}15` }}
                        onBlur={e=>{ e.target.style.borderColor=errors["email"]?"#ef4444":BORDER; e.target.style.boxShadow="none" }}/>
                    </div>
                    {errors.email && <p style={{ fontSize:11,color:"#dc2626",marginTop:5,marginLeft:4 }}>{errors.email}</p>}
                  </div>

                  <div>
                    <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Password</label>
                    <div style={{ position:"relative" }}>
                      <Lock size={15} style={{ position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                      <input name="password" type={showPassword?"text":"password"} value={formData.password} onChange={handleChange} onBlur={handleBlur} placeholder="Min 8 chars" style={{ ...inputSt("password"),paddingRight:46 }}
                        onFocus={e=>{ e.target.style.borderColor=accent; e.target.style.boxShadow=`0 0 0 3px ${accent}15` }}
                        onBlur={e=>{ e.target.style.borderColor=errors["password"]?"#ef4444":BORDER; e.target.style.boxShadow="none" }}/>
                      <button type="button" onClick={() => setShowPassword(v=>!v)} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:MUTED }}>
                        {showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}
                      </button>
                    </div>
                    {formData.password.length > 0 && (
                      <div style={{ marginTop:8,paddingLeft:2 }}>
                        <div style={{ display:"flex",gap:4,marginBottom:5 }}>
                          {[1,2,3,4].map(l => (
                            <div key={l} style={{ height:4,flex:1,borderRadius:99,transition:"all 0.3s",background:passStrength>=l?(passStrength<3?"#f59e0b":"#22c55e"):BORDER }}/>
                          ))}
                        </div>
                        {errors.password
                          ? <p style={{ fontSize:11,color:"#ef4444",fontWeight:600 }}>{errors.password}</p>
                          : <p style={{ fontSize:11,color:passStrength===4?"#22c55e":MUTED,fontWeight:600 }}>
                              {passStrength===4?"✓ Strong password":"Add uppercase, number & special char"}
                            </p>}
                      </div>
                    )}
                  </div>

                  {["manager","frontdesk","technician","driver"].includes(selectedRole) && (
                    <div>
                      <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Shop ID</label>
                      <div style={{ position:"relative" }}>
                        <Store size={15} style={{ position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                        <input name="tenantId" value={formData.tenantId} onChange={handleChange} onBlur={handleBlur} placeholder="Paste your Shop ID" style={{ ...inputSt("tenantId"),fontFamily:"monospace",fontSize:12 }}
                          onFocus={e=>{ e.target.style.borderColor=accent; e.target.style.boxShadow=`0 0 0 3px ${accent}15` }}
                          onBlur={e=>{ e.target.style.borderColor=errors["tenantId"]?"#ef4444":BORDER; e.target.style.boxShadow="none" }}/>
                      </div>
                      {errors.tenantId ? <p style={{ fontSize:11,color:"#dc2626",marginTop:5,marginLeft:4 }}>{errors.tenantId}</p>
                        : <p style={{ fontSize:11,color:MUTED,marginTop:5,marginLeft:4 }}>Ask your shop owner for the Shop ID</p>}
                    </div>
                  )}

                  {selectedRole === "customer" && (
                    <div>
                      <label style={{ display:"block",fontSize:11,fontWeight:800,color:MUTED,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8 }}>Phone Number</label>
                      <div style={{ position:"relative" }}>
                        <Phone size={15} style={{ position:"absolute",left:15,top:"50%",transform:"translateY(-50%)",color:MUTED }}/>
                        <input name="phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur} placeholder="+92 300 0000000" style={inputSt("phone")}
                          onFocus={e=>{ e.target.style.borderColor=accent; e.target.style.boxShadow=`0 0 0 3px ${accent}15` }}
                          onBlur={e=>{ e.target.style.borderColor=errors["phone"]?"#ef4444":BORDER; e.target.style.boxShadow="none" }}/>
                      </div>
                      {errors.phone && <p style={{ fontSize:11,color:"#dc2626",marginTop:5,marginLeft:4 }}>{errors.phone}</p>}
                    </div>
                  )}

                  {/* Submit */}
                  <button type="submit"
                    disabled={isLoading||subdomainStatus==="taken"||subdomainStatus==="invalid"||subdomainStatus==="checking"}
                    style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"16px 24px",borderRadius:14,border:"none",cursor:isLoading?"not-allowed":"pointer",fontWeight:800,fontSize:15,color:"#fff",fontFamily:"'DM Sans',sans-serif",background:isLoading?"#94a3b8":`linear-gradient(135deg,${accent} 0%,${accent}cc 100%)`,boxShadow:isLoading?"none":`0 10px 28px ${accent}30`,transition:"all 0.2s",opacity:isLoading?0.6:1,marginTop:6 }}
                    onMouseEnter={e=>{ if(!isLoading){ (e.currentTarget as HTMLButtonElement).style.transform="translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow=`0 14px 36px ${accent}38` }}}
                    onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform="none"; (e.currentTarget as HTMLButtonElement).style.boxShadow=isLoading?"none":`0 10px 28px ${accent}30` }}>
                    {isLoading
                      ? <><Loader2 size={17} style={{ animation:"spin 1s linear infinite" }}/><span>Creating account…</span></>
                      : <><span>Create Account</span><ArrowRight size={16}/></>}
                  </button>

                  <p style={{ textAlign:"center",fontSize:13,color:MUTED }}>
                    Already registered?{" "}
                    <Link href="/login" style={{ color:ACCENT,fontWeight:800,textDecoration:"none" }}>Sign in →</Link>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
