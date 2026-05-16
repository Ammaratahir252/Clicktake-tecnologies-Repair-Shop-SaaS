"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react";

interface TicketFormProps {
  rolePath: string; // e.g. "/dashboard/frontdesk/tickets"
}

export default function TicketForm({ rolePath }: TicketFormProps) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    deviceBrand: "",
    deviceModel: "",
    issue: "",
    customerName: "",
    customerPhone: "",
    estimateAmount: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear field error when user types
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => ({ ...prev, [e.target.name]: "" }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.deviceBrand.trim()) errors.deviceBrand = "Device brand is required";
    if (!formData.deviceModel.trim()) errors.deviceModel = "Device model is required";
    if (formData.issue.trim().length < 10) errors.issue = "Issue description must be at least 10 characters";
    if (!formData.customerName.trim()) errors.customerName = "Customer name is required";
    if (!formData.customerPhone.trim()) errors.customerPhone = "Customer phone is required";
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: any = {
        deviceBrand: formData.deviceBrand,
        deviceModel: formData.deviceModel,
        issue: formData.issue,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
      };

      if (formData.estimateAmount && !isNaN(Number(formData.estimateAmount))) {
        payload.estimateAmount = Number(formData.estimateAmount);
      }

      await api.post("/api/tickets", payload);
      router.push(rolePath);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create ticket");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push(rolePath)}
          className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-slate-900">Create New Ticket</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="font-semibold text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
        
        {/* Customer Info */}
        <div>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Customer Name *</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="Ali Khan"
                className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 focus:bg-white transition-colors focus:outline-none focus:ring-2 ${
                  fieldErrors.customerName ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.customerName && <p className="text-red-500 text-xs font-bold mt-1.5">{fieldErrors.customerName}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number *</label>
              <input
                type="text"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="0300-1234567"
                className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 focus:bg-white transition-colors focus:outline-none focus:ring-2 ${
                  fieldErrors.customerPhone ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.customerPhone && <p className="text-red-500 text-xs font-bold mt-1.5">{fieldErrors.customerPhone}</p>}
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Device Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Device Brand *</label>
              <input
                type="text"
                name="deviceBrand"
                value={formData.deviceBrand}
                onChange={handleChange}
                placeholder="Apple, Samsung, etc."
                className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 focus:bg-white transition-colors focus:outline-none focus:ring-2 ${
                  fieldErrors.deviceBrand ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.deviceBrand && <p className="text-red-500 text-xs font-bold mt-1.5">{fieldErrors.deviceBrand}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Device Model *</label>
              <input
                type="text"
                name="deviceModel"
                value={formData.deviceModel}
                onChange={handleChange}
                placeholder="iPhone 13"
                className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 focus:bg-white transition-colors focus:outline-none focus:ring-2 ${
                  fieldErrors.deviceModel ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.deviceModel && <p className="text-red-500 text-xs font-bold mt-1.5">{fieldErrors.deviceModel}</p>}
            </div>
          </div>
        </div>

        {/* Issue Details */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Issue Details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Issue Description *</label>
              <textarea
                name="issue"
                value={formData.issue}
                onChange={handleChange}
                rows={4}
                placeholder="Describe the problem in detail (min 10 chars)..."
                className={`w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white transition-colors focus:outline-none focus:ring-2 resize-none ${
                  fieldErrors.issue ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.issue && <p className="text-red-500 text-xs font-bold mt-1.5">{fieldErrors.issue}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Initial Estimate Amount (PKR) <span className="text-slate-400 font-normal ml-1">(Optional)</span></label>
              <input
                type="number"
                name="estimateAmount"
                value={formData.estimateAmount}
                onChange={handleChange}
                min="0"
                placeholder="e.g. 5000"
                className="w-full md:w-1/2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white transition-colors focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center min-w-[160px] gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? "Creating..." : "Create Ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}
