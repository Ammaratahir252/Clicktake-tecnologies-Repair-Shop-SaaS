"use client";

/**
 * ONE-TIME PLATFORM BOOTSTRAP — /setup
 *
 * Before this page existed, creating the first super_admin account required
 * either the scripts/create-admin.mjs CLI script or a raw curl call to
 * POST /api/admin/setup — fine for the original developer, not for a customer
 * self-hosting this product. This page is the front door to that same API,
 * which is already correctly self-locking: once one super_admin exists,
 * POST /api/admin/setup permanently 403s and this page redirects to /login.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Loader2, ShieldCheck, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";

type CheckState = "checking" | "needsSetup" | "complete";

export default function SetupPage() {
  const router = useRouter();
  const [check, setCheck]         = useState<CheckState>("checking");
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);

  useEffect(() => {
    axios
      .get("/api/admin/setup")
      .then((res) => {
        if (res.data?.data?.setupComplete) {
          router.replace("/login");
        } else {
          setCheck("needsSetup");
        }
      })
      .catch(() => setCheck("needsSetup")); // fail open to the form — POST re-validates regardless
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post("/api/admin/setup", { name, email, password });
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 403) {
        // Someone else finished setup between our GET and this POST.
        setError("Setup was already completed by someone else. Redirecting to sign in…");
        setTimeout(() => router.replace("/login"), 1800);
      } else {
        setError(message || "Could not create the admin account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (check === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="animate-spin w-5 h-5" />
          <span className="text-sm font-medium">Checking setup status…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck className="text-primary-foreground w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-foreground">Set up your platform</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            This runs once. Create the first super-admin account — the account that manages every
            shop on this platform — then sign in normally from here on.
          </p>
        </div>

        {done ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center shadow-sm">
            <ShieldCheck className="mx-auto text-emerald-500 w-10 h-10 mb-3" />
            <p className="font-bold text-foreground">Super admin created.</p>
            <p className="text-sm text-muted-foreground mt-1">Taking you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                <AlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-destructive">{error}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Your name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Admin email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourcompany.com"
                className="mt-1.5 w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Password</label>
              <div className="relative mt-1.5">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Creating account…</>
              ) : (
                <>Create super-admin account <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
