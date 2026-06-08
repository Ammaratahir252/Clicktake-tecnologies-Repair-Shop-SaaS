"use client";

/**
 * OWNER SETTINGS — /dashboard/owner/settings
 *
 * Sections:
 * 1. Shop Profile  — name, address, phone, logo URL
 * 2. Business Hours — open/close per day
 * 3. Notifications  — toggle email/SMS alerts
 * 4. Danger Zone    — deactivate shop (UI-only, no real API)
 */

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import {
  Settings, Store, Clock, Bell, ShieldAlert,
  Loader2, Save, CheckCircle2, AlertTriangle,
  Phone, MapPin, Link as LinkIcon, ChevronDown
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopProfile {
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
  timezone: string;
}

interface DayHours {
  open: boolean;
  from: string;
  to: string;
}

type BusinessHours = Record<string, DayHours>;

interface NotificationPrefs {
  emailOnNewTicket: boolean;
  emailOnPayment: boolean;
  smsOnReadyForPickup: boolean;
  smsOnOverdue: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_HOURS: BusinessHours = Object.fromEntries(
  DAYS.map((d) => [d, { open: d !== "Sunday", from: "09:00", to: "18:00" }])
);

const TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Europe/London",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
];

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  subtitle,
  color,
  children,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center gap-3">
        <div className={`${color} w-9 h-9 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-card-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-muted border border-border"
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

function Field({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  icon?: any;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-background border border-border rounded-xl py-2.5 text-sm font-medium text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all ${
            Icon ? "pl-9 pr-3" : "px-3"
          }`}
        />
      </div>
    </div>
  );
}

// ─── Save Button ──────────────────────────────────────────────────────────────

function SaveBtn({
  loading,
  saved,
  onClick,
  label = "Save Changes",
}: {
  loading: boolean;
  saved: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || saved}
      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 ${
        saved
          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
          : "bg-primary text-primary-foreground hover:opacity-90"
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : saved ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      {saved ? "Saved!" : loading ? "Saving…" : label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OwnerSettingsPage() {
  return (
    <DashboardShell requiredRole="owner">
      {(user) => <SettingsContent user={user} />}
    </DashboardShell>
  );
}

function SettingsContent({ user }: { user: any }) {
  // ── Shop Profile state ──
  const [profile, setProfile] = useState<ShopProfile>({
    name: user?.shopName ?? user?.tenantName ?? "",
    address: "",
    phone: "",
    logoUrl: "",
    timezone: "Asia/Karachi",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);

  // ── Business Hours state ──
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [savingHours, setSavingHours] = useState(false);
  const [savedHours, setSavedHours] = useState(false);

  // ── Notifications state ──
  const [notifs, setNotifs] = useState<NotificationPrefs>({
    emailOnNewTicket: true,
    emailOnPayment: true,
    smsOnReadyForPickup: false,
    smsOnOverdue: false,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [savedNotifs, setSavedNotifs] = useState(false);

  // ── Danger Zone ──
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [dangerError, setDangerError] = useState("");

  // ── Fake save helper ──
  const fakeSave = (
    setSaving: (v: boolean) => void,
    setSaved: (v: boolean) => void
  ) => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 900);
  };

  const updateDay = (day: string, key: keyof DayHours, value: any) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [key]: value } }));
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-md">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">Shop Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your tenant configuration and preferences</p>
        </div>
      </div>

      {/* ── 1. Shop Profile ───────────────────────────────────────────────────── */}
      <Section
        icon={Store}
        title="Shop Profile"
        subtitle="Basic info shown to customers and staff"
        color="bg-blue-600"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <Field
              label="Shop Name"
              icon={Store}
              value={profile.name}
              onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
              placeholder="e.g. Clicktake Repair Center"
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Address"
              icon={MapPin}
              value={profile.address}
              onChange={(v) => setProfile((p) => ({ ...p, address: v }))}
              placeholder="Street, City, Country"
            />
          </div>
          <Field
            label="Phone Number"
            icon={Phone}
            value={profile.phone}
            onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
            placeholder="+92 300 0000000"
          />
          <Field
            label="Logo URL"
            icon={LinkIcon}
            value={profile.logoUrl}
            onChange={(v) => setProfile((p) => ({ ...p, logoUrl: v }))}
            placeholder="https://..."
          />
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Timezone
            </label>
            <div className="relative">
              <select
                value={profile.timezone}
                onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                className="w-full appearance-none bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all pr-9"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Logo preview */}
          {profile.logoUrl && (
            <div className="flex items-center gap-3">
              <img
                src={profile.logoUrl}
                alt="Logo preview"
                className="w-14 h-14 object-contain rounded-xl border border-border bg-muted"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
              <span className="text-xs text-muted-foreground">Logo preview</span>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <SaveBtn
            loading={savingProfile}
            saved={savedProfile}
            onClick={() => fakeSave(setSavingProfile, setSavedProfile)}
          />
        </div>
      </Section>

      {/* ── 2. Business Hours ─────────────────────────────────────────────────── */}
      <Section
        icon={Clock}
        title="Business Hours"
        subtitle="Set when your shop is open for walk-ins and pickups"
        color="bg-emerald-600"
      >
        <div className="divide-y divide-border">
          {DAYS.map((day) => (
            <div key={day} className="py-3 flex items-center gap-4">
              <div className="w-28 shrink-0">
                <span className="text-sm font-bold text-card-foreground">{day}</span>
              </div>
              <Toggle
                checked={hours[day].open}
                onChange={(v) => updateDay(day, "open", v)}
              />
              {hours[day].open ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="time"
                    value={hours[day].from}
                    onChange={(e) => updateDay(day, "from", e.target.value)}
                    className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-xs font-bold">to</span>
                  <input
                    type="time"
                    value={hours[day].to}
                    onChange={(e) => updateDay(day, "to", e.target.value)}
                    className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              ) : (
                <span className="text-xs font-bold text-muted-foreground bg-muted border border-border px-3 py-1.5 rounded-lg">
                  Closed
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <SaveBtn
            loading={savingHours}
            saved={savedHours}
            onClick={() => fakeSave(setSavingHours, setSavedHours)}
          />
        </div>
      </Section>

      {/* ── 3. Notification Preferences ───────────────────────────────────────── */}
      <Section
        icon={Bell}
        title="Notification Preferences"
        subtitle="Choose when you want to be notified"
        color="bg-amber-500"
      >
        <div className="space-y-4">
          {(
            [
              { key: "emailOnNewTicket", label: "Email on new repair ticket", sub: "Get notified when a frontdesk agent creates a new ticket" },
              { key: "emailOnPayment", label: "Email on payment received", sub: "Receive confirmation when a payment is recorded" },
              { key: "smsOnReadyForPickup", label: "SMS when device is ready for pickup", sub: "Notify yourself when a ticket is marked Ready" },
              { key: "smsOnOverdue", label: "SMS on overdue tickets", sub: "Daily digest of tickets past their promised date" },
            ] as { key: keyof NotificationPrefs; label: string; sub: string }[]
          ).map(({ key, label, sub }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-card-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              </div>
              <Toggle
                checked={notifs[key]}
                onChange={(v) => setNotifs((p) => ({ ...p, [key]: v }))}
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <SaveBtn
            loading={savingNotifs}
            saved={savedNotifs}
            onClick={() => fakeSave(setSavingNotifs, setSavedNotifs)}
          />
        </div>
      </Section>

      {/* ── 4. Danger Zone ────────────────────────────────────────────────────── */}
      <Section
        icon={ShieldAlert}
        title="Danger Zone"
        subtitle="Irreversible actions — proceed with caution"
        color="bg-destructive"
      >
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-destructive">Deactivate Shop</p>
              <p className="text-xs text-muted-foreground mt-1">
                This will suspend all access for your staff and customers. Data is retained but the
                shop will be unreachable until reactivated by support.
              </p>
            </div>
          </div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Type <span className="text-destructive font-black">DEACTIVATE</span> to confirm
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={dangerConfirm}
              onChange={(e) => {
                setDangerConfirm(e.target.value);
                setDangerError("");
              }}
              placeholder="DEACTIVATE"
              className="flex-1 bg-background border border-destructive/30 rounded-xl px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30 placeholder-muted-foreground"
            />
            <button
              disabled={dangerConfirm !== "DEACTIVATE"}
              onClick={() => {
                if (dangerConfirm !== "DEACTIVATE") {
                  setDangerError("Type DEACTIVATE exactly to proceed.");
                  return;
                }
                // TODO: wire real API call
                setDangerError("⚠ This feature requires backend support. Contact admin.");
              }}
              className="px-5 py-2.5 bg-destructive text-white text-sm font-bold rounded-xl disabled:opacity-40 hover:bg-destructive/90 transition-all active:scale-[0.98] shrink-0"
            >
              Deactivate
            </button>
          </div>
          {dangerError && (
            <p className="text-xs font-semibold text-destructive mt-2">{dangerError}</p>
          )}
        </div>
      </Section>
    </div>
  );
}