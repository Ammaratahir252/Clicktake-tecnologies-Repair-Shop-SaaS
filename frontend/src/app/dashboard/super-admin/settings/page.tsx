"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { usePlatformDateFormat } from "@/lib/clientLocale";
import SubAdminManager from "@/components/admin/SubAdminManager";
import {
  Settings, Globe, Bell, Shield, CreditCard, Mail,
  Save, Loader2, CheckCircle2, AlertTriangle,
  ChevronDown, Clock, Key, Cpu,
  AlertOctagon, CheckCircle, Calendar,
  Activity, XCircle, RefreshCw, ChevronRight,
  Flag, Palette, DatabaseBackup, Wrench,
  Download, Upload, Trash2, LogOut, Send, RotateCcw,
  HardDrive, Users, Megaphone, Building2,
} from "lucide-react";

const TABS = [
  { key: "general",       label: "General",       icon: Globe     },
  { key: "security",      label: "Security",       icon: Shield    },
  { key: "subadmins",     label: "Sub Admins",     icon: Users     },
  { key: "notifications", label: "Notifications",  icon: Bell      },
  { key: "billing",       label: "Billing",        icon: CreditCard },
  { key: "email",         label: "Email / SMTP",   icon: Mail      },
  { key: "flags",         label: "Feature Flags",  icon: Flag      },
  { key: "appearance",    label: "Appearance",     icon: Palette   },
  { key: "storage",       label: "Storage",        icon: HardDrive },
  { key: "backup",        label: "Backup & Recovery", icon: DatabaseBackup },
  { key: "advanced",      label: "Advanced",       icon: Wrench    },
  { key: "diagnostics",   label: "Diagnostics",    icon: Activity  },
];

const AI_PROVIDERS = [
  { value: "groq",   label: "Groq",    badge: "Default",  color: "emerald", description: "Llama 3.3 & Mixtral models via Groq Cloud. Fast inference, free tier available." },
  { value: "openai", label: "OpenAI",  badge: "GPT-4o",   color: "blue",    description: "GPT-4o and GPT-4 Turbo. Industry-leading quality for complex reasoning." },
  { value: "google", label: "Gemini",  badge: "Google",   color: "orange",  description: "Gemini 1.5 Pro/Flash & 2.0 Flash. Strong multimodal capabilities." },
  { value: "glm",    label: "GLM 5.2", badge: "Zhipu AI", color: "violet",  description: "ChatGLM 5.2 by Zhipu AI. Excellent Chinese & English language support." },
];

const AI_MODELS: Record<string, { value: string; label: string }[]> = {
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile (Recommended)" },
    { value: "llama-3.1-8b-instant",    label: "Llama 3.1 8B Instant (Fast)" },
    { value: "mixtral-8x7b-32768",      label: "Mixtral 8x7B" },
  ],
  openai: [
    { value: "gpt-4o",      label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini (Cost-efficient)" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  ],
  google: [
    { value: "gemini-1.5-pro",   label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Fast)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Latest)" },
  ],
  glm: [
    { value: "glm-4-flash", label: "GLM-4 Flash (GLM 5.2 Fast)" },
    { value: "glm-4-plus",  label: "GLM-4 Plus (GLM 5.2 Pro)" },
    { value: "glm-4-air",   label: "GLM-4 Air (GLM 5.2 Balanced)" },
    { value: "glm-z1-flash", label: "GLM-Z1 Flash (Reasoning)" },
  ],
};

const BADGE_COLORS: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  blue:    "bg-blue-500/10 text-blue-600 border-blue-500/20",
  orange:  "bg-orange-500/10 text-orange-600 border-orange-500/20",
  violet:  "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

const COLOR_PALETTE = [
  "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c",
  "#d97706", "#65a30d", "#16a34a", "#0d9488", "#0891b2",
  "#4f46e5", "#334155",
];

interface DiagnosticResult {
  id: string;
  category: string;
  label: string;
  status: "ok" | "warning" | "error";
  message: string;
  detail?: string;
  fix?: string;
}

const EMAIL_PROVIDERS_META = [
  { value: "resend",     label: "Resend",     badge: "Default", color: "emerald", description: "Fast, developer-friendly transactional email via Resend's API." },
  { value: "mailersend", label: "MailerSend", badge: "SMTP+API", color: "blue",    description: "MailerSend's transactional email API with built-in analytics." },
  { value: "mailtrap",   label: "Mailtrap",   badge: "SMTP+API", color: "orange",  description: "Mailtrap's live sending API for transactional email delivery." },
];

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

// Converts an ISO date string to the "YYYY-MM-DDTHH:mm" shape <input type="datetime-local"> expects.
function toDatetimeLocal(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

function ColorPaletteField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</label>
      <div className="flex items-center gap-2 flex-wrap">
        {COLOR_PALETTE.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-8 h-8 rounded-full border-2 transition-all ${value.toLowerCase() === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}
        <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-border">
          <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: value }} />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-24 px-2 py-1 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
    </div>
  );
}

function ImageUploadField({ label, url, onUploaded, uploadField }: {
  label: string; url: string; onUploaded: (url: string) => void; uploadField: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("field", uploadField);
      const res = await api.post("/api/admin/branding/upload", form, { headers: { "Content-Type": undefined } });
      onUploaded(res.data?.data?.url ?? "");
    } catch (err: any) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove the current ${label.toLowerCase()}?`)) return;
    setRemoving(true);
    setError("");
    try {
      await api.delete("/api/admin/branding/upload", { data: { field: uploadField } });
      onUploaded("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl border border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
          {url ? <img src={url} alt={label} className="w-full h-full object-contain" /> : <Upload size={16} className="text-muted-foreground" />}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || removing}
          className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 disabled:opacity-60 transition-all"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Uploading…" : "Upload from computer"}
        </button>
        {url && (
          <button
            onClick={handleRemove}
            disabled={uploading || removing}
            className="flex items-center gap-2 px-3 py-2.5 bg-destructive/10 text-destructive font-bold rounded-xl text-sm hover:bg-destructive/20 disabled:opacity-60 transition-all"
          >
            {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {removing ? "Removing…" : "Remove"}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
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

export default function SuperAdminSettingsPage() {
  return (
    <DashboardShell requiredRole={["super_admin", "admin"]}>
      {(user) => <SettingsContent user={user} />}
    </DashboardShell>
  );
}

function SettingsContent({ user }: { user: any }) {
  const isSuperAdmin = user.role === "super_admin";
  const [tab, setTab] = useState("general");
  const [loadingInit, setLoadingInit] = useState(true);
  const [initError,   setInitError]   = useState("");
  const [saveError,   setSaveError]   = useState("");
  const [saveOk,       setSaveOk]     = useState("");

  // General
  const [platformName,   setPlatformName]   = useState("RepairShop SaaS");
  const [domain,         setDomain]         = useState("repairshop.app");
  const [supportEmail,   setSupportEmail]   = useState("support@repairshop.app");
  const [timezone,       setTimezone]       = useState("Asia/Karachi");
  const [currency,       setCurrency]       = useState("PKR");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [dateFormat,     setDateFormat]     = useState("DD/MM/YYYY");
  const [timeFormat,     setTimeFormat]     = useState("24h");
  const [maintenanceMode, setMaintenance]   = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceScheduledAt, setMaintenanceScheduledAt] = useState("");
  const [maintenanceNoticeSentAt, setMaintenanceNoticeSentAt] = useState("");
  const [readOnlyMode,   setReadOnlyMode]   = useState(false);
  const [emergencyLockdown, setEmergencyLockdown] = useState(false);
  const [allowNewSignups, setAllowNewSignups] = useState(true);
  const [allowFreeTrial, setAllowFreeTrial] = useState(true);
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(true);
  const [inviteOnlyRegistration, setInviteOnlyRegistration] = useState(false);
  const [savingG, setSavingG] = useState(false);
  const [savedG,  setSavedG]  = useState(false);

  // Security
  const [twoFactor,         setTwoFactor]         = useState(false);
  const [twoFactorOwners,   setTwoFactorOwners]   = useState(false);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);
  const [sessionTimeout,    setSessionTimeout]    = useState("60");
  const [passwordMinLength, setPasswordMinLength] = useState("8");
  const [passwordExpiryDays, setPasswordExpiryDays] = useState("0");
  const [passwordHistoryCount, setPasswordHistoryCount] = useState("0");
  const [passwordRequireUppercase, setPasswordRequireUppercase] = useState(true);
  const [passwordRequireNumber, setPasswordRequireNumber] = useState(true);
  const [passwordRequireSymbol, setPasswordRequireSymbol] = useState(true);
  const [blockDisposableEmails, setBlockDisposableEmails] = useState(false);
  const [preventMultipleSessions, setPreventMultipleSessions] = useState(false);
  const [maxLoginAttempts,  setMaxLoginAttempts]  = useState("5");
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState("15");
  const [adminIpWhitelist, setAdminIpWhitelist] = useState("");
  const [myIp, setMyIp] = useState<string | null>(null);
  const fmtDate = usePlatformDateFormat();
  const [savingS, setSavingS] = useState(false);
  const [savedS,  setSavedS]  = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  // My Account — change own password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [changedPw,  setChangedPw]  = useState(false);
  const [pwError,    setPwError]    = useState("");

  // Notifications
  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    newTenant: true, ticketEscalation: true, dailyReport: false, paymentFailed: true, systemAlert: true,
    newAdminCreated: true, subscriptionExpiring: true, subscriptionCancelled: true, failedLoginAlert: false,
    storageLimitReached: true, highCpuUsage: true, highMemoryUsage: true, databaseBackupFailed: true,
  });
  const [savingN, setSavingN] = useState(false);
  const [savedN,  setSavedN]  = useState(false);

  // AI Models
  const [aiProvider, setAiProvider] = useState("groq");
  const [aiModel,    setAiModel]    = useState("llama-3.3-70b-versatile");
  const [aiDailyBudgetUsd, setAiDailyBudgetUsd] = useState("0");
  const [aiMonthlyBudgetUsd, setAiMonthlyBudgetUsd] = useState("0");
  const [aiDisabledPlans, setAiDisabledPlans] = useState<string[]>([]);
  const [aiRateLimitPerHourPerTenant, setAiRateLimitPerHourPerTenant] = useState("0");
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [savingAI,   setSavingAI]   = useState(false);
  const [savedAI,    setSavedAI]    = useState(false);

  // Billing
  const [defaultTrialDays, setDefaultTrialDays] = useState("14");
  const [gracePeriodDays, setGracePeriodDays] = useState("3");
  const [autoSuspendExpiredShops, setAutoSuspendExpiredShops] = useState(false);
  const [savingB, setSavingB] = useState(false);
  const [savedB, setSavedB] = useState(false);

  // Email providers
  const [activeEmailProvider, setActiveEmailProvider] = useState("resend");
  const [defaultSenderName, setDefaultSenderName] = useState("Dibnow Repair");
  const [defaultSenderEmail, setDefaultSenderEmail] = useState("noreply@dibnow.com");
  const [replyToEmail, setReplyToEmail] = useState("");
  const [emailRateLimitPerHour, setEmailRateLimitPerHour] = useState("0");
  const [disableMarketingEmails, setDisableMarketingEmails] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [savingE, setSavingE] = useState(false);
  const [savedE,  setSavedE]  = useState(false);

  // Feature flags
  const [flags, setFlags] = useState<Record<string, boolean>>({
    enableAI: true, enableTickets: true, enableInventory: true, enableReports: true,
    enableCustomerPortal: true, enableAnalytics: true,
  });
  const [savingF, setSavingF] = useState(false);
  const [savedF, setSavedF] = useState(false);

  // Appearance
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [secondaryColor, setSecondaryColor] = useState("#7c3aed");
  const [darkModeDefault, setDarkModeDefault] = useState(false);
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState("");
  const [companyName, setCompanyName] = useState("Dibnow Repair");
  const [footerText, setFooterText] = useState("");
  const [savingAp, setSavingAp] = useState(false);
  const [savedAp, setSavedAp] = useState(false);

  // Storage
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState("10");
  const [allowedFileTypes, setAllowedFileTypes] = useState("jpg, jpeg, png, webp, pdf");
  const [maxStoragePerTenantMb, setMaxStoragePerTenantMb] = useState("500");
  const [storageUsage, setStorageUsage] = useState<any[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [savingSt, setSavingSt] = useState(false);
  const [savedSt, setSavedSt] = useState(false);

  // Backup & recovery
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState("daily");
  const [backupRetentionDays, setBackupRetentionDays] = useState("14");
  const [backups, setBackups] = useState<any[]>([]);
  const [backupsLoaded, setBackupsLoaded] = useState(false);
  const [backupActing, setBackupActing] = useState(false);
  const [savingBk, setSavingBk] = useState(false);
  const [savedBk, setSavedBk] = useState(false);

  // Advanced — broadcast + platform stats
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("everyone");
  const [broadcasting, setBroadcasting] = useState(false);
  const [healthSummary, setHealthSummary] = useState<{ ok: number; warning: number; error: number } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  // Billing overview
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingLoaded,  setBillingLoaded]  = useState(false);

  // System diagnostics
  const [diagResults, setDiagResults] = useState<DiagnosticResult[]>([]);
  const [diagSummary, setDiagSummary] = useState<{ ok: number; warning: number; error: number } | null>(null);
  const [diagCheckedAt, setDiagCheckedAt] = useState("");
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagError,   setDiagError]   = useState("");
  const [diagExpanded, setDiagExpanded] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError("");
    try {
      const res = await api.get("/api/admin/diagnostics");
      setDiagResults(res.data?.data?.results ?? []);
      setDiagSummary(res.data?.data?.summary ?? null);
      setDiagCheckedAt(res.data?.data?.checkedAt ?? "");
    } catch (err: any) {
      setDiagError(err.response?.data?.message || "Failed to run diagnostics.");
    } finally {
      setDiagLoading(false);
    }
  };

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
        setDefaultLanguage(s.defaultLanguage ?? "en");
        setDateFormat(s.dateFormat ?? "DD/MM/YYYY");
        setTimeFormat(s.timeFormat ?? "24h");
        setMaintenance(s.maintenanceMode ?? false);
        setMaintenanceMessage(s.maintenanceMessage ?? "");
        setMaintenanceScheduledAt(toDatetimeLocal(s.maintenanceScheduledAt));
        setMaintenanceNoticeSentAt(s.maintenanceNoticeSentAt ?? "");
        setReadOnlyMode(s.readOnlyMode ?? false);
        setEmergencyLockdown(s.emergencyLockdown ?? false);
        setAllowNewSignups(s.allowNewSignups ?? true);
        setAllowFreeTrial(s.allowFreeTrial ?? true);
        setAllowPublicRegistration(s.allowPublicRegistration ?? true);
        setInviteOnlyRegistration(s.inviteOnlyRegistration ?? false);

        setTwoFactor(s.twoFactor         ?? false);
        setTwoFactorOwners(s.twoFactorOwners ?? false);
        setRequireEmailVerification(s.requireEmailVerification ?? false);
        setSessionTimeout(String(s.sessionTimeout    ?? 60));
        setPasswordMinLength(String(s.passwordMinLength ?? 8));
        setPasswordExpiryDays(String(s.passwordExpiryDays ?? 0));
        setPasswordHistoryCount(String(s.passwordHistoryCount ?? 0));
        setPasswordRequireUppercase(s.passwordRequireUppercase ?? true);
        setPasswordRequireNumber(s.passwordRequireNumber ?? true);
        setPasswordRequireSymbol(s.passwordRequireSymbol ?? true);
        setBlockDisposableEmails(s.blockDisposableEmails ?? false);
        setPreventMultipleSessions(s.preventMultipleSessions ?? false);
        setMaxLoginAttempts(String(s.maxLoginAttempts ?? 5));
        setLockoutDurationMinutes(String(s.lockoutDurationMinutes ?? 15));
        setAdminIpWhitelist((s.adminIpWhitelist ?? []).join(", "));
        setMyIp(s.clientIp ?? null);

        if (s.notifs) setNotifs((p) => ({ ...p, ...s.notifs }));
        if (s.aiProvider) setAiProvider(s.aiProvider);
        if (s.aiModel)    setAiModel(s.aiModel);
        setAiDailyBudgetUsd(String(s.aiDailyBudgetUsd ?? 0));
        setAiMonthlyBudgetUsd(String(s.aiMonthlyBudgetUsd ?? 0));
        setAiDisabledPlans(s.aiDisabledPlans ?? []);
        setAiRateLimitPerHourPerTenant(String(s.aiRateLimitPerHourPerTenant ?? 0));

        setDefaultTrialDays(String(s.defaultTrialDays ?? 14));
        setGracePeriodDays(String(s.gracePeriodDays ?? 3));
        setAutoSuspendExpiredShops(s.autoSuspendExpiredShops ?? false);

        setActiveEmailProvider(s.activeEmailProvider ?? "resend");
        setDefaultSenderName(s.defaultSenderName ?? "Dibnow Repair");
        setDefaultSenderEmail(s.defaultSenderEmail ?? "noreply@dibnow.com");
        setReplyToEmail(s.replyToEmail ?? "");
        setEmailRateLimitPerHour(String(s.emailRateLimitPerHour ?? 0));
        setDisableMarketingEmails(s.disableMarketingEmails ?? false);

        if (s.featureFlags) setFlags((p) => ({ ...p, ...s.featureFlags }));

        setLogoUrl(s.logoUrl ?? "");
        setFaviconUrl(s.faviconUrl ?? "");
        setPrimaryColor(s.primaryColor ?? "#2563eb");
        setSecondaryColor(s.secondaryColor ?? "#7c3aed");
        setDarkModeDefault(s.darkModeDefault ?? false);
        setLoginBackgroundUrl(s.loginBackgroundUrl ?? "");
        setCompanyName(s.companyName ?? "Dibnow Repair");
        setFooterText(s.footerText ?? "");

        setMaxUploadSizeMb(String(s.maxUploadSizeMb ?? 10));
        setAllowedFileTypes((s.allowedFileTypes ?? ["jpg", "jpeg", "png", "webp", "pdf"]).join(", "));
        setMaxStoragePerTenantMb(String(s.maxStoragePerTenantMb ?? 500));

        setAutoBackupEnabled(s.autoBackupEnabled ?? false);
        setAutoBackupFrequency(s.autoBackupFrequency ?? "daily");
        setBackupRetentionDays(String(s.backupRetentionDays ?? 14));
      })
      .catch((err) => {
        setInitError(err.response?.data?.message || "Could not load settings.");
      })
      .finally(() => setLoadingInit(false));
  }, []);

  // Lazy-load billing overview the first time that tab is opened
  useEffect(() => {
    if (tab !== "billing" || billingLoaded) return;
    setBillingLoading(true);
    api.get("/api/admin/subscriptions")
      .then((res) => setSubscriptions(res.data?.data ?? []))
      .catch(() => {})
      .finally(() => { setBillingLoading(false); setBillingLoaded(true); });
  }, [tab, billingLoaded]);

  // Auto-run diagnostics the first time that tab is opened
  useEffect(() => {
    if (tab !== "diagnostics" || diagResults.length > 0 || diagLoading) return;
    runDiagnostics();
  }, [tab]);

  // Sessions — lazy load on Security tab
  useEffect(() => {
    if (tab !== "security" || sessionsLoaded) return;
    api.get("/api/admin/sessions?activeOnly=true&limit=50")
      .then((res) => setSessions(res.data?.data ?? []))
      .catch(() => {})
      .finally(() => setSessionsLoaded(true));
  }, [tab, sessionsLoaded]);

  // AI usage — lazy load on AI tab
  useEffect(() => {
    if (tab !== "ai" || aiUsage) return;
    api.get("/api/admin/ai-usage").then((res) => setAiUsage(res.data?.data)).catch(() => {});
  }, [tab, aiUsage]);

  // Storage usage — lazy load on Storage tab
  useEffect(() => {
    if (tab !== "storage" || storageLoaded) return;
    api.get("/api/admin/storage-usage")
      .then((res) => setStorageUsage(res.data?.data ?? []))
      .catch(() => {})
      .finally(() => setStorageLoaded(true));
  }, [tab, storageLoaded]);

  // Backups — lazy load on Backup tab
  useEffect(() => {
    if (tab !== "backup" || backupsLoaded) return;
    api.get("/api/admin/tools/backup")
      .then((res) => setBackups(res.data?.data ?? []))
      .catch(() => {})
      .finally(() => setBackupsLoaded(true));
  }, [tab, backupsLoaded]);

  const saveSection = async (
    payload: Record<string, any>,
    setSaving: (v: boolean) => void,
    setSaved: (v: boolean) => void
  ) => {
    setSaving(true);
    setSaveError("");
    try {
      await api.patch("/api/admin/settings", payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const forceLogoutAll = async () => {
    if (!window.confirm("Force-logout every non-super-admin user on the platform right now?")) return;
    setLoggingOutAll(true);
    try {
      const res = await api.post("/api/admin/sessions", { action: "logout-all" });
      setSaveOk(res.data?.message || "Everyone signed out.");
      setTimeout(() => setSaveOk(""), 4000);
      setSessionsLoaded(false);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to force logout.");
    } finally {
      setLoggingOutAll(false);
    }
  };

  const changePassword = async () => {
    setPwError("");
    if (!currentPassword || !newPassword) { setPwError("Enter your current and new password."); return; }
    if (newPassword !== confirmPassword) { setPwError("New password and confirmation don't match."); return; }
    setChangingPw(true);
    try {
      const res = await api.post("/api/auth/change-password", { currentPassword, newPassword });
      const token = res.data?.data?.token;
      if (token) localStorage.setItem("token", token);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setChangedPw(true);
      setTimeout(() => setChangedPw(false), 3000);
    } catch (err: any) {
      setPwError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setChangingPw(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmailTo.trim()) return;
    setSendingTest(true);
    setSaveError("");
    try {
      const res = await api.post("/api/admin/tools/test-email", { to: testEmailTo.trim() });
      setSaveOk(res.data?.message || `Test email queued to ${testEmailTo}`);
      setTimeout(() => setSaveOk(""), 4000);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to send test email.");
    } finally {
      setSendingTest(false);
    }
  };

  const createBackupNow = async () => {
    setBackupActing(true);
    setSaveError("");
    try {
      const res = await api.post("/api/admin/tools/backup", { action: "create" });
      setSaveOk(res.data?.message || "Backup created");
      setTimeout(() => setSaveOk(""), 4000);
      setBackupsLoaded(false);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Backup failed.");
    } finally {
      setBackupActing(false);
    }
  };

  const restoreBackup = async (filename: string) => {
    if (!window.confirm(`Restore from "${filename}"? This overwrites current tenants/users/tickets/customers/leads/subscriptions/settings with the backup's contents. This cannot be undone.`)) return;
    setBackupActing(true);
    setSaveError("");
    try {
      const res = await api.post("/api/admin/tools/backup", { action: "restore", filename });
      setSaveOk(res.data?.message || "Restored");
      setTimeout(() => setSaveOk(""), 4000);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Restore failed.");
    } finally {
      setBackupActing(false);
    }
  };

  const exportConfig = async () => {
    const res = await api.get("/api/admin/tools/config", { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url; a.download = `platform-settings-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = async (file: File) => {
    try {
      const text = await file.text();
      await api.post("/api/admin/tools/config", JSON.parse(text));
      setSaveOk("Configuration imported — reloading…");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Import failed — check the file is a valid export.");
    }
  };

  const clearCache = async () => {
    try {
      await api.post("/api/admin/tools/cache-clear", {});
      setSaveOk("Cache cleared");
      setTimeout(() => setSaveOk(""), 3000);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to clear cache.");
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcasting(true);
    setSaveError("");
    try {
      const res = await api.post("/api/admin/tools/broadcast", { message: broadcastMsg.trim(), audience: broadcastAudience });
      setSaveOk(res.data?.message || "Broadcast sent");
      setTimeout(() => setSaveOk(""), 4000);
      setBroadcastMsg("");
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Failed to send broadcast.");
    } finally {
      setBroadcasting(false);
    }
  };

  const runHealthCheck = async () => {
    setCheckingHealth(true);
    try {
      const res = await api.get("/api/admin/diagnostics");
      setHealthSummary(res.data?.data?.summary ?? null);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || "Health check failed.");
    } finally {
      setCheckingHealth(false);
    }
  };

  const exportTenants = () => {
    window.open("/api/admin/tools/export-tenants", "_blank");
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
      {saveError && (
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{saveError}</p>
          <button onClick={() => setSaveError("")} className="ml-auto text-destructive/60 hover:text-destructive">✕</button>
        </div>
      )}
      {saveOk && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 dark:bg-emerald-900/20 dark:border-emerald-800">
          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{saveOk}</p>
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
                <p className="text-xs text-muted-foreground mt-0.5">Core platform configuration &amp; platform status</p>
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
                  <SelectField
                    label="Default Language" value={defaultLanguage} onChange={setDefaultLanguage}
                    options={[{ value: "en", label: "English" }, { value: "ur", label: "Urdu" }, { value: "ar", label: "Arabic" }]}
                  />
                  <SelectField
                    label="Date Format" value={dateFormat} onChange={setDateFormat}
                    options={[{ value: "DD/MM/YYYY", label: "DD/MM/YYYY" }, { value: "MM/DD/YYYY", label: "MM/DD/YYYY" }, { value: "YYYY-MM-DD", label: "YYYY-MM-DD" }]}
                  />
                  <SelectField
                    label="Time Format" value={timeFormat} onChange={setTimeFormat}
                    options={[{ value: "24h", label: "24-hour" }, { value: "12h", label: "12-hour (AM/PM)" }]}
                  />
                </div>

                <div className="border-t border-border pt-5 space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Platform Status</p>

                  <div className={`flex items-center justify-between gap-6 rounded-xl px-4 py-4 border transition-all mb-3 ${maintenanceMode ? "bg-destructive/5 border-destructive/20" : "bg-muted/40 border-border"}`}>
                    <div>
                      <p className="text-sm font-bold text-foreground">Maintenance Mode</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Blocks all tenant access — only super admins can log in</p>
                    </div>
                    <Toggle checked={maintenanceMode} onChange={setMaintenance} danger />
                  </div>
                  {maintenanceMode && (
                    <div className="mb-3 space-y-3">
                      <InputField label="Maintenance Message" value={maintenanceMessage} onChange={setMaintenanceMessage} placeholder="The platform is currently under maintenance…" />
                      <InputField
                        label="Scheduled Start (optional)" type="datetime-local"
                        value={maintenanceScheduledAt} onChange={setMaintenanceScheduledAt} icon={Clock}
                        hint="Leave blank to block access immediately on save. Set a future date/time to only send the notice now and start blocking access automatically once that moment arrives."
                      />
                      <p className="text-xs text-muted-foreground">
                        Saving with Maintenance Mode on emails every tenant, technician, and staff account (and notifies them in-app) with this message{maintenanceScheduledAt ? " and the scheduled start time" : ""}.
                        {maintenanceNoticeSentAt && ` Last notice sent ${fmtDate(maintenanceNoticeSentAt)}.`}
                      </p>
                    </div>
                  )}

                  {isSuperAdmin && (
                    <>
                      <div className={`flex items-center justify-between gap-6 rounded-xl px-4 py-4 border transition-all mb-3 ${readOnlyMode ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/40 border-border"}`}>
                        <div>
                          <p className="text-sm font-bold text-foreground">Read Only Mode</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Blocks all writes (create/update/delete) platform-wide except for super admins — reads still work</p>
                        </div>
                        <Toggle checked={readOnlyMode} onChange={setReadOnlyMode} danger />
                      </div>
                      <div className={`flex items-center justify-between gap-6 rounded-xl px-4 py-4 border transition-all mb-3 ${emergencyLockdown ? "bg-destructive/5 border-destructive/20" : "bg-muted/40 border-border"}`}>
                        <div>
                          <p className="text-sm font-bold text-foreground">Emergency Lockdown</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Immediately force-logs-out every non-super-admin session and blocks writes. Super-admin only toggle.</p>
                        </div>
                        <Toggle checked={emergencyLockdown} onChange={setEmergencyLockdown} danger />
                      </div>
                    </>
                  )}

                  <ToggleRow label="Allow New Shop Signups" sub="When off, /register rejects new shop (owner) sign-ups platform-wide" checked={allowNewSignups} onChange={setAllowNewSignups} />
                  <ToggleRow label="Allow Free Trial" sub="New shops start on a free trial when this is on" checked={allowFreeTrial} onChange={setAllowFreeTrial} />
                  <ToggleRow label="Allow Public Registration" sub="When off, customer self-registration is blocked platform-wide" checked={allowPublicRegistration} onChange={setAllowPublicRegistration} />
                  <ToggleRow label="Invite Only Registration" sub="Blocks customer self-service sign-up entirely — accounts must be created by a shop" checked={inviteOnlyRegistration} onChange={setInviteOnlyRegistration} />
                </div>

                <div className="pt-1 flex justify-end">
                  <SaveButton
                    loading={savingG} saved={savedG}
                    onClick={() => saveSection(
                      { platformName, domain, supportEmail, timezone, currency, defaultLanguage, dateFormat, timeFormat,
                        maintenanceMode, maintenanceMessage,
                        maintenanceScheduledAt: maintenanceMode && maintenanceScheduledAt ? maintenanceScheduledAt : null,
                        allowNewSignups, allowFreeTrial, allowPublicRegistration, inviteOnlyRegistration,
                        ...(isSuperAdmin ? { readOnlyMode, emergencyLockdown } : {}) },
                      setSavingG, setSavedG
                    )}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {tab === "security" && (
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground">My Account</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Change the password for your own login</p>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid sm:grid-cols-3 gap-5">
                    <InputField label="Current Password" icon={Key} type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••" />
                    <InputField label="New Password" icon={Key} type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
                    <InputField label="Confirm New Password" icon={Key} type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" />
                  </div>
                  {pwError && (
                    <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                      <p className="text-xs font-semibold text-destructive">{pwError}</p>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <SaveButton loading={changingPw} saved={changedPw} onClick={changePassword} />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground">Security Settings</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Authentication and access control</p>
                </div>
                <div className="p-6 space-y-1">
                  <ToggleRow label="Require 2FA for Super Admins" sub="Super admins must enter a 6-digit code emailed at login" checked={twoFactor} onChange={setTwoFactor} />
                  <ToggleRow label="Require 2FA for Shop Owners" sub="Owners and managers must enter a 6-digit code emailed at login" checked={twoFactorOwners} onChange={setTwoFactorOwners} />
                  <ToggleRow label="Require Email Verification" sub="New accounts must click a verification link before they can log in" checked={requireEmailVerification} onChange={setRequireEmailVerification} />
                  <ToggleRow label="Block Disposable Emails" sub="Rejects signups from mailinator/guerrillamail/yopmail-style domains" checked={blockDisposableEmails} onChange={setBlockDisposableEmails} />
                  <ToggleRow label="Prevent Multiple Active Sessions" sub="Logging in again signs out every other active session for that account" checked={preventMultipleSessions} onChange={setPreventMultipleSessions} />

                  <div className="grid sm:grid-cols-2 gap-5 pt-4">
                    <InputField label="Session Timeout (minutes)" icon={Clock} type="number" value={sessionTimeout} onChange={setSessionTimeout} placeholder="60" hint="Min: 15 · Max: 480" />
                    <InputField label="Min Password Length" icon={Key} type="number" value={passwordMinLength} onChange={setPasswordMinLength} placeholder="8" hint="Min: 6 · Max: 32" />
                    <InputField label="Max Login Attempts" icon={Shield} type="number" value={maxLoginAttempts} onChange={setMaxLoginAttempts} placeholder="5" hint="Min: 3 · Max: 10" />
                    <InputField label="Lockout Duration (minutes)" icon={Clock} type="number" value={lockoutDurationMinutes} onChange={setLockoutDurationMinutes} placeholder="15" hint="Min: 5 · Max: 120" />
                    <InputField label="Password Expiry (days)" icon={Clock} type="number" value={passwordExpiryDays} onChange={setPasswordExpiryDays} placeholder="0" hint="0 = disabled" />
                    <InputField label="Password History (count)" icon={Key} type="number" value={passwordHistoryCount} onChange={setPasswordHistoryCount} placeholder="0" hint="0 = disabled — prevents reusing recent passwords" />
                  </div>

                  <div className="pt-2">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Password Complexity Rules</p>
                    <div className="grid grid-cols-3 gap-3">
                      <ToggleRow label="Uppercase" sub="Require 1+" checked={passwordRequireUppercase} onChange={setPasswordRequireUppercase} />
                      <ToggleRow label="Number" sub="Require 1+" checked={passwordRequireNumber} onChange={setPasswordRequireNumber} />
                      <ToggleRow label="Symbol" sub="Require 1+" checked={passwordRequireSymbol} onChange={setPasswordRequireSymbol} />
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <div className="pt-2">
                      <InputField label="Admin IP Whitelist" value={adminIpWhitelist} onChange={setAdminIpWhitelist} placeholder="203.0.113.4, 198.51.100.0/24" hint={`Comma-separated IPs or IPv4 CIDR ranges. When non-empty, super-admin login and the admin panel (pages + APIs) are blocked from any other IP — the rest of the platform is unaffected. Saving requires your own IP to be covered.${myIp ? ` Your current IP: ${myIp}` : ""}`} />
                    </div>
                  )}

                  <div className="pt-3 flex justify-end">
                    <SaveButton
                      loading={savingS} saved={savedS}
                      onClick={() => {
                        const clamped = {
                          twoFactor, twoFactorOwners, requireEmailVerification, blockDisposableEmails, preventMultipleSessions,
                          sessionTimeout: clamp(Number(sessionTimeout), 15, 480),
                          passwordMinLength: clamp(Number(passwordMinLength), 6, 32),
                          maxLoginAttempts: clamp(Number(maxLoginAttempts), 3, 10),
                          lockoutDurationMinutes: clamp(Number(lockoutDurationMinutes), 5, 120),
                          passwordExpiryDays: Math.max(0, Number(passwordExpiryDays) || 0),
                          passwordHistoryCount: Math.max(0, Number(passwordHistoryCount) || 0),
                          passwordRequireUppercase, passwordRequireNumber, passwordRequireSymbol,
                          ...(isSuperAdmin ? { adminIpWhitelist: adminIpWhitelist.split(",").map(s => s.trim()).filter(Boolean) } : {}),
                        };
                        saveSection(clamped, setSavingS, setSavedS);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-bold text-foreground">Active Sessions</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Recent logins across the platform (last 50)</p>
                  </div>
                  {isSuperAdmin && (
                    <button onClick={forceLogoutAll} disabled={loggingOutAll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-wider hover:bg-destructive/20 disabled:opacity-60 transition-all">
                      {loggingOutAll ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
                      Force Logout Everyone
                    </button>
                  )}
                </div>
                <div className="px-6 py-2 max-h-96 overflow-y-auto">
                  {!sessionsLoaded ? (
                    <p className="text-sm text-muted-foreground py-4">Loading…</p>
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No active sessions recorded.</p>
                  ) : sessions.map((s) => (
                    <div key={s._id} className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.userId?.name ?? "Unknown"} <span className="text-xs text-muted-foreground font-normal">· {s.role}</span></p>
                        <p className="text-xs text-muted-foreground">{s.ipAddress} · {fmtDate(s.createdAt)}</p>
                      </div>
                      <button
                        onClick={async () => { await api.post(`/api/admin/sessions/${s.userId?._id}`); setSessionsLoaded(false); }}
                        className="text-xs font-bold text-destructive hover:underline"
                      >
                        Force Logout
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub Admins */}
          {tab === "subadmins" && <SubAdminManager isSuperAdmin={isSuperAdmin} />}

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
                  { key: "newAdminCreated",  label: "New Admin Created",      sub: "Alert when a super admin creates a scoped sub admin account" },
                  { key: "subscriptionExpiring", label: "Subscription Expiring", sub: "Alert when a tenant's subscription is renewing within 7 days" },
                  { key: "subscriptionCancelled", label: "Subscription Cancelled", sub: "Alert when a tenant's subscription is cancelled" },
                  { key: "failedLoginAlert", label: "Failed Login Alert",     sub: "Alert super admins when an account gets locked out from repeated failed logins" },
                  { key: "storageLimitReached", label: "Storage Limit Reached", sub: "Alert when a tenant goes over its storage cap (see the Storage tab)" },
                  { key: "highCpuUsage",     label: "High CPU Usage",         sub: "Alert when server load average exceeds ~90% of available cores" },
                  { key: "highMemoryUsage",  label: "High Memory Usage",      sub: "Alert when system memory usage exceeds ~90%" },
                  { key: "databaseBackupFailed", label: "Database Backup Failed", sub: "Alert when a scheduled automatic backup fails" },
                ].map(({ key, label, sub }) => (
                  <ToggleRow
                    key={key} label={label} sub={sub}
                    checked={notifs[key]}
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

          {/* AI Models */}
          {tab === "ai" && (() => {
            const activeProvider = AI_PROVIDERS.find(p => p.value === aiProvider)!;
            const models = AI_MODELS[aiProvider] ?? [];

            return (
              <div className="space-y-5">
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-foreground">AI Model Configuration</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Select the provider and model used across all AI features platform-wide</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                      <Cpu className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-bold text-primary">{activeProvider?.label} · {aiModel}</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Provider</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {AI_PROVIDERS.map(p => (
                          <button
                            key={p.value}
                            onClick={() => { setAiProvider(p.value); setAiModel(AI_MODELS[p.value][0].value); }}
                            className={`text-left p-4 rounded-xl border transition-all ${
                              aiProvider === p.value ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : "bg-muted/40 border-border hover:bg-muted/60"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="font-bold text-sm text-foreground">{p.label}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE_COLORS[p.color]}`}>{p.badge}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Model</p>
                      <div className="relative max-w-sm">
                        <select value={aiModel} onChange={e => setAiModel(e.target.value)} className="w-full appearance-none bg-background border border-border rounded-xl px-4 py-3 pr-8 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all">
                          {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <InputField label="Daily AI Budget (USD)" type="number" value={aiDailyBudgetUsd} onChange={setAiDailyBudgetUsd} placeholder="0" hint="0 = unlimited" />
                      <InputField label="Monthly AI Budget (USD)" type="number" value={aiMonthlyBudgetUsd} onChange={setAiMonthlyBudgetUsd} placeholder="0" hint="0 = unlimited" />
                      <InputField label="Rate Limit / Hour / Tenant" type="number" value={aiRateLimitPerHourPerTenant} onChange={setAiRateLimitPerHourPerTenant} placeholder="0" hint="0 = unlimited" />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Disable AI For Plans</p>
                      <div className="flex gap-2">
                        {["free", "pro", "enterprise"].map((plan) => (
                          <button
                            key={plan}
                            onClick={() => setAiDisabledPlans((prev) => prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan])}
                            className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${aiDisabledPlans.includes(plan) ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground"}`}
                          >
                            {plan}
                          </button>
                        ))}
                      </div>
                    </div>

                    {aiUsage && (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border border-border bg-muted/40 p-4">
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Today</p>
                          <p className="text-xl font-black text-foreground mt-1">${aiUsage.todaySpendUsd?.toFixed(4)} <span className="text-xs font-medium text-muted-foreground">· {aiUsage.todayRequests} req</span></p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/40 p-4">
                          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">This Month</p>
                          <p className="text-xl font-black text-foreground mt-1">${aiUsage.monthSpendUsd?.toFixed(4)} <span className="text-xs font-medium text-muted-foreground">· {aiUsage.monthRequests} req</span></p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-xl px-4 py-3">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        API keys are loaded from server environment variables (<code className="font-mono text-foreground/70">GROQ_API_KEY</code>, <code className="font-mono text-foreground/70">OPENAI_API_KEY</code>, <code className="font-mono text-foreground/70">GEMINI_API_KEY</code>, <code className="font-mono text-foreground/70">GLM_API_KEY</code>).
                      </p>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <SaveButton
                        loading={savingAI} saved={savedAI}
                        onClick={() => saveSection({ aiProvider, aiModel, aiDailyBudgetUsd: Number(aiDailyBudgetUsd) || 0, aiMonthlyBudgetUsd: Number(aiMonthlyBudgetUsd) || 0, aiDisabledPlans, aiRateLimitPerHourPerTenant: Number(aiRateLimitPerHourPerTenant) || 0 }, setSavingAI, setSavedAI)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Billing */}
          {tab === "billing" && (() => {
            const overdue  = subscriptions.filter(s => s.isOverdue);
            const upcoming = subscriptions.filter(s => !s.isOverdue && s.status === "active" && s.daysUntilRenewal != null && s.daysUntilRenewal <= 7);
            const current  = subscriptions.filter(s => !s.isOverdue && s.status === "active" && (s.daysUntilRenewal == null || s.daysUntilRenewal > 7));

            const Row = ({ s }: { s: any }) => (
              <div className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">{s.tenantName}</p>
                  <p className="text-xs text-muted-foreground">{s.tenantSubdomain}.dibnow.com · {s.plan}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-foreground">{s.nextBillingDate ? fmtDate(s.nextBillingDate).split(" ")[0] : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Rs. {s.amount?.toLocaleString?.() ?? 0}</p>
                </div>
              </div>
            );

            return (
              <div className="space-y-5">
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h2 className="font-bold text-foreground">Billing Controls</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Platform-wide subscription defaults</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <InputField label="Default Trial Length (days)" type="number" value={defaultTrialDays} onChange={setDefaultTrialDays} placeholder="14" />
                      <InputField label="Grace Period (days)" type="number" value={gracePeriodDays} onChange={setGracePeriodDays} placeholder="3" hint="How long past due date before auto-suspend fires" />
                    </div>
                    <ToggleRow label="Auto Suspend Expired Shops" sub="A scheduled sweep suspends tenants overdue past the grace period" checked={autoSuspendExpiredShops} onChange={setAutoSuspendExpiredShops} />
                    <div className="pt-1 flex justify-end">
                      <SaveButton
                        loading={savingB} saved={savedB}
                        onClick={() => saveSection({
                          defaultTrialDays: Number(defaultTrialDays) || 14, gracePeriodDays: Number(gracePeriodDays) || 3,
                          autoSuspendExpiredShops,
                        }, setSavingB, setSavedB)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-card border border-border rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-destructive">{billingLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : overdue.length}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Overdue</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-amber-500">{billingLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : upcoming.length}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Renewing ≤ 7 days</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-4 text-center">
                    <p className="text-2xl font-black text-emerald-500">{billingLoading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : current.length}</p>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">Current</p>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-destructive" />
                    <h2 className="font-bold text-foreground text-sm">Overdue on Billing</h2>
                  </div>
                  <div className="px-6 py-2">
                    {billingLoading ? <p className="text-sm text-muted-foreground py-4">Loading…</p> : overdue.length === 0 ? <p className="text-sm text-muted-foreground py-4">No overdue accounts.</p> : overdue.map(s => <Row key={s._id} s={s} />)}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <h2 className="font-bold text-foreground text-sm">Renewing Soon</h2>
                  </div>
                  <div className="px-6 py-2">
                    {billingLoading ? <p className="text-sm text-muted-foreground py-4">Loading…</p> : upcoming.length === 0 ? <p className="text-sm text-muted-foreground py-4">Nothing renewing in the next 7 days.</p> : upcoming.map(s => <Row key={s._id} s={s} />)}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <h2 className="font-bold text-foreground text-sm">Paid &amp; Current</h2>
                  </div>
                  <div className="px-6 py-2">
                    {billingLoading ? <p className="text-sm text-muted-foreground py-4">Loading…</p> : current.length === 0 ? <p className="text-sm text-muted-foreground py-4">No accounts in good standing yet.</p> : current.map(s => <Row key={s._id} s={s} />)}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Manage plans, statuses, and billing details on the{" "}
                  <a href="/dashboard/super-admin/subscriptions" className="text-primary font-semibold hover:underline">Subscriptions</a> page.
                </p>
              </div>
            );
          })()}

          {/* Email */}
          {tab === "email" && (
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground">Email Provider</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Pick one provider — every outgoing email shifts to it, the other two switch off</p>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Active Provider</p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {EMAIL_PROVIDERS_META.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setActiveEmailProvider(p.value)}
                          className={`text-left p-4 rounded-xl border transition-all ${activeEmailProvider === p.value ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : "bg-muted/40 border-border hover:bg-muted/60"}`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="font-bold text-sm text-foreground">{p.label}</p>
                            {activeEmailProvider === p.value ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Active</span> : <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BADGE_COLORS[p.color]}`}>Off</span>}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <InputField label="Default Sender Name" value={defaultSenderName} onChange={setDefaultSenderName} placeholder="Dibnow Repair" />
                    <InputField label="Default Sender Email" value={defaultSenderEmail} onChange={setDefaultSenderEmail} placeholder="noreply@dibnow.com" />
                    <InputField label="Reply-To Address" value={replyToEmail} onChange={setReplyToEmail} placeholder="support@dibnow.com" />
                    <InputField label="Email Rate Limit / Hour" type="number" value={emailRateLimitPerHour} onChange={setEmailRateLimitPerHour} placeholder="0" hint="0 = unlimited" />
                  </div>
                  <ToggleRow label="Disable Marketing Emails" sub="Suppresses non-transactional/marketing sends" checked={disableMarketingEmails} onChange={setDisableMarketingEmails} />

                  <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-xl px-4 py-3">
                    <Key className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      API keys are loaded from server environment variables (<code className="font-mono text-foreground/70">RESEND_API_KEY</code>, <code className="font-mono text-foreground/70">MAILERSEND_API_KEY</code>, <code className="font-mono text-foreground/70">MAILTRAP_API_KEY</code>).
                    </p>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <SaveButton
                      loading={savingE} saved={savedE}
                      onClick={() => saveSection({ activeEmailProvider, defaultSenderName, defaultSenderEmail, replyToEmail, emailRateLimitPerHour: Number(emailRateLimitPerHour) || 0, disableMarketingEmails }, setSavingE, setSavedE)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground text-sm">Test Email</h2>
                </div>
                <div className="p-6 flex gap-3">
                  <input value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} placeholder="you@example.com" className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={sendTestEmail} disabled={sendingTest || !testEmailTo.trim()} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60 transition-all">
                    {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Send Test
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feature Flags */}
          {tab === "flags" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-bold text-foreground">Feature Flags</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Toggle entire modules on/off platform-wide without deploying code — hides the matching nav item for tenant-side roles</p>
              </div>
              <div className="px-6 py-2">
                {[
                  { key: "enableAI", label: "Enable AI", sub: "Hides AI Diagnostic for technicians when off" },
                  { key: "enableTickets", label: "Enable Tickets", sub: "Hides Tickets nav for owner/manager/frontdesk/technician when off" },
                  { key: "enableInventory", label: "Enable Inventory", sub: "Hides Inventory nav for owner/manager/frontdesk/technician when off" },
                  { key: "enableReports", label: "Enable Reports", sub: "Hides Reports nav for owner/manager when off" },
                  { key: "enableCustomerPortal", label: "Enable Customer Portal", sub: "Hides the entire customer-facing portal nav when off" },
                  { key: "enableAnalytics", label: "Enable Analytics", sub: "Platform-wide analytics module toggle" },
                ].map(({ key, label, sub }) => (
                  <ToggleRow key={key} label={label} sub={sub} checked={flags[key]} onChange={(v) => setFlags((p) => ({ ...p, [key]: v }))} />
                ))}
              </div>
              <div className="px-6 py-4 border-t border-border flex justify-end">
                <SaveButton loading={savingF} saved={savedF} onClick={() => saveSection({ featureFlags: flags }, setSavingF, setSavedF)} />
              </div>
            </div>
          )}

          {/* Appearance */}
          {tab === "appearance" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-bold text-foreground">Appearance / Branding</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Platform-wide branding values</p>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <ImageUploadField label="Logo" url={logoUrl} uploadField="logoUrl" onUploaded={setLogoUrl} />
                  <ImageUploadField label="Favicon" url={faviconUrl} uploadField="faviconUrl" onUploaded={setFaviconUrl} />
                  <ImageUploadField label="Login Background" url={loginBackgroundUrl} uploadField="loginBackgroundUrl" onUploaded={setLoginBackgroundUrl} />
                  <InputField label="Company Name" value={companyName} onChange={setCompanyName} placeholder="Dibnow Repair" />
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <ColorPaletteField label="Primary Color" value={primaryColor} onChange={setPrimaryColor} />
                  <ColorPaletteField label="Secondary Color" value={secondaryColor} onChange={setSecondaryColor} />
                </div>
                <InputField label="Footer Text" value={footerText} onChange={setFooterText} placeholder="© 2026 Dibnow Repair" />
                <ToggleRow label="Dark Mode Default" sub="New visitors without a saved theme preference start in dark mode" checked={darkModeDefault} onChange={setDarkModeDefault} />
                <div className="pt-1 flex justify-end">
                  <SaveButton
                    loading={savingAp} saved={savedAp}
                    onClick={() => saveSection({ logoUrl, faviconUrl, primaryColor, secondaryColor, darkModeDefault, loginBackgroundUrl, companyName, footerText }, setSavingAp, setSavedAp)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Storage */}
          {tab === "storage" && (
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground">Storage</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload limits and per-tenant storage caps</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <InputField label="Max Upload Size (MB)" type="number" value={maxUploadSizeMb} onChange={setMaxUploadSizeMb} placeholder="10" hint="Enforced on branding image uploads" />
                    <InputField label="Max Storage Per Tenant (MB)" type="number" value={maxStoragePerTenantMb} onChange={setMaxStoragePerTenantMb} placeholder="500" hint="Compared against each tenant's actual data size below" />
                  </div>
                  <InputField label="Allowed File Types" value={allowedFileTypes} onChange={setAllowedFileTypes} placeholder="jpg, jpeg, png, webp, pdf" hint="Comma-separated extensions, enforced on upload" />
                  <div className="pt-1 flex justify-end">
                    <SaveButton
                      loading={savingSt} saved={savedSt}
                      onClick={() => saveSection({
                        maxUploadSizeMb: Number(maxUploadSizeMb) || 10,
                        allowedFileTypes: allowedFileTypes.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
                        maxStoragePerTenantMb: Number(maxStoragePerTenantMb) || 500,
                      }, setSavingSt, setSavedSt)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground text-sm">Usage By Tenant</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Actual database storage per tenant (tickets, customers, leads) vs. the cap above</p>
                </div>
                <div className="px-6 py-2 max-h-[28rem] overflow-y-auto">
                  {!storageLoaded ? (
                    <p className="text-sm text-muted-foreground py-4">Loading…</p>
                  ) : storageUsage.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No tenants yet.</p>
                  ) : storageUsage.map((u) => (
                    <div key={u.tenantId} className="py-3 border-b border-border last:border-0">
                      <div className="flex items-center justify-between gap-4 mb-1.5">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Building2 size={12} className="text-muted-foreground" />{u.tenantName}</p>
                        <p className={`text-xs font-bold ${u.overCap ? "text-destructive" : "text-muted-foreground"}`}>{u.usedMb.toFixed(2)} MB / {u.capMb} MB</p>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${u.overCap ? "bg-destructive" : "bg-primary"}`} style={{ width: `${Math.min(100, u.pctUsed)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Backup & Recovery */}
          {tab === "backup" && (
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground">Backup & Recovery</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">JSON snapshots of tenants/users/tickets/customers/leads/subscriptions/settings, stored on local disk</p>
                </div>
                <div className="p-6 space-y-4">
                  <ToggleRow label="Automatic Backup" sub="Runs on the server's own schedule (see Frequency)" checked={autoBackupEnabled} onChange={setAutoBackupEnabled} />
                  <div className="grid sm:grid-cols-2 gap-5">
                    <SelectField label="Frequency" value={autoBackupFrequency} onChange={setAutoBackupFrequency} options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} />
                    <InputField label="Retention (days)" type="number" value={backupRetentionDays} onChange={setBackupRetentionDays} placeholder="14" />
                  </div>
                  <div className="pt-1 flex justify-end gap-2">
                    <button onClick={createBackupNow} disabled={backupActing} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60 transition-all">
                      {backupActing ? <Loader2 size={14} className="animate-spin" /> : <DatabaseBackup size={14} />}
                      Backup Now
                    </button>
                    <SaveButton loading={savingBk} saved={savedBk} onClick={() => saveSection({ autoBackupEnabled, autoBackupFrequency, backupRetentionDays: Number(backupRetentionDays) || 14 }, setSavingBk, setSavedBk)} />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground text-sm">Backup Status</h2>
                </div>
                <div className="px-6 py-2">
                  {!backupsLoaded ? (
                    <p className="text-sm text-muted-foreground py-4">Loading…</p>
                  ) : backups.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No backups yet — click Backup Now.</p>
                  ) : backups.map((b) => (
                    <div key={b.filename} className="flex items-center justify-between gap-4 py-2.5 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-foreground font-mono">{b.filename}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(b.createdAt)} · {(b.sizeBytes / 1024).toFixed(1)} KB</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <a href={`/api/admin/tools/backup?download=${b.filename}`} className="text-xs font-bold text-primary hover:underline flex items-center gap-1"><Download size={12} />Download</a>
                        {isSuperAdmin && (
                          <button onClick={() => restoreBackup(b.filename)} disabled={backupActing} className="text-xs font-bold text-destructive hover:underline flex items-center gap-1"><RotateCcw size={12} />Restore</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Advanced */}
          {tab === "advanced" && (
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-3">
                  <Megaphone size={16} className="text-primary" />
                  <div>
                    <h2 className="font-bold text-foreground text-sm">Broadcast Announcement</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Emails + in-app notifies every matching user</p>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex gap-1.5">
                    {[{ v: "everyone", l: "Everyone" }, { v: "owners", l: "Owners" }, { v: "all_staff", l: "All Staff" }].map((a) => (
                      <button key={a.v} onClick={() => setBroadcastAudience(a.v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${broadcastAudience === a.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{a.l}</button>
                    ))}
                  </div>
                  <textarea value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} rows={3} placeholder="Message to broadcast…" className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <div className="flex justify-end">
                    <button onClick={sendBroadcast} disabled={broadcasting || !broadcastMsg.trim()} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 disabled:opacity-60 transition-all">
                      {broadcasting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Send Broadcast
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h2 className="font-bold text-foreground text-sm">Export All Tenants</h2>
                  </div>
                  <div className="p-6">
                    <button onClick={exportTenants} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all">
                      <Download size={14} />
                      Export Tenants (CSV)
                    </button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border">
                    <h2 className="font-bold text-foreground text-sm">System Health Dashboard</h2>
                  </div>
                  <div className="p-6 space-y-3">
                    <button onClick={runHealthCheck} disabled={checkingHealth} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 disabled:opacity-60 transition-all">
                      {checkingHealth ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
                      Run Health Check
                    </button>
                    {healthSummary && (
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-emerald-500/10 py-2"><p className="font-black text-emerald-500">{healthSummary.ok}</p><p className="text-[10px] text-muted-foreground">OK</p></div>
                        <div className="rounded-lg bg-amber-500/10 py-2"><p className="font-black text-amber-500">{healthSummary.warning}</p><p className="text-[10px] text-muted-foreground">Warn</p></div>
                        <div className="rounded-lg bg-destructive/10 py-2"><p className="font-black text-destructive">{healthSummary.error}</p><p className="text-[10px] text-muted-foreground">Error</p></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-bold text-foreground">Configuration Export / Import</h2>
                </div>
                <div className="p-6 flex flex-wrap gap-3">
                  <button onClick={exportConfig} className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all"><Download size={14} />Export Configuration</button>
                  {isSuperAdmin && (
                    <label className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all cursor-pointer">
                      <Upload size={14} />Import Configuration
                      <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importConfig(e.target.files[0])} />
                    </label>
                  )}
                  <button onClick={clearCache} className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all"><RefreshCw size={14} />Force Cache Clear</button>
                </div>
              </div>
            </div>
          )}

          {tab === "diagnostics" && (() => {
            const STATUS_META: Record<DiagnosticResult["status"], { icon: any; text: string; bg: string; border: string }> = {
              ok:      { icon: CheckCircle2,   text: "text-emerald-500",  bg: "bg-emerald-500/5",  border: "border-emerald-500/20" },
              warning: { icon: AlertTriangle,  text: "text-amber-500",    bg: "bg-amber-500/5",    border: "border-amber-500/20" },
              error:   { icon: XCircle,        text: "text-destructive",  bg: "bg-destructive/5",  border: "border-destructive/20" },
            };
            const grouped = diagResults.reduce<Record<string, DiagnosticResult[]>>((acc, r) => {
              (acc[r.category] ??= []).push(r);
              return acc;
            }, {});

            return (
              <div className="space-y-5">
                <div className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="font-bold text-foreground">System Diagnostics</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Live checks against the database and every configured integration — exact cause and fix for anything broken.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {diagCheckedAt && !diagLoading && (
                        <span className="text-[11px] text-muted-foreground">
                          Checked {new Date(diagCheckedAt).toLocaleTimeString()}
                        </span>
                      )}
                      <button
                        onClick={runDiagnostics}
                        disabled={diagLoading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-60 transition-all"
                      >
                        <RefreshCw size={13} className={diagLoading ? "animate-spin" : ""} />
                        {diagLoading ? "Running…" : "Run Diagnostics"}
                      </button>
                    </div>
                  </div>

                  {diagError && (
                    <div className="mx-6 mt-4 flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
                      <AlertTriangle size={14} className="text-destructive shrink-0" />
                      <p className="text-sm font-semibold text-destructive">{diagError}</p>
                    </div>
                  )}

                  {diagSummary && (
                    <div className="grid grid-cols-3 gap-4 px-6 pt-5">
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                        <p className="text-2xl font-black text-emerald-500">{diagSummary.ok}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Healthy</p>
                      </div>
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                        <p className="text-2xl font-black text-amber-500">{diagSummary.warning}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Warnings</p>
                      </div>
                      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
                        <p className="text-2xl font-black text-destructive">{diagSummary.error}</p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Errors</p>
                      </div>
                    </div>
                  )}

                  <div className="p-6 space-y-6">
                    {diagLoading && diagResults.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Loader2 className="animate-spin w-7 h-7 mb-3" />
                        <p className="text-sm font-medium">Running checks against live services…</p>
                      </div>
                    ) : Object.keys(grouped).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No results yet — click Run Diagnostics.</p>
                    ) : (
                      Object.entries(grouped).map(([category, items]) => (
                        <div key={category}>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{category}</p>
                          <div className="space-y-2">
                            {items.map((r) => {
                              const meta = STATUS_META[r.status];
                              const StatusIcon = meta.icon;
                              const isOpen = diagExpanded === r.id;
                              const hasDetail = !!(r.detail || r.fix);
                              return (
                                <div key={r.id} className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden`}>
                                  <button
                                    onClick={() => hasDetail && setDiagExpanded(isOpen ? null : r.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
                                  >
                                    <StatusIcon size={16} className={`${meta.text} shrink-0`} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-foreground">{r.label}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>
                                    </div>
                                    {hasDetail && (
                                      <ChevronRight size={14} className={`text-muted-foreground shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                                    )}
                                  </button>
                                  {isOpen && hasDetail && (
                                    <div className="px-4 pb-4 pl-[calc(1rem+16px+0.75rem)] space-y-2">
                                      {r.detail && (
                                        <div>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Exact cause</p>
                                          <p className="text-xs font-mono text-foreground/80 bg-background/60 rounded-lg px-3 py-2 break-all">{r.detail}</p>
                                        </div>
                                      )}
                                      {r.fix && (
                                        <div>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">How to fix</p>
                                          <p className="text-xs text-foreground/80">{r.fix}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
