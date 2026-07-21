"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";
import api from "@/lib/api";
import {
  Settings, Store, Clock, Bell, ShieldAlert,
  Loader2, Save, CheckCircle2, AlertTriangle,
  Phone, MapPin, ChevronDown,
  Globe, Zap, Users, Calendar, TrendingUp, Satellite,
  FileText, UserX, CreditCard, Wallet, KeyRound,
  Upload, Trash2, Plus, Link2, Link as LinkIcon, Image as ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopProfile {
  name: string;
  phone: string;
  timezone: string;
}

interface PublicProfile {
  tagline: string;
  description: string;
  address: string;
  city: string;
  postcode: string;
  logo: string;
  bannerUrl: string;
  facebook: string;
  instagram: string;
  youtube: string;
  isPubliclyVisible: boolean;
  showReviewsPublicly: boolean;
}

interface TeamMember {
  name: string;
  title: string;
  photoUrl: string;
  bio: string;
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

const EMPTY_TEAM_MEMBER: TeamMember = { name: "", title: "", photoUrl: "", bio: "" };

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

// Accordion row — header is a click target; content only renders while open, so
// nothing else on the page needs to change to support collapse/expand (all form
// state already lives in SettingsContent, not inside Section itself).
function Section({ icon: Icon, title, subtitle, color, children, open, onToggle }: {
  icon: any; title: string; subtitle?: string; color: string; children: React.ReactNode;
  open: boolean; onToggle: () => void;
}) {
  return (
    <div className="bg-gradient-to-br from-card via-card to-card/50 border border-border/50 rounded-2xl overflow-hidden shadow-xl">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-8 py-6 flex items-center justify-between gap-3 bg-gradient-to-r from-violet-500/5 to-purple-500/5 hover:from-violet-500/10 hover:to-purple-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center shadow-lg shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-xl">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground/70 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-8 border-t border-border/50">{children}</div>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-14 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 shadow-inner ${
        checked
          ? "bg-gradient-to-r from-violet-500 to-purple-600 focus:ring-violet-500/30 shadow-violet-500/20"
          : "bg-muted-foreground/20 focus:ring-muted-foreground/20"
      }`}
    >
      <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${checked ? "left-7" : "left-0.5"}`} />
    </button>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = "text", hint, isTextarea = false }: {
  label: string; icon?: any; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string; isTextarea?: boolean;
}) {
  if (isTextarea) {
    return (
      <div className="space-y-2">
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl py-3 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 focus:bg-background transition-all resize-none"
        />
        {hint && <p className="text-xs text-muted-foreground/70 pl-0.5">{hint}</p>}
      </div>
    );
  }

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

// Tenant-scoped image upload (logo / banner / team photo) — mirrors the platform-level
// ImageUploadField in super-admin settings, pointed at /api/tenant/branding/upload.
function ImageUploadField({ label, url, onUploaded, uploadField, hint }: {
  label: string; url: string; onUploaded: (url: string) => void; uploadField: string; hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("field", uploadField);
      const res = await api.post("/api/tenant/branding/upload", form, { headers: { "Content-Type": undefined } });
      onUploaded(res.data?.data?.url ?? "");
    } catch (err: any) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {url ? <img src={url} alt={label} className="w-full h-full object-cover" /> : <ImageIcon size={18} className="text-muted-foreground" />}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 disabled:opacity-60 transition-all"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Uploading…" : "Upload from computer"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
      {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
      {error && <p className="text-xs text-destructive font-semibold">{error}</p>}
    </div>
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
  // ── Accordion state — only one section open at a time ──
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (key: string) => setOpenSection((cur) => (cur === key ? null : key));

  // ── Public Shop Profile state ──
  const [publicProfile, setPublicProfile] = useState<PublicProfile>({
    tagline: "", description: "", address: "", city: "", postcode: "",
    logo: "", bannerUrl: "", facebook: "", instagram: "", youtube: "",
    isPubliclyVisible: false, showReviewsPublicly: true,
  });
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [savingPublic, setSavingPublic] = useState(false);
  const [savedPublic, setSavedPublic] = useState(false);
  const [publicError, setPublicError] = useState("");

  // ── Shop Profile state ──
  const [profile, setProfile] = useState<ShopProfile>({
    name: "",
    phone: "",
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
  const [notifsError, setNotifsError] = useState("");

  // ── Shop Bio state (shop-customization, shown in the customer portal) ──
  const [bio, setBio] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [savedBio, setSavedBio] = useState(false);

  // ── Home Tab Widgets state (shop-customization) ──
  const [homeWidgets, setHomeWidgets] = useState({
    shopIdCard: true,
    moduleShortcuts: true,
    teamTable: true,
    lowStockBadge: true,
  });
  const [savingWidgets, setSavingWidgets] = useState(false);
  const [savedWidgets, setSavedWidgets] = useState(false);

  // ── Customer Portal Tab Control state (shop-customization) ──
  const [customerPortal, setCustomerPortal] = useState({
    showReviews: true,
    showDelivery: true,
    showEstimates: true,
  });
  const [savingPortal, setSavingPortal] = useState(false);
  const [savedPortal, setSavedPortal] = useState(false);

  // ── Payment Gateway (EasyPaisa) state ──
  const [pgEnabled, setPgEnabled] = useState(false);
  const [pgStoreId, setPgStoreId] = useState("");
  const [pgHashKey, setPgHashKey] = useState("");
  const [pgUsername, setPgUsername] = useState("");
  const [pgPassword, setPgPassword] = useState("");
  const [pgEnvironment, setPgEnvironment] = useState("uat");
  const [pgHasHashKey, setPgHasHashKey] = useState(false);
  const [pgHasUsername, setPgHasUsername] = useState(false);
  const [pgHasPassword, setPgHasPassword] = useState(false);
  const [savingPg, setSavingPg] = useState(false);
  const [savedPg, setSavedPg] = useState(false);
  const [pgError, setPgError] = useState("");

  // ── Payment Gateway (JazzCash) state ──
  const [jcEnabled, setJcEnabled] = useState(false);
  const [jcMerchantId, setJcMerchantId] = useState("");
  const [jcPassword, setJcPassword] = useState("");
  const [jcIntegritySalt, setJcIntegritySalt] = useState("");
  const [jcEnvironment, setJcEnvironment] = useState("uat");
  const [jcHasPassword, setJcHasPassword] = useState(false);
  const [jcHasIntegritySalt, setJcHasIntegritySalt] = useState(false);
  const [savingJc, setSavingJc] = useState(false);
  const [savedJc, setSavedJc] = useState(false);
  const [jcError, setJcError] = useState("");

  // ── Payment Gateway (Stripe) state ──
  const [spEnabled, setSpEnabled] = useState(false);
  const [spSecretKey, setSpSecretKey] = useState("");
  const [spPublishableKey, setSpPublishableKey] = useState("");
  const [spWebhookSecret, setSpWebhookSecret] = useState("");
  const [spHasSecretKey, setSpHasSecretKey] = useState(false);
  const [spHasWebhookSecret, setSpHasWebhookSecret] = useState(false);
  const [savingSp, setSavingSp] = useState(false);
  const [savedSp, setSavedSp] = useState(false);
  const [spError, setSpError] = useState("");

  // ── Payment Gateway (PayPal) state ──
  const [ppEnabled, setPpEnabled] = useState(false);
  const [ppClientId, setPpClientId] = useState("");
  const [ppClientSecret, setPpClientSecret] = useState("");
  const [ppMode, setPpMode] = useState("sandbox");
  const [ppHasClientId, setPpHasClientId] = useState(false);
  const [ppHasClientSecret, setPpHasClientSecret] = useState(false);
  const [savingPp, setSavingPp] = useState(false);
  const [savedPp, setSavedPp] = useState(false);
  const [ppError, setPpError] = useState("");

  // ── Billing & Subscription state ──
  const [subscription, setSubscription] = useState<any>(null);
  const [payingNow, setPayingNow] = useState(false);
  const [payError, setPayError] = useState("");
  const [payInfo, setPayInfo] = useState("");

  // ── Change Password ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [changedPw,  setChangedPw]  = useState(false);
  const [pwError,    setPwError]    = useState("");

  // ── Danger Zone ──
  const [dangerConfirm, setDangerConfirm] = useState("");
  const [dangerError, setDangerError] = useState("");

  // ── GPS (Module: Global GPS) — precise shop coordinates for nearby search ──
  const [gpsState, setGpsState] = useState<"idle" | "locating" | "saving" | "done" | "error">("idle");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState("");

  // ── Analytics stats ──
  const [statsLoading, setStatsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // ── Load shop profile + analytics on mount ──
  const loadData = useCallback(async () => {
    try {
      const [shopRes, analyticsRes, brandingRes, paymentConfigRes, subscriptionRes] = await Promise.allSettled([
        api.get("/api/shop/profile"),
        api.get("/api/analytics"),
        api.get("/api/tenant/branding"),
        api.get("/api/tenant/payment-config"),
        api.get("/api/subscriptions/me"),
      ]);

      if (shopRes.status === "fulfilled") {
        const shop = shopRes.value.data?.data ?? shopRes.value.data;
        if (shop) {
          setProfile({
            name: shop.name ?? "",
            phone: shop.phone ?? "",
            timezone: "Asia/Karachi",
          });
          setPublicProfile({
            tagline: shop.tagline ?? "",
            description: shop.description ?? "",
            address: shop.address ?? "",
            city: shop.city ?? "",
            postcode: shop.postcode ?? "",
            logo: shop.logo ?? "",
            bannerUrl: shop.bannerUrl ?? "",
            facebook: shop.socialLinks?.facebook ?? "",
            instagram: shop.socialLinks?.instagram ?? "",
            youtube: shop.socialLinks?.youtube ?? "",
            isPubliclyVisible: shop.isPubliclyVisible ?? false,
            showReviewsPublicly: shop.showReviewsPublicly ?? true,
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

      if (brandingRes.status === "fulfilled") {
        const b = brandingRes.value.data?.data?.branding;
        const t = brandingRes.value.data?.data?.team;
        if (b) {
          setBio(b.bio ?? "");
          if (b.homeWidgets) {
            setHomeWidgets({
              shopIdCard: b.homeWidgets.shopIdCard ?? true,
              moduleShortcuts: b.homeWidgets.moduleShortcuts ?? true,
              teamTable: b.homeWidgets.teamTable ?? true,
              lowStockBadge: b.homeWidgets.lowStockBadge ?? true,
            });
          }
          if (b.customerPortal) {
            setCustomerPortal({
              showReviews: b.customerPortal.showReviews ?? true,
              showDelivery: b.customerPortal.showDelivery ?? true,
              showEstimates: b.customerPortal.showEstimates ?? true,
            });
          }
          if (b.notificationPrefs) {
            setNotifs({
              emailOnNewTicket: b.notificationPrefs.emailOnNewTicket ?? true,
              emailOnPayment: b.notificationPrefs.emailOnPayment ?? true,
              smsOnReadyForPickup: b.notificationPrefs.smsOnReadyForPickup ?? false,
              smsOnOverdue: b.notificationPrefs.smsOnOverdue ?? false,
            });
          }
        }
        if (Array.isArray(t)) setTeam(t);
      }
      if (paymentConfigRes.status === "fulfilled") {
        const pc = paymentConfigRes.value.data?.data;
        if (pc?.easypaisa) {
          setPgEnabled(pc.easypaisa.enabled ?? false);
          setPgStoreId(pc.easypaisa.storeId ?? "");
          setPgEnvironment(pc.easypaisa.environment ?? "uat");
          setPgHasHashKey(pc.easypaisa.hasHashKey ?? false);
          setPgHasUsername(pc.easypaisa.hasUsername ?? false);
          setPgHasPassword(pc.easypaisa.hasPassword ?? false);
        }
        if (pc?.jazzcash) {
          setJcEnabled(pc.jazzcash.enabled ?? false);
          setJcMerchantId(pc.jazzcash.merchantId ?? "");
          setJcEnvironment(pc.jazzcash.environment ?? "uat");
          setJcHasPassword(pc.jazzcash.hasPassword ?? false);
          setJcHasIntegritySalt(pc.jazzcash.hasIntegritySalt ?? false);
        }
        if (pc?.stripe) {
          setSpEnabled(pc.stripe.enabled ?? false);
          setSpPublishableKey(pc.stripe.publishableKey ?? "");
          setSpHasSecretKey(pc.stripe.hasSecretKey ?? false);
          setSpHasWebhookSecret(pc.stripe.hasWebhookSecret ?? false);
        }
        if (pc?.paypal) {
          setPpEnabled(pc.paypal.enabled ?? false);
          setPpMode(pc.paypal.mode ?? "sandbox");
          setPpHasClientId(pc.paypal.hasClientId ?? false);
          setPpHasClientSecret(pc.paypal.hasClientSecret ?? false);
        }
      }

      if (subscriptionRes.status === "fulfilled") {
        setSubscription(subscriptionRes.value.data?.data ?? null);
      }
    } catch {
      // keep defaults
    } finally {
      setStatsLoading(false);
    }
  }, []);

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
  const savePublicProfile = async () => {
    setSavingPublic(true);
    setPublicError("");
    try {
      await api.patch("/api/shop/profile", {
        tagline: publicProfile.tagline,
        description: publicProfile.description,
        address: publicProfile.address,
        city: publicProfile.city,
        postcode: publicProfile.postcode,
        logo: publicProfile.logo,
        bannerUrl: publicProfile.bannerUrl,
        socialLinks: {
          facebook: publicProfile.facebook,
          instagram: publicProfile.instagram,
          youtube: publicProfile.youtube,
        },
        isPubliclyVisible: publicProfile.isPubliclyVisible,
        showReviewsPublicly: publicProfile.showReviewsPublicly,
      });
      await api.patch("/api/tenant/branding", { team });
      setSavedPublic(true);
      setTimeout(() => setSavedPublic(false), 3000);
    } catch (err: any) {
      setPublicError(err?.response?.data?.message ?? "Failed to save. Please try again.");
    } finally {
      setSavingPublic(false);
    }
  };

  const addTeamMember = () => setTeam((t) => [...t, { ...EMPTY_TEAM_MEMBER }]);
  const removeTeamMember = (i: number) => setTeam((t) => t.filter((_, idx) => idx !== i));
  const updateTeamMember = (i: number, key: keyof TeamMember, value: string) =>
    setTeam((t) => t.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    try {
      await api.patch("/api/shop/profile", {
        name: profile.name,
        phone: profile.phone,
      });
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 3000);
    } catch (err: any) {
      setProfileError(err?.response?.data?.message ?? "Failed to save. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── GPS (Module: Global GPS) — capture precise shop coordinates ────────────
  // Lets the shop appear correctly in "nearby shops" search worldwide,
  // regardless of how the free-text address field is written.
  const captureShopLocation = () => {
    if (!navigator.geolocation) {
      setGpsState("error");
      setGpsError("GPS is not supported on this device/browser.");
      return;
    }
    setGpsState("locating");
    setGpsError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        setGpsState("saving");
        try {
          await api.patch("/api/shop/profile", { lat: latitude, lng: longitude });
          setGpsState("done");
          setTimeout(() => setGpsState("idle"), 4000);
        } catch {
          setGpsState("error");
          setGpsError("Location captured but failed to save. Please try again.");
        }
      },
      (err) => {
        setGpsState("error");
        setGpsError(err.message || "Unable to get your location.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
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

  const saveBio = async () => {
    setSavingBio(true);
    try {
      await api.patch("/api/tenant/branding", { bio });
      setSavedBio(true);
      setTimeout(() => setSavedBio(false), 3000);
    } catch {
      // silent
    } finally {
      setSavingBio(false);
    }
  };

  const saveWidgets = async () => {
    setSavingWidgets(true);
    try {
      await api.patch("/api/tenant/branding", { homeWidgets });
      setSavedWidgets(true);
      setTimeout(() => setSavedWidgets(false), 3000);
    } catch {
      // silent
    } finally {
      setSavingWidgets(false);
    }
  };

  const saveCustomerPortal = async () => {
    setSavingPortal(true);
    try {
      await api.patch("/api/tenant/branding", { customerPortal });
      setSavedPortal(true);
      setTimeout(() => setSavedPortal(false), 3000);
    } catch {
      // silent
    } finally {
      setSavingPortal(false);
    }
  };

  const savePaymentConfig = async () => {
    setSavingPg(true);
    setPgError("");
    try {
      const res = await api.patch("/api/tenant/payment-config", {
        gateway: "easypaisa",
        enabled: pgEnabled,
        storeId: pgStoreId,
        environment: pgEnvironment,
        ...(pgHashKey ? { hashKey: pgHashKey } : {}),
        ...(pgUsername ? { username: pgUsername } : {}),
        ...(pgPassword ? { password: pgPassword } : {}),
      });
      const pc = res.data?.data;
      if (pc) {
        setPgHasHashKey(pc.hasHashKey ?? pgHasHashKey);
        setPgHasUsername(pc.hasUsername ?? pgHasUsername);
        setPgHasPassword(pc.hasPassword ?? pgHasPassword);
      }
      setPgHashKey(""); setPgUsername(""); setPgPassword("");
      setSavedPg(true);
      setTimeout(() => setSavedPg(false), 3000);
    } catch (err: any) {
      setPgError(err?.response?.data?.message ?? "Failed to save payment gateway settings.");
    } finally {
      setSavingPg(false);
    }
  };

  const saveJazzcashConfig = async () => {
    setSavingJc(true);
    setJcError("");
    try {
      const res = await api.patch("/api/tenant/payment-config", {
        gateway: "jazzcash",
        enabled: jcEnabled,
        merchantId: jcMerchantId,
        environment: jcEnvironment,
        ...(jcPassword ? { password: jcPassword } : {}),
        ...(jcIntegritySalt ? { integritySalt: jcIntegritySalt } : {}),
      });
      const pc = res.data?.data;
      if (pc) {
        setJcHasPassword(pc.hasPassword ?? jcHasPassword);
        setJcHasIntegritySalt(pc.hasIntegritySalt ?? jcHasIntegritySalt);
      }
      setJcPassword(""); setJcIntegritySalt("");
      setSavedJc(true);
      setTimeout(() => setSavedJc(false), 3000);
    } catch (err: any) {
      setJcError(err?.response?.data?.message ?? "Failed to save payment gateway settings.");
    } finally {
      setSavingJc(false);
    }
  };

  const saveStripeConfig = async () => {
    setSavingSp(true);
    setSpError("");
    try {
      const res = await api.patch("/api/tenant/payment-config", {
        gateway: "stripe",
        enabled: spEnabled,
        publishableKey: spPublishableKey,
        ...(spSecretKey ? { secretKey: spSecretKey } : {}),
        ...(spWebhookSecret ? { webhookSecret: spWebhookSecret } : {}),
      });
      const pc = res.data?.data;
      if (pc) {
        setSpHasSecretKey(pc.hasSecretKey ?? spHasSecretKey);
        setSpHasWebhookSecret(pc.hasWebhookSecret ?? spHasWebhookSecret);
      }
      setSpSecretKey(""); setSpWebhookSecret("");
      setSavedSp(true);
      setTimeout(() => setSavedSp(false), 3000);
    } catch (err: any) {
      setSpError(err?.response?.data?.message ?? "Failed to save payment gateway settings.");
    } finally {
      setSavingSp(false);
    }
  };

  const savePaypalConfig = async () => {
    setSavingPp(true);
    setPpError("");
    try {
      const res = await api.patch("/api/tenant/payment-config", {
        gateway: "paypal",
        enabled: ppEnabled,
        mode: ppMode,
        ...(ppClientId ? { clientId: ppClientId } : {}),
        ...(ppClientSecret ? { clientSecret: ppClientSecret } : {}),
      });
      const pc = res.data?.data;
      if (pc) {
        setPpHasClientId(pc.hasClientId ?? ppHasClientId);
        setPpHasClientSecret(pc.hasClientSecret ?? ppHasClientSecret);
      }
      setPpClientId(""); setPpClientSecret("");
      setSavedPp(true);
      setTimeout(() => setSavedPp(false), 3000);
    } catch (err: any) {
      setPpError(err?.response?.data?.message ?? "Failed to save payment gateway settings.");
    } finally {
      setSavingPp(false);
    }
  };

  const payNow = async (gateway: "easypaisa" | "jazzcash" | "stripe" | "paypal") => {
    setPayingNow(true);
    setPayError("");
    setPayInfo("");
    try {
      const res = await api.post("/api/subscriptions/pay", { gateway });
      const data = res.data?.data;
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setPayInfo(data?.responseDesc || "Payment initiated — follow the instructions in your payment app to complete it.");
      }
    } catch (err: any) {
      setPayError(err?.response?.data?.message ?? "Could not start payment. Please try again.");
    } finally {
      setPayingNow(false);
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
      setPwError(err?.response?.data?.message ?? "Failed to change password.");
    } finally {
      setChangingPw(false);
    }
  };

  const saveNotifs = async () => {
    setSavingNotifs(true);
    setNotifsError("");
    try {
      await api.patch("/api/tenant/branding", { notificationPrefs: notifs });
      setSavedNotifs(true);
      setTimeout(() => setSavedNotifs(false), 3000);
    } catch (err: any) {
      setNotifsError(err?.response?.data?.message ?? "Failed to save. Please try again.");
    } finally {
      setSavingNotifs(false);
    }
  };

  const updateDay = (day: string, key: keyof DayHours, value: any) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], [key]: value } }));
  };

  return (
    <div className="-mx-6 -my-6 px-6 py-6 min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-600/30 ring-4 ring-violet-500/10">
              <Settings className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-foreground tracking-tight">Shop Settings</h1>
              <p className="text-sm text-muted-foreground mt-1">Click a section below to expand it</p>
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

        <div className="space-y-4">
          {/* ── Public Shop Profile ──────────────────────────────────────── */}
          <Section
            icon={Globe}
            title="Public Shop Profile"
            subtitle="What customers see when they find your shop"
            color="bg-gradient-to-br from-indigo-500 to-blue-600"
            open={openSection === "publicProfile"}
            onToggle={() => toggleSection("publicProfile")}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-6 p-4 bg-muted/30 rounded-xl border border-border/50">
                <div>
                  <p className="text-sm font-bold text-foreground">Make my shop publicly visible</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When on, customers can find your shop page and it appears in the homepage directory. When off, your shop page is hidden entirely.
                  </p>
                </div>
                <Toggle
                  checked={publicProfile.isPubliclyVisible}
                  onChange={(v) => setPublicProfile((p) => ({ ...p, isPubliclyVisible: v }))}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <ImageUploadField
                  label="Logo" url={publicProfile.logo} uploadField="logo"
                  onUploaded={(url) => setPublicProfile((p) => ({ ...p, logo: url }))}
                  hint="Square image recommended"
                />
                <ImageUploadField
                  label="Banner" url={publicProfile.bannerUrl} uploadField="bannerUrl"
                  onUploaded={(url) => setPublicProfile((p) => ({ ...p, bannerUrl: url }))}
                  hint="Wide image, shown behind your shop name"
                />
              </div>

              <Field
                label="Tagline" value={publicProfile.tagline}
                onChange={(v) => setPublicProfile((p) => ({ ...p, tagline: v }))}
                placeholder="e.g. Lahore's fastest phone & laptop repairs"
              />
              <Field
                label="Description" isTextarea value={publicProfile.description}
                onChange={(v) => setPublicProfile((p) => ({ ...p, description: v }))}
                placeholder="Tell visitors about your shop, experience, and specialties…"
                hint={'Shown as "About this shop" on your public page'}
              />

              <div className="grid sm:grid-cols-3 gap-5">
                <Field label="Address" icon={MapPin} value={publicProfile.address} onChange={(v) => setPublicProfile((p) => ({ ...p, address: v }))} placeholder="Street address" />
                <Field label="City" value={publicProfile.city} onChange={(v) => setPublicProfile((p) => ({ ...p, city: v }))} placeholder="e.g. Lahore" />
                <Field label="Postcode" value={publicProfile.postcode} onChange={(v) => setPublicProfile((p) => ({ ...p, postcode: v }))} placeholder="e.g. 54000" />
              </div>

              {/* ── GPS (Module: Global GPS) — precise pin for "Nearby Shops" search ── */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-muted/30 border border-border/50 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Satellite size={14} className="flex-shrink-0" />
                  {gpsState === "done" && gpsCoords ? (
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Location saved ({gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}) — you'll now show up in nearby search
                    </span>
                  ) : gpsError ? (
                    <span className="font-medium text-amber-700 dark:text-amber-400">{gpsError}</span>
                  ) : (
                    <span>Set your exact pin so customers anywhere can find you via "Nearby Shops"</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={captureShopLocation}
                  disabled={gpsState === "locating" || gpsState === "saving"}
                  className="flex items-center gap-2 px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-bold rounded-lg text-xs transition-all disabled:opacity-60 flex-shrink-0"
                >
                  {gpsState === "locating" || gpsState === "saving" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Satellite size={14} />
                  )}
                  {gpsState === "locating" ? "Locating…" : gpsState === "saving" ? "Saving…" : "Use my current location"}
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Social Links</p>
                <div className="grid sm:grid-cols-3 gap-5">
                  <Field label="Facebook" icon={Link2} value={publicProfile.facebook} onChange={(v) => setPublicProfile((p) => ({ ...p, facebook: v }))} placeholder="https://facebook.com/…" />
                  <Field label="Instagram" icon={Link2} value={publicProfile.instagram} onChange={(v) => setPublicProfile((p) => ({ ...p, instagram: v }))} placeholder="https://instagram.com/…" />
                  <Field label="YouTube" icon={Link2} value={publicProfile.youtube} onChange={(v) => setPublicProfile((p) => ({ ...p, youtube: v }))} placeholder="https://youtube.com/@…" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-6 py-2 border-t border-border/50 pt-5">
                <div>
                  <p className="text-sm font-semibold text-foreground">Show customer reviews on my public page</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Displays your most recent public reviews to visitors</p>
                </div>
                <Toggle
                  checked={publicProfile.showReviewsPublicly}
                  onChange={(v) => setPublicProfile((p) => ({ ...p, showReviewsPublicly: v }))}
                />
              </div>

              <div className="space-y-3 border-t border-border/50 pt-5">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Team</p>
                {team.map((member, i) => (
                  <div key={i} className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-full border border-border/50 bg-background flex items-center justify-center overflow-hidden shrink-0">
                        {member.photoUrl ? (
                          <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 grid sm:grid-cols-2 gap-3">
                        <input
                          value={member.name} onChange={(e) => updateTeamMember(i, "name", e.target.value)}
                          placeholder="Name" className="bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                        <input
                          value={member.title} onChange={(e) => updateTeamMember(i, "title", e.target.value)}
                          placeholder="Title / role" className="bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                      </div>
                      <button
                        type="button" onClick={() => removeTeamMember(i)}
                        className="p-2.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors shrink-0"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <textarea
                      value={member.bio} onChange={(e) => updateTeamMember(i, "bio", e.target.value)}
                      placeholder="Short bio (optional)" rows={2}
                      className="w-full bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                    <ImageUploadField
                      label="Photo" url={member.photoUrl} uploadField="teamPhoto"
                      onUploaded={(url) => updateTeamMember(i, "photoUrl", url)}
                    />
                  </div>
                ))}
                <button
                  type="button" onClick={addTeamMember}
                  className="flex items-center gap-2 px-4 py-2.5 bg-muted text-foreground font-bold rounded-xl text-sm hover:bg-muted/70 transition-all"
                >
                  <Plus size={14} /> Add team member
                </button>
              </div>

              {publicError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-500">{publicError}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-border/50">
                <SaveBtn loading={savingPublic} saved={savedPublic} onClick={savePublicProfile} />
              </div>
            </div>
          </Section>

          {/* ── Shop Profile ─────────────────────────────────────────────── */}
          <Section
            icon={Store}
            title="Shop Profile"
            subtitle="Internal info used for invoices and receipts"
            color="bg-gradient-to-br from-blue-500 to-cyan-600"
            open={openSection === "shopProfile"}
            onToggle={() => toggleSection("shopProfile")}
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
                  label="Phone Number"
                  icon={Phone}
                  value={profile.phone}
                  onChange={(v) => setProfile((p) => ({ ...p, phone: v }))}
                  placeholder="+92 300 0000000"
                />
                <div className="space-y-3">
                  <Field
                    label="Shop Bio"
                    icon={FileText}
                    value={bio}
                    onChange={setBio}
                    placeholder="Tell customers about your shop, services, expertise…"
                    isTextarea
                    hint="Shown to logged-in customers in their portal"
                  />
                  <div className="flex justify-end">
                    <SaveBtn loading={savingBio} saved={savedBio} onClick={saveBio} label="Save Bio" />
                  </div>
                </div>
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

          {/* ── Business Hours ───────────────────────────────────────────── */}
          <Section
            icon={Clock}
            title="Business Hours"
            subtitle="Set when your shop is open for walk-ins and pickups"
            color="bg-gradient-to-br from-emerald-500 to-green-600"
            open={openSection === "hours"}
            onToggle={() => toggleSection("hours")}
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

          {/* ── Notification Preferences ─────────────────────────────────── */}
          <Section
            icon={Bell}
            title="Notification Preferences"
            subtitle="Choose when you want to be notified"
            color="bg-gradient-to-br from-amber-500 to-orange-600"
            open={openSection === "notifs"}
            onToggle={() => toggleSection("notifs")}
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
              {notifsError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-500">{notifsError}</p>
                </div>
              )}
              <div className="pt-6 flex justify-end border-t border-border/50 mt-6">
                <SaveBtn loading={savingNotifs} saved={savedNotifs} onClick={saveNotifs} />
              </div>
            </div>
          </Section>

          {/* ── Home Tab Widgets ─────────────────────────────────────────── */}
          <Section
            icon={Calendar}
            title="Home Tab Widgets"
            subtitle="Control what shows on your dashboard"
            color="bg-gradient-to-br from-cyan-500 to-blue-600"
            open={openSection === "widgets"}
            onToggle={() => toggleSection("widgets")}
          >
            <div className="space-y-2">
              <div className="bg-muted/30 rounded-xl px-5 border border-border/50">
                {[
                  { key: "shopIdCard", label: "Shop ID Card", desc: "Shareable shop ID for staff registration" },
                  { key: "moduleShortcuts", label: "Module Shortcuts", desc: "Quick access grid to all modules" },
                  { key: "teamTable", label: "Team Members Table", desc: "Live list of your staff members" },
                  { key: "lowStockBadge", label: "Low Stock Badge", desc: "Inventory warning on modules" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start justify-between gap-4 py-4 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>
                    <Toggle
                      checked={homeWidgets[key as keyof typeof homeWidgets]}
                      onChange={(v) => setHomeWidgets((p) => ({ ...p, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="pt-6 flex justify-end border-t border-border/50 mt-6">
                <SaveBtn loading={savingWidgets} saved={savedWidgets} onClick={saveWidgets} />
              </div>
            </div>
          </Section>

          {/* ── Customer Portal Control ──────────────────────────────────── */}
          <Section
            icon={UserX}
            title="Customer Portal"
            subtitle="Control what customers see in their portal"
            color="bg-gradient-to-br from-rose-500 to-red-600"
            open={openSection === "portal"}
            onToggle={() => toggleSection("portal")}
          >
            <div className="space-y-2">
              <div className="bg-muted/30 rounded-xl px-5 border border-border/50">
                {[
                  { key: "showReviews", label: "Show Reviews Tab", desc: "Let customers submit feedback after repair" },
                  { key: "showDelivery", label: "Show Delivery Tab", desc: "Only enable if your shop offers doorstep delivery" },
                  { key: "showEstimates", label: "Show Estimates Tab", desc: "Let customers view repair cost estimates" },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start justify-between gap-4 py-4 border-b border-border/50 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                    </div>
                    <Toggle
                      checked={customerPortal[key as keyof typeof customerPortal]}
                      onChange={(v) => setCustomerPortal((p) => ({ ...p, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
              <div className="pt-6 flex justify-end border-t border-border/50 mt-6">
                <SaveBtn loading={savingPortal} saved={savedPortal} onClick={saveCustomerPortal} />
              </div>
            </div>
          </Section>

          {/* ── Billing & Subscription ────────────────────────────────────── */}
          <Section
            icon={CreditCard}
            title="Billing & Subscription"
            subtitle="Your plan and payment status with the platform"
            color="bg-gradient-to-br from-fuchsia-500 to-pink-600"
            open={openSection === "billing"}
            onToggle={() => toggleSection("billing")}
          >
            {subscription ? (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Plan</p>
                    <p className="text-lg font-black text-foreground capitalize">{subscription.plan}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    <p className="text-lg font-black text-foreground capitalize">{subscription.status}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount</p>
                    <p className="text-lg font-black text-foreground">{subscription.currency} {Number(subscription.amount ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Next Billing</p>
                    <p className="text-lg font-black text-foreground">
                      {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>

                {payError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs font-semibold text-red-500">{payError}</p>
                  </div>
                )}
                {payInfo && (
                  <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <p className="text-xs font-semibold text-blue-500">{payInfo}</p>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap justify-end gap-3 border-t border-border/50">
                  {([
                    { key: "easypaisa", label: "EasyPaisa" },
                    { key: "jazzcash", label: "JazzCash" },
                    { key: "stripe", label: "Stripe" },
                    { key: "paypal", label: "PayPal" },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => payNow(key)}
                      disabled={payingNow || !subscription.amount}
                      className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.96] disabled:opacity-60 shadow-lg bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:shadow-fuchsia-500/40 shadow-fuchsia-600/30"
                    >
                      {payingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                      {payingNow ? "Starting…" : `Pay via ${label}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription found for this shop.</p>
            )}
          </Section>

          {/* ── Payment Gateway (EasyPaisa) ──────────────────────────────── */}
          <Section
            icon={Wallet}
            title="Payment Gateway (EasyPaisa)"
            subtitle="Let your customers pay their repair estimates directly"
            color="bg-gradient-to-br from-emerald-500 to-teal-600"
            open={openSection === "easypaisa"}
            onToggle={() => toggleSection("easypaisa")}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-6 py-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Enable EasyPaisa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Turn on once your credentials below are saved</p>
                </div>
                <Toggle checked={pgEnabled} onChange={setPgEnabled} />
              </div>

              <Field label="Store ID" icon={Store} value={pgStoreId} onChange={setPgStoreId} placeholder="Your EasyPaisa Store ID" />
              <Field
                label="Hash Key" icon={KeyRound} type="password" value={pgHashKey} onChange={setPgHashKey}
                placeholder={pgHasHashKey ? "•••••••• (saved — leave blank to keep)" : "Your EasyPaisa Hash Key"}
              />
              <Field
                label="Username" icon={KeyRound} value={pgUsername} onChange={setPgUsername}
                placeholder={pgHasUsername ? "•••••••• (saved — leave blank to keep)" : "EasyPaisa API username"}
              />
              <Field
                label="Password" icon={KeyRound} type="password" value={pgPassword} onChange={setPgPassword}
                placeholder={pgHasPassword ? "•••••••• (saved — leave blank to keep)" : "EasyPaisa API password"}
              />

              <div className="space-y-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Environment</label>
                <div className="relative group">
                  <select
                    value={pgEnvironment}
                    onChange={(e) => setPgEnvironment(e.target.value)}
                    className="w-full appearance-none bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl pl-4 pr-10 py-3.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 focus:bg-background transition-all"
                  >
                    <option value="uat">UAT (Testing)</option>
                    <option value="live">Live (Production)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                </div>
              </div>

              {pgError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-500">{pgError}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-border/50">
                <SaveBtn loading={savingPg} saved={savedPg} onClick={savePaymentConfig} />
              </div>
            </div>
          </Section>

          {/* ── Payment Gateway (JazzCash) ───────────────────────────────── */}
          <Section
            icon={Wallet}
            title="Payment Gateway (JazzCash)"
            subtitle="Let your customers pay their repair estimates directly"
            color="bg-gradient-to-br from-red-500 to-orange-600"
            open={openSection === "jazzcash"}
            onToggle={() => toggleSection("jazzcash")}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-6 py-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Enable JazzCash</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Turn on once your credentials below are saved</p>
                </div>
                <Toggle checked={jcEnabled} onChange={setJcEnabled} />
              </div>

              <Field label="Merchant ID" icon={Store} value={jcMerchantId} onChange={setJcMerchantId} placeholder="Your JazzCash Merchant ID" />
              <Field
                label="Password" icon={KeyRound} type="password" value={jcPassword} onChange={setJcPassword}
                placeholder={jcHasPassword ? "•••••••• (saved — leave blank to keep)" : "JazzCash API password"}
              />
              <Field
                label="Integrity Salt" icon={KeyRound} type="password" value={jcIntegritySalt} onChange={setJcIntegritySalt}
                placeholder={jcHasIntegritySalt ? "•••••••• (saved — leave blank to keep)" : "JazzCash Integrity Salt"}
              />

              <div className="space-y-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Environment</label>
                <div className="relative group">
                  <select
                    value={jcEnvironment}
                    onChange={(e) => setJcEnvironment(e.target.value)}
                    className="w-full appearance-none bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl pl-4 pr-10 py-3.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 focus:bg-background transition-all"
                  >
                    <option value="uat">UAT (Testing)</option>
                    <option value="live">Live (Production)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                </div>
              </div>

              {jcError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-500">{jcError}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-border/50">
                <SaveBtn loading={savingJc} saved={savedJc} onClick={saveJazzcashConfig} />
              </div>
            </div>
          </Section>

          {/* ── Payment Gateway (Stripe) ─────────────────────────────────── */}
          <Section
            icon={Wallet}
            title="Payment Gateway (Stripe)"
            subtitle="Card payments via Stripe's hosted checkout"
            color="bg-gradient-to-br from-violet-500 to-indigo-600"
            open={openSection === "stripe"}
            onToggle={() => toggleSection("stripe")}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-6 py-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Enable Stripe</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Turn on once your credentials below are saved</p>
                </div>
                <Toggle checked={spEnabled} onChange={setSpEnabled} />
              </div>

              <Field
                label="Secret Key" icon={KeyRound} type="password" value={spSecretKey} onChange={setSpSecretKey}
                placeholder={spHasSecretKey ? "•••••••• (saved — leave blank to keep)" : "sk_test_…"}
              />
              <Field label="Publishable Key" icon={KeyRound} value={spPublishableKey} onChange={setSpPublishableKey} placeholder="pk_test_…" />
              <Field
                label="Webhook Secret" icon={KeyRound} type="password" value={spWebhookSecret} onChange={setSpWebhookSecret}
                placeholder={spHasWebhookSecret ? "•••••••• (saved — leave blank to keep)" : "whsec_… (optional)"}
              />

              {spError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-500">{spError}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-border/50">
                <SaveBtn loading={savingSp} saved={savedSp} onClick={saveStripeConfig} />
              </div>
            </div>
          </Section>

          {/* ── Payment Gateway (PayPal) ─────────────────────────────────── */}
          <Section
            icon={Wallet}
            title="Payment Gateway (PayPal)"
            subtitle="Accept PayPal payments (charged in USD)"
            color="bg-gradient-to-br from-blue-500 to-sky-600"
            open={openSection === "paypal"}
            onToggle={() => toggleSection("paypal")}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-6 py-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">Enable PayPal</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Turn on once your credentials below are saved</p>
                </div>
                <Toggle checked={ppEnabled} onChange={setPpEnabled} />
              </div>

              <Field
                label="Client ID" icon={KeyRound} value={ppClientId} onChange={setPpClientId}
                placeholder={ppHasClientId ? "•••••••• (saved — leave blank to keep)" : "PayPal Client ID"}
              />
              <Field
                label="Client Secret" icon={KeyRound} type="password" value={ppClientSecret} onChange={setPpClientSecret}
                placeholder={ppHasClientSecret ? "•••••••• (saved — leave blank to keep)" : "PayPal Client Secret"}
              />

              <div className="space-y-2">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Mode</label>
                <div className="relative group">
                  <select
                    value={ppMode}
                    onChange={(e) => setPpMode(e.target.value)}
                    className="w-full appearance-none bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl pl-4 pr-10 py-3.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 focus:bg-background transition-all"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="live">Live (Production)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                </div>
              </div>

              {ppError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-500">{ppError}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-border/50">
                <SaveBtn loading={savingPp} saved={savedPp} onClick={savePaypalConfig} />
              </div>
            </div>
          </Section>

          {/* ── Change Password ─────────────────────────────────────────────── */}
          <Section
            icon={KeyRound}
            title="Change Password"
            subtitle="Update the password for your own login"
            color="bg-gradient-to-br from-slate-500 to-slate-700"
            open={openSection === "changePassword"}
            onToggle={() => toggleSection("changePassword")}
          >
            <div className="space-y-5">
              <Field label="Current Password" icon={KeyRound} type="password" value={currentPassword} onChange={setCurrentPassword} placeholder="••••••••" />
              <Field label="New Password" icon={KeyRound} type="password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" />
              <Field label="Confirm New Password" icon={KeyRound} type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" />

              {pwError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs font-semibold text-red-500">{pwError}</p>
                </div>
              )}

              <div className="pt-2 flex justify-end border-t border-border/50">
                <SaveBtn loading={changingPw} saved={changedPw} onClick={changePassword} label="Update Password" />
              </div>
            </div>
          </Section>

          {/* ── Danger Zone ────────────────────────────────────────────── */}
          <Section
            icon={ShieldAlert}
            title="Danger Zone"
            subtitle="Irreversible actions — proceed with caution"
            color="bg-gradient-to-br from-red-500 to-red-600"
            open={openSection === "danger"}
            onToggle={() => toggleSection("danger")}
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
  );
}
