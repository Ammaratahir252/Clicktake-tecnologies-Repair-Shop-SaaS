"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Store, User, Globe, Mail, Lock, Loader2, Wrench,
  MonitorSmartphone, Key, Truck, HeartHandshake, ArrowLeft,
  Eye, EyeOff, CheckCircle2, ShieldCheck, Sparkles, ArrowRight,
  Phone, Check, X, AlertCircle
} from "lucide-react";
import Link from "next/link";

// ── Role accent map for the right panel ────────────────────────────────────────
const ROLE_BG: Record<string, string> = {
  owner:      "linear-gradient(145deg, #1e3a5f 0%, #1D222B 100%)",
  customer:   "linear-gradient(145deg, #1a3040 0%, #1D222B 100%)",
  technician: "linear-gradient(145deg, #3b2a0a 0%, #1D222B 100%)",
  frontdesk:  "linear-gradient(145deg, #0a3028 0%, #1D222B 100%)",
  manager:    "linear-gradient(145deg, #2a1a40 0%, #1D222B 100%)",
  driver:     "linear-gradient(145deg, #3b1a0a 0%, #1D222B 100%)",
};
const ROLE_ACCENT_COLOR: Record<string, string> = {
  owner:      "#3b82f6",
  customer:   "#0ea5e9",
  technician: "#f59e0b",
  frontdesk:  "#10b981",
  manager:    "#8b5cf6",
  driver:     "#f97316",
};

export default function RegisterPage() {
  const router = useRouter();

  const [step,            setStep]            = useState(1);
  const [selectedRole,    setSelectedRole]    = useState<string>("");
  const [isSuccess,       setIsSuccess]       = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<"idle"|"checking"|"available"|"taken"|"invalid">("idle");
  const [formData,        setFormData]        = useState({
    shopName: "", ownerName: "", subdomain: "",
    email: "", password: "", name: "", tenantId: "", phone: ""
  });
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const roles = [
    { id: "owner",      title: "Shop Owner",  desc: "Register a new repair shop and manage your team",       icon: Store,           color: "#3b82f6" },
    { id: "customer",   title: "Customer",    desc: "Track repairs, approve estimates & pay invoices",        icon: HeartHandshake,  color: "#0ea5e9" },
    { id: "technician", title: "Technician",  desc: "Join your shop and manage assigned repair tickets",      icon: Wrench,          color: "#f59e0b" },
    { id: "frontdesk",  title: "Front Desk",  desc: "Handle customer intake and ticket creation",             icon: MonitorSmartphone, color: "#10b981" },
    { id: "manager",    title: "Manager",     desc: "Oversee operations, tickets, inventory and reports",     icon: Key,             color: "#8b5cf6" },
    { id: "driver",     title: "Driver",      desc: "Manage your pickup and delivery jobs",                   icon: Truck,           color: "#f97316" },
  ];

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    setStep(2);
    setErrorMessage("");
    setErrors({});
  };

  const validateField = (name: string, value: string) => {
    let error = "";
    if (!value) {
      error = "This field is required";
    } else {
      if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Valid email required";
      if (name === "password") {
        if (value.length < 8) error = "Min 8 characters";
        else if (!/[A-Z]/.test(value)) error = "Needs an uppercase letter";
        else if (!/[0-9]/.test(value)) error = "Needs a number";
        else if (!/[!@#$%^&*]/.test(value)) error = "Needs a special character (!@#$%^&*)";
      }
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleBlur  = (e: React.FocusEvent<HTMLInputElement>)  => validateField(e.target.name, e.target.value);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = name === "subdomain"
      ? value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/\s+/g, "-")
      : value;
    setFormData(prev => ({ ...prev, [name]: formatted }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const passStrength = (() => {
    let s = 0;
    if (formData.password.length >= 8) s++;
    if (/[A-Z]/.test(formData.password)) s++;
    if (/[0-9]/.test(formData.password)) s++;
    if (/[!@#$%^&*]/.test(formData.password)) s++;
    return s;
  })();

  // Subdomain checker
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
    const fields = ["email", "password"];
    if (selectedRole === "owner")    fields.push("shopName", "ownerName", "subdomain");
    else if (selectedRole === "customer") fields.push("name", "phone");
    else fields.push("name", "tenantId");

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
  const accent     = selectedRole ? ROLE_ACCENT_COLOR[selectedRole] : "#3b82f6";

  // ── Input class helper (dark-mode aware) ─────────────────────────────────────
  const inputCls = (field: string) =>
    `w-full pl-11 pr-4 py-3.5 rounded-xl border bg-card text-foreground
     placeholder:text-muted-foreground text-sm font-medium outline-none
     focus:ring-2 transition-all duration-200
     ${errors[field]
       ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
       : "border-border focus:border-blue-500 focus:ring-blue-500/20"}`;

  // ── Success screen ────────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="bg-card border border-border rounded-2xl p-12 w-full max-w-md text-center scale-in shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30
                          flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-black text-foreground mb-3">Account Created!</h2>
          <p className="text-muted-foreground mb-8">Redirecting you to login…</p>
          <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ═══ LEFT PANEL — Dark brand panel ══════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-2/5 xl:w-[42%] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{ background: selectedRole ? ROLE_BG[selectedRole] : "linear-gradient(145deg,#1a1f35 0%,#1D222B 100%)" }}
      >
        {/* Glow blob */}
        <div style={{ position:"absolute",top:"-100px",left:"-100px",width:"400px",height:"400px",
          background:`radial-gradient(circle, ${accent}20 0%, transparent 70%)`,
          borderRadius:"50%",pointerEvents:"none",transition:"background 0.6s" }} />
        <div style={{ position:"absolute",bottom:"-80px",right:"-80px",width:"300px",height:"300px",
          background:`radial-gradient(circle, ${accent}15 0%, transparent 70%)`,
          borderRadius:"50%",pointerEvents:"none" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div style={{ width:44,height:44,background:`linear-gradient(135deg,${accent},${accent}aa)`,
              borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:`0 8px 24px ${accent}40`,transition:"all 0.4s" }}>
              <Wrench className="text-white w-5 h-5" />
            </div>
            <div>
              <p style={{ color:"#fff",fontWeight:900,fontSize:18,letterSpacing:"-0.5px",lineHeight:1 }}>Dibnow</p>
              <p style={{ color:"rgba(255,255,255,0.35)",fontSize:10,fontWeight:700,
                letterSpacing:"0.12em",textTransform:"uppercase" }}>RepairSaaS</p>
            </div>
          </div>
        </div>

        {/* Main text */}
        <div className="relative z-10">
          {step === 1 ? (
            <>
              <h1 style={{ color:"#fff",fontWeight:900,fontSize:"clamp(28px,3.5vw,46px)",
                lineHeight:1.1,letterSpacing:"-1px",marginBottom:16 }}>
                Join the<br />
                <span style={{ background:`linear-gradient(90deg,${accent},#a78bfa)`,
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
                  smarter way
                </span><br />
                to repair.
              </h1>
              <p style={{ color:"rgba(255,255,255,0.45)",fontSize:15,lineHeight:1.7,maxWidth:320,marginBottom:32 }}>
                Choose your role to get started. Each role gives you a
                tailored dashboard for your work.
              </p>
              <div className="flex flex-wrap gap-2">
                {roles.map(r => (
                  <div key={r.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    style={{ background:"rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.6)",
                      border:"1px solid rgba(255,255,255,0.1)" }}>
                    <r.icon size={12} style={{ color: r.color }} />
                    {r.title}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                {activeRole && (
                  <div style={{ width:52,height:52,background:`${accent}25`,
                    borderRadius:14,border:`1px solid ${accent}40`,
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <activeRole.icon size={24} style={{ color: accent }} />
                  </div>
                )}
                <div>
                  <p style={{ color:"rgba(255,255,255,0.4)",fontSize:11,fontWeight:700,
                    letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:2 }}>
                    Registering as
                  </p>
                  <p style={{ color:"#fff",fontWeight:900,fontSize:22,letterSpacing:"-0.5px" }}>
                    {activeRole?.title}
                  </p>
                </div>
              </div>
              <p style={{ color:"rgba(255,255,255,0.45)",fontSize:14,lineHeight:1.7,maxWidth:300 }}>
                {activeRole?.desc}
              </p>
            </>
          )}
        </div>

        <div className="relative z-10">
          <p style={{ color:"rgba(255,255,255,0.18)",fontSize:12 }}>© 2026 DibnowRepairSaaS</p>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — Form ══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 py-10 min-h-screen">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div style={{ width:36,height:36,background:"linear-gradient(135deg,#3b82f6,#6366f1)",
              borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Wrench className="text-white w-4 h-4" />
            </div>
            <p className="text-foreground font-black text-lg">DibnowRepairSaaS</p>
          </div>

          <div className="w-full max-w-lg">

            {/* ── STEP 1: Role picker ──────────────────────────────────────── */}
            {step === 1 && (
              <div className="scale-in">
                <div className="mb-8">
                  <div style={{ display:"inline-flex",alignItems:"center",gap:8,
                    background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",
                    borderRadius:999,padding:"6px 14px",marginBottom:14 }}>
                    <Sparkles size={13} className="text-indigo-400" />
                    <span style={{ color:"#818cf8",fontSize:12,fontWeight:700,letterSpacing:"0.05em" }}>
                      GET STARTED
                    </span>
                  </div>
                  <h2 className="text-foreground font-black text-3xl sm:text-4xl leading-tight mb-2"
                      style={{ letterSpacing:"-1px" }}>
                    Choose your role
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Select how you'll be using DibnowRepairSaaS.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {roles.map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRoleSelect(r.id)}
                        className="group flex items-start gap-3.5 p-4 rounded-xl border border-border
                                   bg-card text-left transition-all duration-200
                                   hover:border-blue-500/50 hover:bg-accent active:scale-[0.98]"
                      >
                        <div style={{ width:40,height:40,background:`${r.color}18`,
                          border:`1px solid ${r.color}30`,borderRadius:10,flexShrink:0,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          transition:"all 0.2s" }}>
                          <Icon size={18} style={{ color: r.color }} />
                        </div>
                        <div>
                          <p className="text-foreground font-bold text-sm mb-0.5">{r.title}</p>
                          <p className="text-muted-foreground text-xs leading-relaxed">{r.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-center text-sm">
                  <span className="text-muted-foreground">Already have an account? </span>
                  <Link href="/login" className="text-blue-500 font-bold hover:text-blue-400 transition-colors underline-offset-4 hover:underline">
                    Sign In
                  </Link>
                </div>
                <div className="text-center mt-3">
                  <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft size={15} />
                    Back to Home
                  </Link>
                </div>
              </div>
            )}

            {/* ── STEP 2: Registration form ────────────────────────────────── */}
            {step === 2 && activeRole && (
              <div className="slide-in-right">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground
                             hover:text-foreground mb-7 transition-colors"
                >
                  <ArrowLeft size={15} /> Back to roles
                </button>

                {/* Heading */}
                <div className="mb-7">
                  <div style={{ display:"inline-flex",alignItems:"center",gap:8,
                    background:`${accent}15`,border:`1px solid ${accent}30`,
                    borderRadius:999,padding:"6px 14px",marginBottom:14 }}>
                    <activeRole.icon size={13} style={{ color: accent }} />
                    <span style={{ color: accent, fontSize:12,fontWeight:700,letterSpacing:"0.05em" }}>
                      {activeRole.title.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-foreground font-black text-3xl sm:text-4xl leading-tight mb-2"
                      style={{ letterSpacing:"-1px" }}>
                    Create account
                  </h2>
                  <p className="text-muted-foreground text-sm">Fill in your details to get started.</p>
                </div>

                {/* Error */}
                {errorMessage && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl mb-5 text-sm font-semibold shake
                                  bg-red-500/10 text-red-400 border border-red-500/20">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">

                  {/* ── OWNER FIELDS ── */}
                  {selectedRole === "owner" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Shop Name</label>
                        <div className="relative">
                          <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input name="shopName" value={formData.shopName} onChange={handleChange} onBlur={handleBlur}
                                 placeholder="e.g. Abid Repair Shop" className={inputCls("shopName")} />
                        </div>
                        {errors.shopName && <p className="text-xs text-red-400 mt-1 ml-1">{errors.shopName}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Owner Name</label>
                          <div className="relative">
                            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input name="ownerName" value={formData.ownerName} onChange={handleChange} onBlur={handleBlur}
                                   placeholder="Your name" className={inputCls("ownerName")} />
                          </div>
                          {errors.ownerName && <p className="text-xs text-red-400 mt-1 ml-1">{errors.ownerName}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Subdomain</label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input name="subdomain" value={formData.subdomain} onChange={handleChange} onBlur={handleBlur}
                                   placeholder="myshop" className={inputCls("subdomain")} />
                            {/* Status icon */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {subdomainStatus === "checking"  && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
                              {subdomainStatus === "available" && <Check size={14} className="text-green-500" />}
                              {subdomainStatus === "taken"     && <X size={14} className="text-red-400" />}
                              {subdomainStatus === "invalid"   && <AlertCircle size={14} className="text-orange-400" />}
                            </div>
                          </div>
                          <p className={`text-xs mt-1 ml-1 font-medium ${
                            subdomainStatus === "available" ? "text-green-500"
                            : subdomainStatus === "taken"   ? "text-red-400"
                            : subdomainStatus === "invalid" ? "text-orange-400"
                            : "text-muted-foreground"}`}>
                            {subdomainStatus === "idle"      && "yourshop.dibnow.com"}
                            {subdomainStatus === "checking"  && "Checking availability…"}
                            {subdomainStatus === "available" && "✓ Available!"}
                            {subdomainStatus === "taken"     && "✗ Already taken"}
                            {subdomainStatus === "invalid"   && "Only a-z, 0-9 and hyphens"}
                          </p>
                          {errors.subdomain && <p className="text-xs text-red-400 ml-1">{errors.subdomain}</p>}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── STAFF / CUSTOMER NAME ── */}
                  {selectedRole !== "owner" && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Full Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input name="name" value={formData.name} onChange={handleChange} onBlur={handleBlur}
                               placeholder="Your full name" className={inputCls("name")} />
                      </div>
                      {errors.name && <p className="text-xs text-red-400 mt-1 ml-1">{errors.name}</p>}
                    </div>
                  )}

                  {/* ── EMAIL ── */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input name="email" type="email" value={formData.email} onChange={handleChange} onBlur={handleBlur}
                             placeholder="your@email.com" className={inputCls("email")} />
                    </div>
                    {errors.email && <p className="text-xs text-red-400 mt-1 ml-1">{errors.email}</p>}
                  </div>

                  {/* ── PASSWORD ── */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input name="password" type={showPassword ? "text" : "password"}
                             value={formData.password} onChange={handleChange} onBlur={handleBlur}
                             placeholder="••••••••"
                             className={`${inputCls("password")} pr-12`} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {formData.password.length > 0 && (
                      <div className="mt-2 px-1">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4].map(l => (
                            <div key={l} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                                 style={{ background: passStrength >= l
                                   ? passStrength < 3 ? "#f59e0b" : "#22c55e"
                                   : "rgba(148,163,184,0.2)" }} />
                          ))}
                        </div>
                        {errors.password
                          ? <p className="text-xs text-red-400 font-medium">{errors.password}</p>
                          : <p className={`text-xs font-medium ${passStrength === 4 ? "text-green-500" : "text-muted-foreground"}`}>
                              {passStrength === 4 ? "✓ Strong password" : "Add uppercase, number & special char"}
                            </p>
                        }
                      </div>
                    )}
                  </div>

                  {/* ── STAFF: Shop ID ── */}
                  {["manager","frontdesk","technician","driver"].includes(selectedRole) && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Shop ID</label>
                      <div className="relative">
                        <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input name="tenantId" value={formData.tenantId} onChange={handleChange} onBlur={handleBlur}
                               placeholder="Paste your Shop ID here"
                               className={`${inputCls("tenantId")} font-mono`} />
                      </div>
                      {errors.tenantId
                        ? <p className="text-xs text-red-400 mt-1 ml-1">{errors.tenantId}</p>
                        : <p className="text-xs text-muted-foreground mt-1 ml-1">Ask your shop owner for the Shop ID</p>}
                    </div>
                  )}

                  {/* ── CUSTOMER: Phone ── */}
                  {selectedRole === "customer" && (
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Phone Number</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input name="phone" value={formData.phone} onChange={handleChange} onBlur={handleBlur}
                               placeholder="+92 300 0000000" className={inputCls("phone")} />
                      </div>
                      {errors.phone && <p className="text-xs text-red-400 mt-1 ml-1">{errors.phone}</p>}
                    </div>
                  )}

                  {/* ── Buttons ── */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl
                                 border border-border bg-card text-foreground text-sm font-bold
                                 hover:bg-accent transition-all duration-200 active:scale-[0.98]"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || subdomainStatus === "taken" || subdomainStatus === "invalid" || subdomainStatus === "checking"}
                      className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-xl
                                 text-white text-sm font-bold transition-all duration-200 active:scale-[0.98]
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
                               boxShadow: isLoading ? "none" : `0 8px 24px ${accent}40` }}
                    >
                      {isLoading
                        ? <><Loader2 size={17} className="animate-spin" /><span>Creating…</span></>
                        : <><span>Create Account</span><ArrowRight size={16} /></>
                      }
                    </button>
                  </div>

                  <p className="text-center text-sm text-muted-foreground pt-1">
                    Already registered?{" "}
                    <Link href="/login" className="text-blue-500 font-bold hover:text-blue-400 transition-colors">
                      Sign in
                    </Link>
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