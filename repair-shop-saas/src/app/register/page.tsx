"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Store, User, Globe, Mail, Lock, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    shopName: "",
    ownerName: "",
    subdomain: "",
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      await axios.post("/api/auth/register", formData);
      // after rejistration  go to login page 
      router.push("/login");
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 text-black font-sans">
      <div className="bg-white p-8 rounded-[32px] shadow-2xl shadow-blue-100/50 w-full max-w-lg border border-slate-100">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Register Your Repair Shop</h2>
          <p className="text-slate-500 mt-2 font-medium">Create your professional management account</p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 border border-red-100 text-center font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Shop Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Shop Name</label>
            <div className="relative group">
              <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-600" />
              <input name="shopName" placeholder="e.g. Abid Repair Shop" className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Owner Name */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Owner Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input name="ownerName" placeholder="Your Name" className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" onChange={handleChange} required />
              </div>
            </div>
            {/* Subdomain */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Subdomain</label>
              <div className="relative group">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input name="subdomain" placeholder="shop-name" className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" onChange={handleChange} required />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input name="email" type="email" placeholder="admin@business.com" className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" onChange={handleChange} required />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input name="password" type="password" placeholder="••••••••" className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" onChange={handleChange} required />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold p-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-4">
            {isLoading ? <Loader2 className="animate-spin" /> : "Register Shop"}
          </button>
        </form>

        <div className="mt-8 text-center text-[13px] text-slate-400 font-semibold">
          ALREADY HAVE AN ACCOUNT?{" "}
          <a href="/login" className="text-blue-600 font-black hover:underline">LOG IN HERE</a>
        </div>
      </div>
    </div>
  );
}