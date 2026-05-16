"use client";

import { useState, useEffect } from "react";
import DashboardShell, { DashboardUser } from "@/components/DashboardShell";
import { ROLE_META } from "@/lib/rbac";
import { Users, Plus, Trash2, Mail, Lock, User as UserIcon, ShieldCheck, Loader2 } from "lucide-react";
import axios from "axios";

export default function OwnerUsersPage() {
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "technician"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get("/api/users");
      // Assuming API returns { data: users }
      setUsers(res.data.data || res.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) throw new Error("Not logged in");
      const currentUser = JSON.parse(userStr);
      
      const payload = { ...formData, tenantId: currentUser.tenantId };
      await axios.post("/api/users", payload);
      
      await fetchUsers();
      setIsModalOpen(false);
      setFormData({ name: "", email: "", password: "", role: "technician" });
    } catch (error: any) {
      setErrorMsg(error.response?.data?.message || "Failed to add staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;
    
    try {
      await axios.delete(`/api/users/${userId}`);
      await fetchUsers();
    } catch (error) {
      alert("Failed to remove user.");
    }
  };

  return (
    <DashboardShell requiredRole="owner">
      {() => (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Users className="text-blue-600" />
                Staff Management
              </h2>
              <p className="text-slate-500 font-medium mt-1">
                Manage your team members and their access levels.
              </p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus size={18} />
              Add Staff
            </button>
          </div>

          {/* User List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-12 flex justify-center text-slate-400">
                <Loader2 className="animate-spin w-8 h-8" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">
                No staff members found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const meta = ROLE_META[u.role] || ROLE_META["technician"];
                      const isOwner = u.role === "owner";
                      const id = u.id || u._id;

                      return (
                        <tr key={id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{u.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-500">{u.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${meta.bgColor} ${meta.color}`}>
                              <ShieldCheck size={14} />
                              {meta.label}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {!isOwner && (
                              <button 
                                onClick={() => handleRemove(id as string)}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors"
                                title="Remove User"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Staff Modal */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="text-xl font-black text-slate-900">Add Staff Member</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">They will receive access to your shop.</p>
                </div>

                <div className="p-6 space-y-4">
                  {errorMsg && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-semibold border border-red-100">
                      {errorMsg}
                    </div>
                  )}

                  <form id="add-staff-form" onSubmit={handleAddStaff} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Full Name</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="name" value={formData.name} onChange={handleChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Temporary Password</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input name="password" type="password" value={formData.password} onChange={handleChange} minLength={8} className="w-full p-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" required />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Role</label>
                      <div className="relative group">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <select name="role" value={formData.role} onChange={handleChange} className="w-full p-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium text-slate-700">
                          <option value="manager">Manager</option>
                          <option value="frontdesk">Front Desk</option>
                          <option value="technician">Technician</option>
                          <option value="driver">Driver</option>
                        </select>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button 
                    form="add-staff-form"
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
                  >
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Add Member
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
