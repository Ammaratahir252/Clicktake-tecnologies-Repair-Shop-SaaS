"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { ADMIN_SECTIONS, ADMIN_SECTION_LABELS } from "@/lib/adminSections";
import {
  Plus, X, Shield, CheckCircle, Loader2, AlertTriangle, Trash2, User, Mail,
} from "lucide-react";

interface SubAdmin {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  permissions?: string[];
}

/**
 * Sub Admin / Support Staff management — lets a super_admin create scoped
 * `admin` accounts and assign exactly which platform tools/sections each one
 * can see and use. Shared between the Users page and the Settings panel so
 * there's one implementation to keep in sync.
 */
export default function SubAdminManager({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [admins, setAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const notify = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(""), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(""), 4000); }
  };

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/users?role=admin&limit=200");
      setAdmins(res.data?.data ?? []);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to load sub admins.", true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const togglePermission = async (admin: SubAdmin, key: string) => {
    const current = admin.permissions ?? [];
    const next = current.includes(key) ? current.filter((p) => p !== key) : [...current, key];
    setActing(admin._id);
    try {
      const res = await api.patch(`/api/admin/users/${admin._id}`, { permissions: next });
      setAdmins((prev) => prev.map((a) => (a._id === admin._id ? res.data?.data : a)));
      notify(`Updated ${admin.name}'s tools. They must log in again for it to take effect.`);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to update permissions.", true);
    } finally {
      setActing(null);
    }
  };

  const toggleActive = async (admin: SubAdmin) => {
    setActing(admin._id);
    try {
      const res = await api.patch(`/api/admin/users/${admin._id}`, { isActive: !admin.isActive });
      setAdmins((prev) => prev.map((a) => (a._id === admin._id ? res.data?.data : a)));
      notify(admin.isActive ? `${admin.name} deactivated.` : `${admin.name} activated.`);
    } catch (err: any) {
      notify(err.response?.data?.message || "Action failed.", true);
    } finally {
      setActing(null);
    }
  };

  const deleteAdmin = async (admin: SubAdmin) => {
    if (!window.confirm(`Permanently delete sub admin "${admin.name}"? This cannot be undone.`)) return;
    setActing(admin._id);
    try {
      await api.delete(`/api/admin/users/${admin._id}`);
      setAdmins((prev) => prev.filter((a) => a._id !== admin._id));
      notify(`${admin.name} permanently deleted.`);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to delete.", true);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-foreground">Sub Admins & Support Staff</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Create scoped admin accounts and assign exactly which tools each one can see and use</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setAddOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs uppercase tracking-wider hover:opacity-90 transition-all shrink-0">
            <Plus size={14} />
            Add Sub Admin
          </button>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
          <AlertTriangle size={13} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive">{error}</p>
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 dark:bg-emerald-900/20 dark:border-emerald-800">
          <CheckCircle size={13} className="text-emerald-600 shrink-0" />
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{success}</p>
        </div>
      )}

      <div className="p-6 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sub admins yet — click Add Sub Admin to create one.</p>
        ) : (
          admins.map((admin) => (
            <div key={admin._id} className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <User size={15} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{admin.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail size={10} />{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${admin.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                    {admin.isActive ? "active" : "inactive"}
                  </span>
                  {isSuperAdmin && (
                    <>
                      <button onClick={() => toggleActive(admin)} disabled={acting === admin._id} className="text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-50">
                        {admin.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => deleteAdmin(admin)} disabled={acting === admin._id} className="text-destructive hover:opacity-80 disabled:opacity-50">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {ADMIN_SECTIONS.map((key) => {
                  const granted = (admin.permissions ?? []).includes(key);
                  return (
                    <button
                      key={key}
                      disabled={!isSuperAdmin || acting === admin._id}
                      onClick={() => togglePermission(admin, key)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 ${
                        granted ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {granted ? <CheckCircle size={12} /> : <Shield size={12} />}
                      {ADMIN_SECTION_LABELS[key]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {addOpen && (
        <AddSubAdminModal
          onClose={() => setAddOpen(false)}
          onCreated={(a) => { setAdmins((prev) => [a, ...prev]); setAddOpen(false); notify(`Sub admin account created for ${a.name}.`); }}
        />
      )}
    </div>
  );
}

function AddSubAdminModal({ onClose, onCreated }: { onClose: () => void; onCreated: (a: SubAdmin) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (key: string) =>
    setPermissions((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));

  const submit = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Name, email, and an 8+ character password are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/api/admin/users", { name, email, password, permissions });
      onCreated(res.data?.data as SubAdmin);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create sub admin account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-black text-foreground">Add Sub Admin / Support Staff</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Pick exactly which tools this account can see and use</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              <AlertTriangle size={13} className="text-destructive shrink-0" />
              <p className="text-xs font-semibold text-destructive">{error}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password (8+ chars)" type="password" className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Tools this account can see &amp; use</p>
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_SECTIONS.map((key) => (
                <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold cursor-pointer transition-all ${permissions.includes(key) ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/40 border-border text-muted-foreground"}`}>
                  <input type="checkbox" className="hidden" checked={permissions.includes(key)} onChange={() => toggle(key)} />
                  {permissions.includes(key) ? <CheckCircle size={14} /> : <Shield size={14} />}
                  {ADMIN_SECTION_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-all">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />}
            Create Sub Admin
          </button>
        </div>
      </div>
    </div>
  );
}
