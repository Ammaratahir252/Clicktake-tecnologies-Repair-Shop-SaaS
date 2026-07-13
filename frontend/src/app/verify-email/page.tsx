"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VerifyEmailInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const userId = params.get("userId");
    const token = params.get("token");
    if (!userId || !token) {
      setStatus("error");
      setMessage("This verification link is missing required parameters.");
      return;
    }
    api.post("/api/auth/verify-email", { userId, token })
      .then((res) => { setStatus("ok"); setMessage(res.data?.message || "Email verified."); })
      .catch((err) => { setStatus("error"); setMessage(err.response?.data?.message || "Verification failed."); });
  }, [params]);

  return (
    <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
      {status === "loading" && <Loader2 className="animate-spin w-8 h-8 mx-auto text-muted-foreground" />}
      {status === "ok" && <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />}
      {status === "error" && <XCircle className="w-10 h-10 mx-auto text-destructive" />}
      <p className="font-bold text-foreground">{status === "loading" ? "Verifying…" : message}</p>
      {status !== "loading" && (
        <Link href="/login" className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90">
          Go to Login
        </Link>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Suspense fallback={<Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />}>
        <VerifyEmailInner />
      </Suspense>
    </div>
  );
}
