"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardShell from "@/components/DashboardShell";
import api from "@/lib/api";
import {
  Settings, Store, Clock, Bell, ShieldAlert,
  Loader2, Save, CheckCircle2, AlertTriangle,
  Phone, MapPin, Link as LinkIcon, ChevronDown,
  Globe, Zap, Users, Calendar, TrendingUp,
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
  "Asia/Karachi", "Asia/Dubai", "Asia/Riyadh",
  "Europe/London", "America/New_York", "America/Chicago", "America/Los_Angeles",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatsCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string; color: string;
}) {
  const gradients: Record<string, string> = {
    violet: "from-violet-500 to-purple-600",
    blue:   "from-blue-500 to-cyan-600",
    emerald:"from-emerald-500 to-green-600",
    amber:  "from-amber-500 to-orange-600",
  };
  return (
    <div className="bg-gradient-to-br from-card to-card/50 border border-border/50 rounded-xl p-4 hover:shadow-lg hover:border-violet-500/30 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradients[color]} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black text-foreground mb-0.5">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, color, children }: {
  icon: any; title: string; subtitle?: string; color: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-br from-card via-card to-card/50 border border-border/50 rounded-2xl overflow-hidden shadow-xl">
      <div className="px-8 py-6 border-b border-border/50 bg-gradient-to-r from-violet-500/5 to-purple-500/5">
        <div className="flex items-center gap-3">
          <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-xl">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 shadow-inner ${
        checked
          ? "bg-gradient-to-r from-violet-500 to-purple-600 focus:ring-violet-500/30 shadow-violet-500/20"
          : "bg-muted-foreground/20 focus:ring-muted-foreground/20"
      }`}
    >
      <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${checked ? "left-7" : "left-0.5"}`} />
    </button>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = "text", hint }: {
  label: string; icon?: any; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="relative group">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-violet-500 pointer-events-none z-10" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl py-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 focus:bg-background transition-all ${Icon ? "pl-11 pr-4" : "px-4"}`}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground/70 pl-0.5">{hint}</p>}
    </div>
  );
}

function SaveBtn({ loading, saved, onClick, label = "Save Changes" }: {
  loading: boolean; saved: boolean; onClick: () => void; label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || saved}
      className={`inline-flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.96] disabled:opacity-60 shadow-lg ${
        saved
          ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-500/30"
          : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:shadow-violet-500/40 shadow-violet-600/30"
      }`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
      {saved ? "Changes Saved!" : loading ? "Saving…" : label}
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
    name: "",
    address: "",
    phone: "",
    logoUrl: "",
    timezone: "Asia/Karachi",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // ── Business Hours state ──
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [savingHours, setSavingHours] = useState(false);
  const [savedHours, setSavedHours] = useState(false);

  // ── Notifications state (client-side only) ──
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

  // ── Analytics stats ──
  const [statsLoading, setStatsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // ── Load shop profile + analytics on mount ──
  const loadData = useCallback(async () => {
    try {
      const [shopRes, analyticsRes] = await Promise.allSettled([
        api.get("/api/shop/profile"),
        api.get("/api/analytics"),
      ]);

      if (shopRes.status === "fulfilled") {
        const shop = shopRes.value.data?.data ?? shopRes.value.data;
        if (shop) {
          setProfile({
            name: shop.name ?? "",
            address: shop.address ?? "",
            phone: shop.phone ?? "",
            logoUrl: shop.logo ?? "",
            timezone: "Asia/Karachi",
          });
          if (shop.openingHours) {
            try {
              const parsed = JSON.parse(shop.openingHours);
              if (typeof parsed === "object" && !Array.isArray(parsed)) setHours(parsed);
            } catch {
              // leave default hours
            }
          }
        }
      }

      if (analyticsRes.status === "fulfilled") {
        setAnalyticsData(analyticsRes.value.data?.data ?? null);
      }
    } catch {
      // keep defaults
    } finally {
      setStatsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Stats derived from analytics ──
  const activeTickets = analyticsData
    ? Object.entries(analyticsData.statusCounts ?? {})
        .filter(([k]) => !["delivered", "cancelled"].includes(k))
        .reduce((s, [, v]) => s + (v as number), 0)
    : null;

  const thisMonthTickets = (analyticsData?.monthly ?? []).length > 0
    ? (analyticsData.monthly[analyticsData.monthly.length - 1]?.tickets ?? 0)
    : null;

  const revenueDisplay = analyticsData
    ? `PKR ${((analyticsData.totalRevenue ?? 0) / 1000).toFixed(1)}K`
    : null;

  // ── Save handlers ──
  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    try {
      await api.patch("/api/shop/profile", {
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        logo: profile.logoUrl,
      });
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 3000);
    } catch (err: any) {
      setProfileError(err?.response?.data?.message ?? "Failed to save. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveHours = async () => {
    setSavingHours(true);
    try {
      await api.patch("/api/shop/profile", { openingHours: JSON.stringify(hours) });
      setSavedHours(true);
      setTimeout(() => setSavedHours(false), 3000);
    } catch {
      // silent
    } finally {
      setSavingHours(false);
    }
  };

  const saveNotifs = () => {
    setSavingNotifs(true);
    setTimeout(() => {
      setSavingNotifs(false);
      setSavedNotifs(true);
      setTimeout(() => setSavedNotifs(false), 3000);
    }, 800);
  };

  const updateDay = (day: string, key: keyof DayHours, value: any) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [key]: value } }));
  };

  return (
    <div className="-mx-6 -my-6 px-6 py-6 min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-[2000px] mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-600/30 ring-4 ring-violet-500/10">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-foreground tracking-tight">Shop Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your tenant configuration and preferences</p>
            </div>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              icon={Users}
              label="Active Staff"
              value={statsLoading ? "…" : String(analyticsData?.staffCount ?? "—")}
              color="violet"
            />
            <StatsCard
              icon={Zap}
              label="Open Tickets"
              value={statsLoading ? "…" : String(activeTickets ?? "—")}
              color="blue"
            />
            <StatsCard
              icon={Calendar}
              label="This Month"
              value={statsLoading ? "…" : String(thisMonthTickets ?? "—")}
              color="emerald"
            />
            <StatsCard
              icon={TrendingUp}
              label="Revenue"
              value={statsLoading ? "…" : (revenueDisplay ?? "—")}
              color="amber"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1fr] gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* ── 1. Shop Profile ───────────────────────────────────────────── */}
            <Section
              icon={Store}
              title="Shop Profile"
              subtitle="Basic info shown to customers and staff"
              color="bg-gradient-to-br from-blue-500 to-cyan-600"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-5">
                  <Field
                    label="Shop Name"
                    icon={Store}
                    value={profile.name}
                    onChange={(v) => setProfile((p) => ({ ...p, name: v }))}
                    placeholder="e.g. Clicktake Repair Center"
                  />
                  <Field
                    label="Address"
                    icon={MapPin}
                    value={profile.address}
                    onChange={(v) => setProfile((p) => ({ ...p, address: v }))}
                    placeholder="Street, City, Country"
                  />
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
                    placeholder="https://…"
                    hint="Recommended: 200x200px PNG with transparent background"
                  />
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Timezone</label>
                    <div className="relative group">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 transition-colors group-focus-within:text-violet-500 pointer-events-none z-10" />
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                        className="w-full appearance-none bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl pl-11 pr-10 py-3.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 focus:bg-background transition-all"
                      >
                        {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {profile.logoUrl && (
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="w-16 h-16 rounded-xl border-2 border-border/50 bg-background flex items-center justify-center overflow-hidden">
                      <img
                        src={profile.logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%23ddd'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Logo Preview</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This will appear on invoices and receipts</p>
                    </div>
                  </div>
                )}

                {profileError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs font-semibold text-red-500">{profileError}</p>
                  </div>
                )}

                <div className="pt-2 flex justify-end border-t border-border/50">
                  <SaveBtn loading={savingProfile} saved={savedProfile} onClick={saveProfile} />
                </div>
              </div>
            </Section>

            {/* ── 3. Notification Preferences ──────────────────────────────── */}
            <Section
              icon={Bell}
              title="Notification Preferences"
              subtitle="Choose when you want to be notified"
              color="bg-gradient-to-br from-amber-500 to-orange-600"
            >
              <div className="space-y-1">
                <div className="bg-muted/30 rounded-xl px-5 border border-border/50">
                  {(
                    [
                      { key: "emailOnNewTicket",   label: "Email on new repair ticket",  sub: "Get notified when a frontdesk agent creates a new ticket" },
                      { key: "emailOnPayment",      label: "Email on payment received",   sub: "Receive confirmation when a payment is recorded" },
                      { key: "smsOnReadyForPickup", label: "SMS when device is ready",    sub: "Notify yourself when a ticket is marked Ready" },
                      { key: "smsOnOverdue",        label: "SMS on overdue tickets",      sub: "Daily digest of tickets past their promised date" },
                    ] as { key: keyof NotificationPrefs; label: string; sub: string }[]
                  ).map(({ key, label, sub }) => (
                    <div key={key} className="flex items-center justify-between gap-6 py-4 border-b border-border/50 last:border-0 group hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground group-hover:text-violet-500 transition-colors">{label}</p>
                        <p className="text-xs text-muted-foreground/80 mt-1">{sub}</p>
                      </div>
                      <Toggle checked={notifs[key]} onChange={(v) => setNotifs((p) => ({ ...p, [key]: v }))} />
                    </div>
                  ))}
                </div>
                <div className="pt-6 flex justify-end border-t border-border/50 mt-6">
                  <SaveBtn loading={savingNotifs} saved={savedNotifs} onClick={saveNotifs} />
                </div>
              </div>
            </Section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* ── 2. Business Hours ──────────────────────────────────────────── */}
            <Section
              icon={Clock}
              title="Business Hours"
              subtitle="Set when your shop is open for walk-ins and pickups"
              color="bg-gradient-to-br from-emerald-500 to-green-600"
            >
              <div className="space-y-2">
                <div className="bg-muted/30 rounded-xl px-4 py-2 border border-border/50">
                  {DAYS.map((day) => (
                    <div key={day} className="py-3 flex items-center gap-4 border-b border-border/50 last:border-0">
                      <div className="w-24 shrink-0">
                        <span className="text-sm font-bold text-card-foreground">{day.slice(0, 3)}</span>
                      </div>
                      <Toggle checked={hours[day].open} onChange={(v) => updateDay(day, "open", v)} />
                      {hours[day].open ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1">
                          <input
                            type="time"
                            value={hours[day].from}
                            onChange={(e) => updateDay(day, "from", e.target.value)}
                            className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 flex-1"
                          />
                          <span className="text-xs font-bold text-muted-foreground">to</span>
                          <input
                            type="time"
                            value={hours[day].to}
                            onChange={(e) => updateDay(day, "to", e.target.value)}
                            className="bg-background/50 border border-border/50 rounded-lg px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 flex-1"
                          />
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground bg-muted/50 border border-border/50 px-3 py-2 rounded-lg">
                          Closed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="pt-6 flex justify-end border-t border-border/50 mt-6">
                  <SaveBtn loading={savingHours} saved={savedHours} onClick={saveHours} />
                </div>
              </div>
            </Section>

            {/* ── 4. Danger Zone ────────────────────────────────────────────── */}
            <Section
              icon={ShieldAlert}
              title="Danger Zone"
              subtitle="Irreversible actions — proceed with caution"
              color="bg-gradient-to-br from-red-500 to-red-600"
            >
              <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-xl p-6 shadow-lg shadow-red-500/10">
                <div className="flex items-start gap-3 mb-5">
                  <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-base font-bold text-red-500">Deactivate Shop</p>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      This will suspend all access for your staff and customers. Data is retained but the
                      shop will be unreachable until reactivated by support.
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Type <span className="text-red-500 font-black">DEACTIVATE</span> to confirm
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={dangerConfirm}
                      onChange={(e) => { setDangerConfirm(e.target.value); setDangerError(""); }}
                      placeholder="DEACTIVATE"
                      className="flex-1 bg-background/50 border-2 border-red-500/30 rounded-xl px-4 py-3 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30 placeholder-muted-foreground/40"
                    />
                    <button
                      disabled={dangerConfirm !== "DEACTIVATE"}
                      onClick={() => {
                        if (dangerConfirm !== "DEACTIVATE") {
                          setDangerError("Type DEACTIVATE exactly to proceed.");
                          return;
                        }
                        setDangerError("⚠ This feature requires backend support. Contact admin.");
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold rounded-xl disabled:opacity-40 hover:shadow-red-500/40 shadow-lg transition-all active:scale-[0.96] shrink-0"
                    >
                      Deactivate
                    </button>
                  </div>
                  {dangerError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <p className="text-xs font-semibold text-red-500">{dangerError}</p>
                    </div>
                  )}
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
