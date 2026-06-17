"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Smartphone, Wrench, Truck, MapPin, Clock, CheckCircle,
  ChevronLeft, Loader2, AlertCircle, Store, Calendar
} from "lucide-react";

const DEVICE_BRANDS = [
  "Apple", "Samsung", "Huawei", "Xiaomi", "OnePlus",
  "Oppo", "Vivo", "Nokia", "Sony", "LG", "Other",
];

const COMMON_ISSUES = [
  "Cracked screen", "Battery replacement", "Charging port repair",
  "Water damage", "Speaker/mic issue", "Camera not working",
  "Software issue", "Back glass replacement", "Other",
];

interface FormState {
  deviceBrand: string;
  deviceModel: string;
  issue: string;
  issueDetail: string;
  deliveryType: "drop-off" | "doorstep";
  deliveryAddress: string;
  preferredTime: string;
}

function BookRepairContent({ user }: { user: any }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const shopSubdomain = searchParams.get("shop") ?? "";
  const shopName      = searchParams.get("shopName") ?? shopSubdomain;

  const [form, setForm] = useState<FormState>({
    deviceBrand:     "",
    deviceModel:     "",
    issue:           "",
    issueDetail:     "",
    deliveryType:    "drop-off",
    deliveryAddress: "",
    preferredTime:   "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState<{ leadNumber: string; shopName: string; deliveryType: string } | null>(null);

  // Redirect if no shop selected
  useEffect(() => {
    if (!shopSubdomain) {
      router.replace("/dashboard/customer/shops");
    }
  }, [shopSubdomain, router]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const device = `${form.deviceBrand} ${form.deviceModel}`.trim();
    const issue  = form.issue === "Other" || !form.issue
      ? form.issueDetail
      : form.issueDetail
        ? `${form.issue} — ${form.issueDetail}`
        : form.issue;

    if (!form.deviceBrand || !form.deviceModel) {
      setError("Please enter your device brand and model.");
      return;
    }
    if (!issue) {
      setError("Please describe the issue with your device.");
      return;
    }
    if (form.deliveryType === "doorstep" && !form.deliveryAddress.trim()) {
      setError("Please enter your pickup address for doorstep collection.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/repair-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subdomain:       shopSubdomain,
          name:            user?.name ?? "",
          phone:           user?.phone ?? "",
          email:           user?.email ?? "",
          device,
          issue,
          source:          "website",
          deliveryType:    form.deliveryType,
          deliveryAddress: form.deliveryType === "doorstep" ? form.deliveryAddress : undefined,
          preferredTime:   form.deliveryType === "doorstep" ? form.preferredTime : undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Failed to submit");

      setSuccess({
        leadNumber:   json.data.leadNumber,
        shopName:     json.data.shopName,
        deliveryType: json.data.deliveryType,
      });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!shopSubdomain) return null;

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-10 space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <CheckCircle className="text-emerald-600 w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-black text-foreground">Repair Booked!</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your repair request has been submitted to <strong>{success.shopName}</strong>.
            They will contact you shortly.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Reference Number</span>
            <span className="text-sm font-black text-primary">{success.leadNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Shop</span>
            <span className="text-sm font-bold text-foreground">{success.shopName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Collection Type</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              success.deliveryType === "doorstep"
                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
            }`}>
              {success.deliveryType === "doorstep" ? "Doorstep Pickup" : "Drop-Off at Shop"}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <a
            href="/dashboard/customer"
            className="text-sm font-bold bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </a>
          <a
            href="/dashboard/customer/shops"
            className="text-sm font-bold bg-card border border-border text-foreground px-6 py-2.5 rounded-xl hover:bg-muted transition-colors"
          >
            Browse More Shops
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <a
        href="/dashboard/customer/shops"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={15} />
        Back to shops
      </a>

      {/* Shop info banner */}
      <div className="flex items-center gap-4 bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Store size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Booking repair at</p>
          <p className="font-black text-foreground">{shopName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Device Info */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={16} className="text-primary" />
            <h3 className="font-bold text-card-foreground">Device Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Device Brand *</label>
              <select
                value={form.deviceBrand}
                onChange={(e) => set("deviceBrand", e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select brand…</option>
                {DEVICE_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Device Model *</label>
              <input
                type="text"
                placeholder="e.g. iPhone 15 Pro, Galaxy S24"
                value={form.deviceModel}
                onChange={(e) => set("deviceModel", e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </section>

        {/* Issue Description */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Wrench size={16} className="text-primary" />
            <h3 className="font-bold text-card-foreground">Issue Description</h3>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">What is the problem? *</label>
            <select
              value={form.issue}
              onChange={(e) => set("issue", e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Select a common issue…</option>
              {COMMON_ISSUES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">
              {form.issue && form.issue !== "Other"
                ? "Additional details (optional)"
                : "Describe the issue *"}
            </label>
            <textarea
              value={form.issueDetail}
              onChange={(e) => set("issueDetail", e.target.value)}
              rows={3}
              placeholder="Describe the problem in more detail…"
              className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
        </section>

        {/* Delivery / Collection Type */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck size={16} className="text-primary" />
            <h3 className="font-bold text-card-foreground">Collection Method</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Drop-off */}
            <button
              type="button"
              onClick={() => set("deliveryType", "drop-off")}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                form.deliveryType === "drop-off"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Store size={18} className={form.deliveryType === "drop-off" ? "text-primary" : "text-muted-foreground"} />
                <span className={`font-bold text-sm ${form.deliveryType === "drop-off" ? "text-primary" : "text-card-foreground"}`}>
                  Drop-Off at Shop
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Bring your device to the shop yourself at your convenience.
              </p>
            </button>

            {/* Doorstep */}
            <button
              type="button"
              onClick={() => set("deliveryType", "doorstep")}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                form.deliveryType === "doorstep"
                  ? "border-rose-500 bg-rose-500/5"
                  : "border-border hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Truck size={18} className={form.deliveryType === "doorstep" ? "text-rose-500" : "text-muted-foreground"} />
                <span className={`font-bold text-sm ${form.deliveryType === "doorstep" ? "text-rose-600" : "text-card-foreground"}`}>
                  Doorstep Pickup
                </span>
                <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 px-2 py-0.5 rounded-full">
                  New
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                We send a driver to collect your device from your address.
              </p>
            </button>
          </div>

          {/* Doorstep address fields */}
          {form.deliveryType === "doorstep" && (
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <MapPin size={12} /> Pickup Address *
                </label>
                <input
                  type="text"
                  placeholder="Full address including street, area, city"
                  value={form.deliveryAddress}
                  onChange={(e) => set("deliveryAddress", e.target.value)}
                  required={form.deliveryType === "doorstep"}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <Calendar size={12} /> Preferred Pickup Time (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tomorrow 10am – 12pm, or Weekdays after 6pm"
                  value={form.preferredTime}
                  onChange={(e) => set("preferredTime", e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-rose-400/40"
                />
              </div>
            </div>
          )}
        </section>

        {/* Your Contact Info (read-only) */}
        {user && (
          <section className="bg-muted/40 border border-border rounded-2xl p-5 space-y-2">
            <p className="text-xs font-bold text-muted-foreground mb-3">Your Contact Details (auto-filled)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-semibold">{user.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-semibold">{user.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-semibold">{user.phone || "Not set"}</p>
              </div>
            </div>
          </section>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <AlertCircle size={16} className="text-destructive shrink-0" />
            <p className="text-sm font-semibold text-destructive">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting ? (
            <><Loader2 size={16} className="animate-spin" /> Submitting…</>
          ) : (
            <>
              <CheckCircle size={16} />
              {form.deliveryType === "doorstep" ? "Book Doorstep Pickup" : "Book Repair"}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function BookRepairPage() {
  return (
    <DashboardShell requiredRole="customer">
      {(user) => (
        <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}>
          <BookRepairContent user={user} />
        </Suspense>
      )}
    </DashboardShell>
  );
}
