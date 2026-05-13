"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { setToken } from "../../lib/auth.helper"; 
import { Eye, EyeOff, Lock, Mail, LogIn, Loader2 } from "lucide-react"; 

/**
 * LOGIN COMPONENT
 * Provides secure access to the shop dashboard with a professional UI.
 * Includes password visibility toggle and real-time state management.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /**
   * AUTHENTICATION HANDLER
   * Sends credentials to the API and synchronizes the session.
   */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await axios.post("/api/auth/login", { email, password });
      const token = response.data.data?.token || response.data.token;
      const user = response.data.data?.user || response.data.user;

      if (token) {
        // Sync token across layers to prevent redirect loops
        setToken(token, user);
        // Refresh the app state by redirecting to dashboard
        window.location.replace("/dashboard");
      } else {
        setErrorMessage("Authentication failed: Access token not found.");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Invalid credentials. Please verify your details.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 text-black font-sans">
      <div className="bg-white p-10 rounded-[32px] shadow-2xl shadow-blue-100/50 w-full max-w-md border border-slate-100">
        
        {/* Branding & Header */}
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-200">
            <LogIn className="text-white w-7 h-7" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h2>
          <p className="text-slate-500 mt-2 font-medium">Sign in to manage your shop portal</p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm mb-6 border border-red-100 text-center font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Email Input Field */}
          <div className="group">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Business Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="email"
                placeholder="Enter business email"
                className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-black outline-none transition-all placeholder:text-slate-300"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Input Field with Eye Toggle */}
          <div className="group">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-widest">Access Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter secure password"
                className="w-full p-4 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-black outline-none transition-all placeholder:text-slate-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              
              {/* Eye Toggle Icon Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white font-bold p-4 rounded-2xl hover:bg-blue-600 disabled:bg-slate-300 transition-all shadow-xl shadow-slate-100 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              "Secure Login"
            )}
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="mt-10 text-center text-sm text-slate-400 font-semibold uppercase tracking-tighter">
          No account?{" "}
          <a href="/register" className="text-blue-600 font-bold hover:text-blue-800 transition-colors underline-offset-4 hover:underline">
            Register Business
          </a>
        </div>
      </div>
    </div>
  );
}