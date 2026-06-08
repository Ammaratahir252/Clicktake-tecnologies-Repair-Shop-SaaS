"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Settings, Globe, Bell, Shield, CreditCard, Mail, Palette, Save, Loader2, CheckCircle } from "lucide-react";

const SECTIONS = [
  { key: "general",   label: "General",      icon: Settings },
  { key: "billing",   label: "Billing",      icon: CreditCard },
  { key: "email",     label: "Email",        icon: Mail },
  { key: "security",  label: "Security",     icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell },
];

export default function SuperAdminSettingsPage() {
  const [section, setSection] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // General state
  const [platformName, setPlatformName] = useState("RepairShop SaaS");
  const [domain, setDomain] = useState("repairshop.app");
  const [supportEmail, setSupportEmail] = useState("support@repairshop.app");
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [currency, setCurrency] = useState("PKR");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Security state
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("60");
  const [passwordMinLength, setPasswordMinLength] = useState("8");

  // Notification state
  const [emailOnNewTenant, setEmailOnNewTenant] = useState(true);
  const [emailOnTicketEscalation, setEmailOnTicketEscalation] = useState(true);
  const [emailDailyReport, setEmailDailyReport] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 1000);
  };

  return (
    <DashboardShell requiredRole="super_admin">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Platform Settings</h1>
              <p className="text-muted-foreground font-medium mt-0.5">Configure global platform behaviour</p>
            </div>
            {saved && (
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <CheckCircle size={16} />
                Saved!
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Nav */}
            <div className="space-y-1">
              {SECTIONS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSection(key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    section === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Settings Panel */}
            <div className="lg:col-span-3 space-y-4">
              {section === "general" && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                  <h2 className="font-black text-foreground text-lg">General Settings</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Platform Name</label>
                      <input value={platformName} onChange={(e) => setPlatformName(e.target.value)}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Base Domain</label>
                      <input value={domain} onChange={(e) => setDomain(e.target.value)}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Support Email</label>
                      <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Timezone</label>
                        <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                          <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                          <option value="UTC">UTC</option>
                          <option value="Asia/Dubai">Asia/Dubai</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Currency</label>
                        <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm">
                          <option value="PKR">PKR — Pakistani Rupee</option>
                          <option value="USD">USD — US Dollar</option>
                          <option value="AED">AED — UAE Dirham</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                      <div>
                        <p className="font-bold text-sm text-foreground">Maintenance Mode</p>
                        <p className="text-xs text-muted-foreground">Blocks all tenant access except super admin</p>
                      </div>
                      <button
                        onClick={() => setMaintenanceMode(!maintenanceMode)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${maintenanceMode ? "bg-red-500" : "bg-muted-foreground/30"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${maintenanceMode ? "left-6" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {section === "security" && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                  <h2 className="font-black text-foreground text-lg">Security Settings</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                      <div>
                        <p className="font-bold text-sm text-foreground">Require 2FA for Admins</p>
                        <p className="text-xs text-muted-foreground">Force two-factor auth on all admin accounts</p>
                      </div>
                      <button
                        onClick={() => setTwoFactor(!twoFactor)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${twoFactor ? "bg-primary" : "bg-muted-foreground/30"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${twoFactor ? "left-6" : "left-0.5"}`} />
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Session Timeout (minutes)</label>
                      <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} min="15" max="480"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Minimum Password Length</label>
                      <input type="number" value={passwordMinLength} onChange={(e) => setPasswordMinLength(e.target.value)} min="6" max="32"
                        className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {section === "notifications" && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                  <h2 className="font-black text-foreground text-lg">Notification Settings</h2>
                  <div className="space-y-3">
                    {[
                      { label: "New Tenant Registered", desc: "Get notified when a new shop signs up", value: emailOnNewTenant, set: setEmailOnNewTenant },
                      { label: "Ticket Escalation", desc: "Alert when a ticket is overdue or escalated", value: emailOnTicketEscalation, set: setEmailOnTicketEscalation },
                      { label: "Daily Summary Report", desc: "Receive a daily platform report email", value: emailDailyReport, set: setEmailDailyReport },
                    ].map(({ label, desc, value, set }) => (
                      <div key={label} className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                        <div>
                          <p className="font-bold text-sm text-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <button
                          onClick={() => set(!value)}
                          className={`relative w-12 h-6 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? "left-6" : "left-0.5"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(section === "billing" || section === "email") && (
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <h2 className="font-black text-foreground text-lg capitalize">{section} Settings</h2>
                  <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground">
                    Advanced {section} configuration coming in the next release. Contact your system administrator for manual setup.
                  </div>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
