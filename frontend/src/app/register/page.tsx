"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  Store, User, Globe, Mail, Lock, Loader2, Wrench, 
  MonitorSmartphone, Key, Truck, HeartHandshake, ArrowLeft, 
  Eye, EyeOff, CheckCircle2, ShieldCheck, Sparkles, ArrowRight,
  Phone
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
    { id: "owner", title: "Shop Owner", desc: "Register a new repair shop and manage your team", icon: Store, gradient: "from-blue-500 to-cyan-500", bgGradient: "from-blue-50 to-cyan-50" },
    { id: "customer", title: "Customer", desc: "Track your repairs, approve estimates, pay invoices", icon: HeartHandshake, gradient: "from-slate-500 to-slate-700", bgGradient: "from-slate-50 to-slate-100" },
    { id: "technician", title: "Technician", desc: "Join your shop and manage assigned repair tickets", icon: Wrench, gradient: "from-amber-500 to-orange-500", bgGradient: "from-amber-50 to-orange-50" },
    { id: "frontdesk", title: "Front Desk", desc: "Handle customer intake and ticket creation", icon: MonitorSmartphone, gradient: "from-emerald-500 to-teal-500", bgGradient: "from-emerald-50 to-teal-50" },
    { id: "manager", title: "Manager", desc: "Oversee operations, tickets, inventory and reports", icon: Key, gradient: "from-purple-500 to-pink-500", bgGradient: "from-purple-50 to-pink-50" },
    { id: "driver", title: "Driver", desc: "Manage your pickup and delivery jobs", icon: Truck, gradient: "from-orange-500 to-red-500", bgGradient: "from-orange-50 to-red-50" },
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
    
    if (name === "subdomain") {
      const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/\s+/g, '-');
      setFormData({ ...formData, [name]: formatted });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
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
      }, 2000);

    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeRoleMeta = roles.find(r => r.id === selectedRole);

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="bg-white/80 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-2xl border border-white/20 w-full max-w-lg text-center scale-in">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-black text-green-700 mb-3">
            Success!
          </h2>
          <p className="text-slate-700 font-medium mb-8">Your account has been created successfully. Redirecting to login...</p>
          <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-[2.5rem] blur-2xl opacity-20"></div>
        
        <div className="relative bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/20">
          
          {/* STEP 1: Role Selection */}
          {step === 1 && (
            <div className="scale-in">
              <div className="text-center mb-10">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                  <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl">
                    <Sparkles className="text-white w-8 h-8" />
                  </div>
                </div>
                <h2 className="text-4xl font-black text-slate-900 mb-2">
                  Choose Your Role
                </h2>
                <p className="text-slate-700 font-medium">Select how you want to use the platform</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {roles.map((r, idx) => {
                  const Icon = r.icon;
                  return (
                    <div 
                      key={r.id}
                      onClick={() => handleRoleSelect(r.id)}
                      className="group relative p-6 border-2 border-slate-200 rounded-2xl cursor-pointer hover:border-transparent transition-all duration-300 slide-in-bottom"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${r.bgGradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                      <div className="relative flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${r.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="text-white" size={24} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800 text-lg mb-1">{r.title}</h3>
                          <p className="text-xs text-slate-600 leading-relaxed">{r.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="text-center text-sm border-t border-slate-200 pt-6">
                <span className="text-slate-500 font-medium">Already have an account? </span>
                <a href="/login" className="text-blue-600 font-bold hover:text-purple-600 transition-colors underline-offset-4 hover:underline">
                  Sign In
                </a>
              </div>
            </div>
          )}

          {/* STEP 2: Registration Form */}
          {step === 2 && activeRoleMeta && (
            <div className="slide-in-right">
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
              >
                <ArrowLeft size={16} /> Back to roles
              </button>

              <div className="flex items-center justify-center mb-6">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${activeRoleMeta.gradient} text-white text-sm font-bold shadow-lg`}>
                  <ShieldCheck size={16} />
                  Registering as: {activeRoleMeta.title}
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2">
                  Create Account
                </h2>
                <p className="text-slate-700 font-medium">Fill in your details below</p>
              </div>

              {errorMessage && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 border border-red-200 text-center font-semibold shake">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                
                {/* SHOP OWNER FIELDS */}
                {selectedRole === "owner" && (
                  <>
                    <div className="space-y-2 slide-in-left" style={{ animationDelay: "0.1s" }}>
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Shop Name</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-10 transition-opacity"></div>
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                          name="shopName" 
                          value={formData.shopName} 
                          onBlur={handleBlur} 
                          placeholder="e.g. Abid Repair Shop" 
                          className={`relative w-full p-4 pl-12 bg-slate-50/50 border-2 rounded-2xl outline-none focus:bg-white transition-all ${errors.shopName ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} 
                          onChange={handleChange} 
                        />
                      </div>
                      {errors.shopName && <p className="text-xs text-red-500 font-medium ml-1">{errors.shopName}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 slide-in-left" style={{ animationDelay: "0.2s" }}>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Owner Name</label>
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                          <input 
                            name="ownerName" 
                            value={formData.ownerName} 
                            onBlur={handleBlur} 
                            placeholder="Your Name" 
                            className={`relative w-full p-4 pl-12 bg-slate-50/50 border-2 rounded-2xl outline-none focus:bg-white transition-all ${errors.ownerName ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} 
                            onChange={handleChange} 
                          />
                        </div>
                        {errors.ownerName && <p className="text-xs text-red-500 font-medium ml-1">{errors.ownerName}</p>}
                      </div>
                      
                      <div className="space-y-2 slide-in-right" style={{ animationDelay: "0.2s" }}>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Subdomain</label>
                        <div className="relative group">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                          <input 
                            name="subdomain" 
                            value={formData.subdomain} 
                            onBlur={handleBlur} 
                            placeholder="shop-name" 
                            className={`relative w-full p-4 pl-12 bg-slate-50/50 border-2 rounded-2xl outline-none focus:bg-white transition-all ${errors.subdomain ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} 
                            onChange={handleChange} 
                          />
                        </div>
                        {subdomainStatus === "checking" && <p className="text-xs text-blue-500 ml-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking...</p>}
                        {subdomainStatus === "taken" && <p className="text-xs text-red-500 ml-1">❌ Already taken</p>}
                        {subdomainStatus === "available" && <p className="text-xs text-green-500 ml-1">✓ Available</p>}
                        {subdomainStatus === "invalid" && <p className="text-xs text-red-500 ml-1">Invalid characters</p>}
                      </div>
                    </div>
                  </>
                )}

                {/* STAFF & CUSTOMER FIELDS */}
                {selectedRole !== "owner" && (
                  <div className="space-y-2 slide-in-left" style={{ animationDelay: "0.1s" }}>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        name="name" 
                        value={formData.name} 
                        onBlur={handleBlur} 
                        placeholder="Your Name" 
                        className={`relative w-full p-4 pl-12 bg-slate-50/50 border-2 rounded-2xl outline-none focus:bg-white transition-all ${errors.name ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} 
                        onChange={handleChange} 
                      />
                    </div>
                    {errors.name && <p className="text-xs text-red-500 font-medium ml-1">{errors.name}</p>}
                  </div>
                )}

                {/* EMAIL & PASSWORD */}
                <div className="space-y-2 slide-in-left" style={{ animationDelay: "0.3s" }}>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      name="email" 
                      value={formData.email} 
                      type="email" 
                      onBlur={handleBlur} 
                      placeholder="email@example.com" 
                      className={`relative w-full p-4 pl-12 bg-slate-50/50 border-2 rounded-2xl outline-none focus:bg-white transition-all ${errors.email ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} 
                      onChange={handleChange} 
                    />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 font-medium ml-1">{errors.email}</p>}
                </div>

                <div className="space-y-2 slide-in-left" style={{ animationDelay: "0.4s" }}>
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      name="password" 
                      value={formData.password} 
                      type={showPassword ? "text" : "password"} 
                      onBlur={handleBlur} 
                      placeholder="••••••••" 
                      className={`relative w-full p-4 pl-12 pr-12 bg-slate-50/50 border-2 rounded-2xl outline-none focus:bg-white transition-all ${errors.password ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} 
                      onChange={handleChange} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  
                  {formData.password.length > 0 && (
                    <div className="mt-2 pl-1">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map(level => (
                          <div 
                            key={level} 
                            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                              passStrength >= level 
                                ? passStrength < 3 
                                  ? 'bg-amber-400' 
                                  : 'bg-green-500' 
                                : 'bg-slate-200'
                            }`} 
                          />
                        ))}
                      </div>
                      {errors.password ? (
                        <p className="text-xs text-red-500 font-semibold">{errors.password}</p>
                      ) : (
                        <p className={`text-xs font-semibold ${passStrength === 4 ? 'text-green-600' : 'text-slate-400'}`}>
                          {passStrength === 4 ? '✓ Strong password!' : 'Keep typing...'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* STAFF ONLY: SHOP ID */}
                {["manager", "frontdesk", "technician", "driver"].includes(selectedRole) && (
                  <div className="space-y-2 pt-2 slide-in-left" style={{ animationDelay: "0.5s" }}>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Shop ID</label>
                    <div className="relative group">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        name="tenantId" 
                        value={formData.tenantId} 
                        onBlur={handleBlur} 
                        placeholder="Paste your Shop ID here" 
                        className={`relative w-full p-4 pl-12 bg-slate-50/50 border-2 rounded-2xl outline-none focus:bg-white transition-all font-mono text-sm ${errors.tenantId ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} 
                        onChange={handleChange} 
                      />
                    </div>
                    {errors.tenantId ? (
                      <p className="text-xs text-red-500 font-medium ml-1">{errors.tenantId}</p>
                    ) : (
                      <p className="text-xs text-slate-400 font-medium ml-1">Ask your shop owner for your Shop ID</p>
                    )}
                  </div>
                )}

                {/* CUSTOMER ONLY: PHONE */}
                {selectedRole === "customer" && (
                  <div className="space-y-2 slide-in-left" style={{ animationDelay: "0.5s" }}>
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Phone Number</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                      <input 
                        name="phone" 
                        value={formData.phone} 
                        onBlur={handleBlur} 
                        placeholder="+1 (555) 000-0000" 
                        className={`relative w-full p-4 pl-12 bg-slate-50/50 border-2 rounded-2xl outline-none focus:bg-white transition-all ${errors.phone ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`} 
                        onChange={handleChange} 
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-red-500 font-medium ml-1">{errors.phone}</p>}
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <div className="flex gap-3 pt-4 slide-in-bottom" style={{ animationDelay: "0.6s" }}>
                  <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    className="flex-1 bg-slate-100 text-slate-700 font-bold p-4 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" /> Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={isLoading || subdomainStatus === "taken" || subdomainStatus === "invalid" || subdomainStatus === "checking"}
                    className="flex-[2] bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold p-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /><span>Creating...</span></>
                    ) : (
                      <><span>Create Account</span><ArrowRight className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

// Made with Bob
