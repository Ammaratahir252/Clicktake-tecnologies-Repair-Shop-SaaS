"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Settings, Globe, Bell, Shield, CreditCard, Mail,
  Save, Loader2, CheckCircle2, AlertTriangle,
  ChevronDown, Lock, Clock, Key, RefreshCw,
} from "lucide-react";

const TABS = [
  { key: "general",       label: "General",       icon: Globe     },
  { key: "security",      label: "Security",       icon: Shield    },
  { key: "notifications", label: "Notifications",  icon: Bell      },
  { key: "billing",       label: "Billing",        icon: CreditCard },
  { key: "email",         label: "Email / SMTP",   icon: Mail      },
];

function Toggle({ checked, onChange, danger }: { checked: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 ${
        checked
          ? danger ? "bg-destructive focus:ring-destructive/30" : "bg-primary focus:ring-primary/30"
          : "bg-muted-foreground/25 focus:ring-muted-foreground/20"
      }`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${checked ? "left-6" : "left-0.5"}`} />
    </button>
  );
}

function InputField({ label, value, onChange, placeholder, icon: Icon, type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; icon?: any; type?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />}
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full bg-background border border-border rounded-xl py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all ${Icon ? "pl-10 pr-4" : "px-4"}`}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; icon?: any;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />}
        <select
          value={value} onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none bg-background border border-border rounded-xl py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all pr-8 ${Icon ? "pl-10" : "pl-4"}`}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function ToggleRow({ label, sub, checked, onChange, danger }: {
  label: string; sub: string; checked: boolean; onChange: (v: boolean) => void; danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3.5 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} danger={danger} />
    </div>
  );
}

function SaveButton({ loading, saved, onClick }: { loading: boolean; saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick} disabled={loading || saved}
      className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 shadow-sm ${
        saved ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {saved ? "Saved!" : loading ? "Saving…" : "Save Changes"}
    </button>
  );
}

function ComingSoonPanel({ section }: { section: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-bold text-foreground capitalize">{section} Settings</h2>
      </div>
      <div className="p-6">
        <div className="bg-muted/60 border border-border rounded-xl p-6 text-center space-y-2">
          <RefreshCw className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-muted-foreground">
            Advanced {section} configuration coming in the next release.
          </p>
          <p className="text-xs text-muted-foreground/70">Contact your system administrator for manual setup.</p>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminSettingsPage() {
  return (
    <DashboardShell requiredRole="super_admin">
      {(user) => <SettingsContent user={user} />}
    </DashboardShell>
  );
}

function SettingsContent({ user }: { user: any }) {
  const [tab, setTab] = useState("general");
  const [loadingInit, setLoadingInit] = useState(true);
  const [initError,   setInitError]   = useState("");

  // General
  const [platformName,   setPlatformName]   = useState("RepairShop SaaS");
  const [domain,         setDomain]         = useState("repairshop.app");
  const [supportEmail,   setSupportEmail]   = useState("support@repairshop.app");
  const [timezone,       setTimezone]       = useState("Asia/Karachi");
  const [currency,       setCurrency]       = useState("PKR");
  const [maintenanceMode, setMaintenance]   = useState(false);
  const [savingG, setSavingG] = useState(false);
  const [savedG,  setSavedG]  = useState(false);

  // Security
  const [twoFactor,         setTwoFactor]         = useState(false);
  const [sessionTimeout,    setSessionTimeout]    = useState("60");
  const [passwordMinLength, setPasswordMinLength] = useState("8");
  const [ipWhitelist,       setIpWhitelist]       = useState("");
  const [savingS, setSavingS] = useState(false);
  const [savedS,  setSavedS]  = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState({
    newTenant:        true,
    ticketEscalation: true,
    dailyReport:      false,
    paymentFailed:    true,
    systemAlert:      true,
  });
  const [savingN, setSavingN] = useState(false);
  const [savedN,  setSavedN]  = useState(false);

  // Load settings on mount
  useEffect(() => {
    api.get("/api/admin/settings")
      .then((res) => {
        const s = res.data?.data;
        if (!s) return;
        setPlatformName(s.platformName   ?? "RepairShop SaaS");
        setDomain(s.domain               ?? "repairshop.app");
        setSupportEmail(s.supportEmail   ?? "support@repairshop.app");
        setTimezone(s.timezone           ?? "Asia/Karachi");
        setCurrency(s.currency           ?? "PKR");
        setMaintenance(s.maintenanceMode ?? false);
        setTwoFactor(s.twoFactor         ?? false);
        setSessionTimeout(String(s.sessionTimeout    ?? 60));
        setPasswordMinLength(String(s.passwordMinLength ?? 8));
        setIpWhitelist(s.ipWhitelist     ?? "");
        if (s.notifs) setNotifs(s.notifs);
      })
      .catch((err) => {
        setInitError(err.response?.data?.message || "Could not load settings.");
      })
      .finally(() => setLoadingInit(false));
  }, []);

  const saveSection = async (
    payload: Record<string, any>,
    setSaving: (v: boolean) => void,
    setSaved: (v: boolean) => void
  ) => {
    setSaving(true);
    try {
      await api.patch("/api/admin/settings", payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently fail — could show toast here
    } finally {
      setSaving(false);
    }
  };

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-8 h-8 mr-3" />
        <span className="font-medium">Loading settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="bg-violet-600 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-600/20">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Platform Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure global platform behaviour and defaults</p>
        </div>
      </div>

      {initError && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{initError}</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tab Nav */}
        <nav className="flex lg:flex-col gap-1 lg:w-52 shrink-0 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                tab === key
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {/* General */}
          {tab === "general" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-bold text-foreground">General Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Core platform configuration</p>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <InputField label="Platform Name" icon={Globe} value={platformName} onChange={setPlatformName} placeholder="RepairShop SaaS" />
                  </div>
                  <InputField label="Base Domain" icon={Globe} value={domain} onChange={setDomain} placeholder="repairshop.app" />
                  <InputField label="Support Email" icon={Mail} value={supportEmail} onChange={setSupportEmail} placeholder="support@..." />
                  <SelectField
                    label="Timezone" icon={Clock} value={timezone} onChange={setTimezone}
                    options={[
                      { value: "Asia/Karachi", label: "Asia/Karachi (PKT)" },
                      { value: "UTC",          label: "UTC"                  },
                      { value: "Asia/Dubai",   label: "Asia/Dubai (GST)"    },
                      { value: "Europe/London", label: "Europe/London (GMT)" },
                    ]}
                  />
                  <SelectField
                    label="Currency" value={currency} onChange={setCurrency}
                    options={[
                      { value: "PKR", label: "PKR — Pakistani Rupee" },
                      { value: "USD", label: "USD — US Dollar"       },
                      { value: "AED", label: "AED — UAE Dirham"      },
                    ]}
                  />
                </div>

                <div className={`flex items-center justify-between gap-6 rounded-xl px-4 py-4 border transition-all ${maintenanceMode ? "bg-destructive/5 border-destructive/20" : "bg-muted/40 border-border"}`}>
                  <div>
                    <p className="text-sm font-bold text-foreground">Maintenance Mode</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Blocks all tenant access — only super admins can log in</p>
                  </div>
                  <Toggle checked={maintenanceMode} onChange={setMaintenance} danger />
                </div>
                {maintenanceMode && (
                  <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-xs font-semibold text-destructive">Maintenance mode is ON — all tenants are currently blocked.</p>
                  </div>
                )}
                <div className="pt-1 flex justify-end">
                  <SaveButton
                    loading={savingG} saved={savedG}
                    onClick={() => saveSection(
                      { platformName, domain, supportEmail, timezone, currency, maintenanceMode },
                      setSavingG, setSavedG
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {tab === "security" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-bold text-foreground">Security Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Authentication and access control</p>
              </div>
              <div className="p-6 space-y-5">
                <ToggleRow
                  label="Require 2FA for Admins"
                  sub="Force two-factor authentication on all admin accounts"
                  checked={twoFactor} onChange={setTwoFactor}
                />
                <div className="grid sm:grid-cols-2 gap-5">
                  <InputField
                    label="Session Timeout (minutes)" icon={Clock} type="number"
                    value={sessionTimeout} onChange={setSessionTimeout}
                    placeholder="60" hint="Min: 15 · Max: 480"
                  />
                  <InputField
                    label="Min Password Length" icon={Key} type="number"
                    value={passwordMinLength} onChange={setPasswordMinLength}
                    placeholder="8" hint="Min: 6 · Max: 32"
                  />
                  <div className="sm:col-span-2">
                    <InputField
                      label="IP Whitelist (comma-separated)" icon={Lock}
                      value={ipWhitelist} onChange={setIpWhitelist}
                      placeholder="e.g. 192.168.1.0/24, 10.0.0.1"
                      hint="Leave empty to allow all IPs"
                    />
                  </div>
                </div>
                <div className="pt-1 flex justify-end">
                  <SaveButton
                    loading={savingS} saved={savedS}
                    onClick={() => saveSection(
                      { twoFactor, sessionTimeout: Number(sessionTimeout), passwordMinLength: Number(passwordMinLength), ipWhitelist },
                      setSavingS, setSavedS
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {tab === "notifications" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-bold text-foreground">Notification Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Choose when you want platform alerts</p>
              </div>
              <div className="px-6 py-2">
                {[
                  { key: "newTenant",        label: "New Tenant Registered",  sub: "Alert when a new shop signs up on the platform"       },
                  { key: "ticketEscalation", label: "Ticket Escalation",      sub: "Alert when a ticket is overdue or manually escalated" },
                  { key: "paymentFailed",    label: "Payment Failed",         sub: "Alert when a tenant subscription payment fails"       },
                  { key: "dailyReport",      label: "Daily Summary Report",   sub: "Receive a daily platform summary email each morning"  },
                  { key: "systemAlert",      label: "System / Infra Alerts",  sub: "Critical alerts for server errors or downtime"        },
                ].map(({ key, label, sub }) => (
                  <ToggleRow
                    key={key} label={label} sub={sub}
                    checked={(notifs as any)[key]}
                    onChange={(v) => setNotifs((p) => ({ ...p, [key]: v }))}
                  />
                ))}
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end">
                <SaveButton
                  loading={savingN} saved={savedN}
                  onClick={() => saveSection({ notifs }, setSavingN, setSavedN)}
                />
              </div>
            </div>
          )}

          {tab === "billing" && <ComingSoonPanel section="billing"      />}
          {tab === "email"   && <ComingSoonPanel section="email / SMTP" />}
        </div>
      </div>
    </div>
  );
}
