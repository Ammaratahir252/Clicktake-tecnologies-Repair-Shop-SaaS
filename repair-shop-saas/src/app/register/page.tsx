"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  Store, User, Globe, Mail, Lock, Loader2, Wrench, 
  MonitorSmartphone, Key, Truck, HeartHandshake, ArrowLeft, 
  Eye, EyeOff, CheckCircle2, ShieldCheck 
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    subdomain: "",
    email: "",
    password: "",
    name: "",
    tenantId: "",
    phone: ""
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const roles = [
    { id: "owner", title: "Shop Owner", desc: "Register a new repair shop and manage your team", icon: Store, color: "text-blue-600", bg: "bg-blue-50", borderHover: "hover:border-blue-300" },
    { id: "customer", title: "Customer", desc: "Track your repairs, approve estimates, pay invoices", icon: HeartHandshake, color: "text-slate-600", bg: "bg-slate-50", borderHover: "hover:border-slate-300" },
    { id: "technician", title: "Technician", desc: "Join your shop and manage assigned repair tickets", icon: Wrench, color: "text-amber-600", bg: "bg-amber-50", borderHover: "hover:border-amber-300" },
    { id: "frontdesk", title: "Front Desk", desc: "Handle customer intake and ticket creation", icon: MonitorSmartphone, color: "text-emerald-600", bg: "bg-emerald-50", borderHover: "hover:border-emerald-300" },
    { id: "manager", title: "Manager", desc: "Oversee operations, tickets, inventory and reports", icon: Key, color: "text-purple-600", bg: "bg-purple-50", borderHover: "hover:border-purple-300" },
    { id: "driver", title: "Driver", desc: "Manage your pickup and delivery jobs", icon: Truck, color: "text-orange-600", bg: "bg-orange-50", borderHover: "hover:border-orange-300" },
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
      if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = "Please enter a valid email address";
      }
      if (name === "password") {
        if (value.length < 8) error = "Password must be at least 8 characters";
        else if (!/[A-Z]/.test(value)) error = "Needs an uppercase letter";
        else if (!/[0-9]/.test(value)) error = "Needs a number";
        else if (!/[!@#$%^&*]/.test(value)) error = "Needs a special character";
      }
      if (name === "tenantId" && selectedRole !== "owner" && selectedRole !== "customer" && !value) {
        error = "Shop ID is required to join a team";
      }
    }
    setErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateField(e.target.name, e.target.value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Auto-format subdomain
    if (name === "subdomain") {
      const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-');
      setFormData({ ...formData, [name]: formatted });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear inline error when typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const checkPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%^&*]/.test(pass)) score++;
    return score;
  };
  const passStrength = checkPasswordStrength(formData.password);

  useEffect(() => {
    setTimeout(() => { setErrorMessage(""); }, 5000);
  }, [errorMessage]);

  // Real-time Subdomain Checker
  useEffect(() => {
    if (selectedRole !== "owner") return;
    
    const sub = formData.subdomain.trim();
    if (!sub) {
      setSubdomainStatus("idle");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(sub.toLowerCase())) {
      setSubdomainStatus("invalid");
      return;
    }

    setSubdomainStatus("checking");
    const timeoutId = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/tenant/resolve?subdomain=${sub.toLowerCase()}`);
        if (res.data?.success) {
          setSubdomainStatus("taken");
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          setSubdomainStatus("available");
        } else {
          setSubdomainStatus("idle");
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.subdomain, selectedRole]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields before submit
    const fieldsToValidate = ["email", "password"];
    if (selectedRole === "owner") fieldsToValidate.push("shopName", "ownerName", "subdomain");
    else if (selectedRole === "customer") fieldsToValidate.push("name", "phone");
    else fieldsToValidate.push("name", "tenantId");

    let isValid = true;
    fieldsToValidate.forEach(field => {
      if (!validateField(field, formData[field as keyof typeof formData])) {
        isValid = false;
      }
    });

    if (!isValid) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const payload = { ...formData, role: selectedRole };
      if (selectedRole !== "owner" && !payload.name) payload.name = formData.name;
      
      await axios.post("/api/auth/register", payload);
      
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeRoleMeta = roles.find(r => r.id === selectedRole);

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 text-black font-sans">
        <div className="bg-white p-12 rounded-[32px] shadow-2xl shadow-green-100/50 w-full max-w-lg border border-green-100 text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2">Registration Complete!</h2>
          <p className="text-slate-500 font-medium mb-8">Your account has been created successfully. Redirecting you to login...</p>
          <Loader2 className="w-6 h-6 text-green-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 text-black font-sans">
      <div className="bg-white p-8 rounded-[32px] shadow-2xl shadow-blue-100/50 w-full max-w-2xl border border-slate-100">
        
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Who are you?</h2>
              <p className="text-slate-500 mt-2 font-medium">Select your role to get started</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((r) => {
                const Icon = r.icon;
                return (
                  <div 
                    key={r.id}
                    onClick={() => handleRoleSelect(r.id)}
                    className={`p-5 border border-slate-100 rounded-2xl cursor-pointer hover:shadow-lg hover:shadow-slate-100 transition-all flex items-center gap-4 group ${r.borderHover}`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${r.bg} ${r.color} group-hover:scale-105 transition-transform`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{r.title}</h3>
                      <p className="text-[11px] text-slate-500 font-semibold leading-tight mt-1">{r.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-10 text-center text-[13px] text-slate-400 font-semibold border-t border-slate-100 pt-6">
              ALREADY HAVE AN ACCOUNT?{" "}
              <a href="/login" className="text-blue-600 font-black hover:underline">LOG IN HERE</a>
            </div>
          </div>
        )}

        {step === 2 && activeRoleMeta && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-300">
            <button 
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-800 mb-6 transition-colors"
            >
              <ArrowLeft size={16} /> Back to roles
            </button>

            <div className="flex items-center justify-center mb-6">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wide ${activeRoleMeta.bg} ${activeRoleMeta.color} border-current opacity-80`}>
                <ShieldCheck size={14} />
                Registering as: {activeRoleMeta.title}
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Create Account
              </h2>
              <p className="text-slate-500 mt-2 font-medium">Fill in your details below</p>
            </div>

            {errorMessage && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 border border-red-100 text-center font-semibold animate-in shake">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* === SHOP OWNER FIELDS === */}
              {selectedRole === "owner" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Shop Name</label>
                    <div className="relative group">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600" />
                      <input name="shopName" value={formData.shopName} onBlur={handleBlur} placeholder="e.g. Abid Repair Shop" className={`w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.shopName ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`} onChange={handleChange} />
                    </div>
                    {errors.shopName && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{errors.shopName}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Owner Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="ownerName" value={formData.ownerName} onBlur={handleBlur} placeholder="Your Name" className={`w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.ownerName ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`} onChange={handleChange} />
                      </div>
                      {errors.ownerName && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{errors.ownerName}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Subdomain</label>
                      <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="subdomain" value={formData.subdomain} onBlur={handleBlur} placeholder="shop-name" className={`w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.subdomain ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`} onChange={handleChange} />
                      </div>
                      {subdomainStatus === "checking" && <p className="text-xs text-blue-500 mt-1">Checking availability...</p>}
                      {subdomainStatus === "taken" && <p className="text-xs text-red-500 mt-1">Subdomain already taken.</p>}
                      {subdomainStatus === "invalid" && <p className="text-xs text-red-500 mt-1">Invalid characters.</p>}
                    </div>
                  </div>
                </>
              )}

              {/* === STAFF & CUSTOMER FIELDS === */}
              {selectedRole !== "owner" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input name="name" value={formData.name} onBlur={handleBlur} placeholder="Your Name" className={`w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.name ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`} onChange={handleChange} />
                  </div>
                  {errors.name && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{errors.name}</p>}
                </div>
              )}

              {/* === ALL ROLES: EMAIL & PASSWORD === */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input name="email" value={formData.email} type="email" onBlur={handleBlur} placeholder="email@example.com" className={`w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.email ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`} onChange={handleChange} />
                </div>
                {errors.email && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{errors.email}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input name="password" value={formData.password} type={showPassword ? "text" : "password"} onBlur={handleBlur} placeholder="••••••••" className={`w-full p-4 pl-12 pr-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.password ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`} onChange={handleChange} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {formData.password.length > 0 && (
                  <div className="mt-2 pl-1">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(level => (
                        <div key={level} className={`h-1.5 flex-1 rounded-full ${passStrength >= level ? (passStrength < 3 ? 'bg-amber-400' : 'bg-green-500') : 'bg-slate-200'}`} />
                      ))}
                    </div>
                    {errors.password ? (
                      <p className="text-xs text-red-500 font-semibold mt-1">{errors.password}</p>
                    ) : (
                      <p className={`text-xs font-semibold ${passStrength === 4 ? 'text-green-600' : 'text-slate-400'}`}>
                        {passStrength === 4 ? 'Strong password!' : 'Keep typing...'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* === STAFF ONLY: SHOP ID === */}
              {["manager", "frontdesk", "technician", "driver"].includes(selectedRole) && (
                <div className="space-y-1 pt-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Shop ID</label>
                  <div className="relative group">
                    <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input name="tenantId" value={formData.tenantId} onBlur={handleBlur} placeholder="Paste your Shop ID here" className={`w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm ${errors.tenantId ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`} onChange={handleChange} />
                  </div>
                  {errors.tenantId ? (
                    <p className="text-xs text-red-500 font-medium ml-1 mt-1">{errors.tenantId}</p>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium ml-1 mt-1">Ask your shop owner for your Shop ID</p>
                  )}
                </div>
              )}

              {/* === CUSTOMER ONLY: PHONE === */}
              {selectedRole === "customer" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Phone Number</label>
                  <div className="relative group">
                    <MonitorSmartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input name="phone" value={formData.phone} onBlur={handleBlur} placeholder="+1 (555) 000-0000" className={`w-full p-4 pl-12 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all ${errors.phone ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`} onChange={handleChange} />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 font-medium ml-1 mt-1">{errors.phone}</p>}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setStep(1)}
                  className="flex-1 bg-slate-100 text-slate-700 font-bold p-4 rounded-2xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                  <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <button type="submit" disabled={isLoading || subdomainStatus === "taken" || subdomainStatus === "invalid" || subdomainStatus === "checking"}
                  className="flex-[2] bg-slate-900 text-white font-bold p-4 rounded-2xl hover:bg-blue-600 disabled:bg-slate-300 transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2">
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" /><span>Processing...</span></>) : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}