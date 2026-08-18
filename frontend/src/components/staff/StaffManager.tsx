"use client";

import { useState, useEffect } from "react";
import { ROLE_META } from "@/lib/rbac";
import { Users, Plus, Trash2, Pencil, Mail, Lock, User as UserIcon, ShieldCheck, Loader2, X } from "lucide-react";
import api from "@/lib/api";

interface StaffUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}

const EMPTY_ADD_FORM = { name: "", email: "", password: "", role: "technician" };

/** Shared staff-account CRUD UI — used by both the owner's Staff Management page
 * (always full access) and the manager's Team page (access gated behind the
 * owner-controlled `editTeam` toggle, see frontend/src/lib/managerPermissions.ts). */
export default function StaffManager({
  canAdd,
  canEdit,
  canDelete,
  title = "Staff Management",
  subtitle = "Manage your team members and their access levels.",
}: {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  title?: string;
  subtitle?: string;
}) {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_ADD_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "", isActive: true });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await api.get("/api/users");
      setUsers(res.data?.data ?? []);
    } catch {
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAddError("");
    try {
      await api.post("/api/users", addForm);
      await fetchUsers();
      setIsAddOpen(false);
      setAddForm(EMPTY_ADD_FORM);
    } catch (error: any) {
      setAddError(error.response?.data?.message || "Failed to add staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (u: StaffUser) => {
    setEditing(u);
    setEditForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive ?? true });
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const id = editing.id || editing._id;
    setIsSaving(true);
    setEditError("");
    try {
      await api.patch(`/api/users/${id}`, editForm);
      await fetchUsers();
      setEditing(null);
    } catch (error: any) {
      setEditError(error.response?.data?.message || "Failed to update staff member.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this staff member? This cannot be undone.")) return;
    try {
      await api.delete(`/api/users/${userId}`);
      await fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to remove user.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Users className="text-primary" />
            {title}
          </h2>
          <p className="text-muted-foreground font-medium mt-1">{subtitle}</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Add Staff
          </button>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center text-muted-foreground">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground font-medium">No staff members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  {(canEdit || canDelete) && (
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const meta = ROLE_META[u.role] || ROLE_META["technician"];
                  const isOwner = u.role === "owner";
                  const id = (u.id || u._id) as string;

                  return (
                    <tr key={id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-card-foreground">{u.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${meta.bgColor} ${meta.color}`}>
                          <ShieldCheck size={14} />
                          {meta.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-xs font-bold ${u.isActive === false ? "text-red-500" : "text-emerald-500"}`}>
                          {u.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && !isOwner && (
                              <button
                                onClick={() => openEdit(u)}
                                className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-2 rounded-xl transition-colors"
                                title="Edit User"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {canDelete && !isOwner && (
                              <button
                                onClick={() => handleRemove(id)}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-2 rounded-xl transition-colors"
                                title="Remove User"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-card-foreground">Add Staff Member</h3>
                <p className="text-sm font-medium text-muted-foreground mt-1">They'll set their own password on first login.</p>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {addError && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-sm font-semibold border border-destructive/20">
                  {addError}
                </div>
              )}

              <form id="add-staff-form" onSubmit={handleAddStaff} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Full Name</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                      value={addForm.name}
                      onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full p-3 pl-12 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                      type="email"
                      value={addForm.email}
                      onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full p-3 pl-12 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Temporary Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input
                      type="password"
                      value={addForm.password}
                      onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                      minLength={8}
                      className="w-full p-3 pl-12 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Role</label>
                  <div className="relative group">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <select
                      value={addForm.role}
                      onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                      className="w-full p-3 pl-12 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary appearance-none font-medium text-foreground"
                    >
                      <option value="manager">Manager</option>
                      <option value="frontdesk">Front Desk</option>
                      <option value="technician">Technician</option>
                      <option value="driver">Driver</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 bg-muted border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button
                form="add-staff-form"
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden border border-border">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-black text-card-foreground">Edit Staff Member</h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editError && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-xl text-sm font-semibold border border-destructive/20">
                  {editError}
                </div>
              )}

              <form id="edit-staff-form" onSubmit={handleSaveEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Full Name</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-foreground"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase ml-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    className="w-full p-3 bg-muted border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary appearance-none font-medium text-foreground"
                  >
                    <option value="manager">Manager</option>
                    <option value="frontdesk">Front Desk</option>
                    <option value="technician">Technician</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-4 h-4 accent-primary"
                  />
                  Account active
                </label>
              </form>
            </div>

            <div className="p-6 bg-muted border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground transition-colors"
                type="button"
              >
                Cancel
              </button>
              <button
                form="edit-staff-form"
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                {isSaving && <Loader2 size={16} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
