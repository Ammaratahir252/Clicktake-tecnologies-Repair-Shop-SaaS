"use client";

import { useEffect, useState } from "react";
import AuthGuard from "../../components/AuthGuard"; 
import { removeToken } from "../../lib/auth.helper";
import { LogOut, Plus, ArrowRight, Settings, Wrench, Wallet, Clock } from "lucide-react";

export default function DashboardPage() {
  const [shopName, setShopName] = useState("Loading Dashboard...");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          setShopName(user.shopName || user.name || "Abid Repair Shop");
        } catch (error) {
          setShopName("Shop Management Portal"); 
        }
      }
    }
  }, []);

  const handleLogout = () => {
    removeToken(); 
    window.location.replace("/login"); 
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8 text-black font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* --- TOP NAVIGATION BAR --- */}
          <header className="bg-white rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center shadow-sm border border-slate-200/60">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{shopName}</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                Shop Management System
              </p>
            </div>

            <button 
              onClick={handleLogout} 
              className="mt-4 md:mt-0 flex items-center gap-2 bg-red-50 text-red-600 px-6 py-2.5 rounded-xl hover:bg-red-100 transition-all font-bold text-sm border border-red-100 shadow-sm shadow-red-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </header>

          {/* --- PRIMARY ACTION CARDS --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add New Customer Card */}
            <button className="relative overflow-hidden group bg-gradient-to-br from-blue-600 to-blue-700 p-10 rounded-[2.5rem] shadow-2xl shadow-blue-200 text-left transition-transform active:scale-[0.98]">
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-white mb-2">Add New Customer</h3>
                <p className="text-blue-100 font-medium opacity-90">Register a new client</p>
              </div>
              <ArrowRight className="absolute right-10 top-1/2 -translate-y-1/2 text-white/20 w-12 h-12 group-hover:translate-x-2 group-hover:text-white transition-all duration-300" />
              <div className="absolute -bottom-6 -left-6 bg-white/10 w-32 h-32 rounded-full blur-3xl group-hover:scale-150 transition-transform"></div>
            </button>

            {/* Create Repair Ticket Card */}
            <button className="relative overflow-hidden group bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200/60 text-left transition-transform active:scale-[0.98]">
              <div className="relative z-10">
                <h3 className="text-2xl font-black text-slate-900 mb-2">Create Repair Ticket</h3>
                <p className="text-slate-500 font-medium">Open a new service job</p>
              </div>
              <ArrowRight className="absolute right-10 top-1/2 -translate-y-1/2 text-blue-600/20 w-12 h-12 group-hover:translate-x-2 group-hover:text-blue-600 transition-all duration-300" />
            </button>
          </div>

          {/* --- STATS / METRICS TRACKER --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Active Repairs */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 border-b-4 border-b-blue-500">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Wrench size={14} className="text-blue-500" /> Active Repairs
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-slate-900 leading-none tracking-tighter">0</span>
              </div>
            </div>

            {/* Ready for Pickup */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 border-b-4 border-b-emerald-500">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Clock size={14} className="text-emerald-500" /> Ready for Pickup
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-slate-900 leading-none tracking-tighter">0</span>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 border-b-4 border-b-slate-800">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Wallet size={14} className="text-slate-600" /> Total Revenue
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-slate-400">Rs.</span>
                <span className="text-6xl font-black text-slate-900 leading-none tracking-tighter">0</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </AuthGuard>
  );
}