"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { THEME } from "./theme";

const { ACCENT, ACCENT2, BORDER, TEXT, MUTED, BG2 } = THEME;

interface DemoRequestModalProps {
  open: boolean;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: `1.5px solid ${BORDER}`,
  fontSize: 14,
  fontFamily: "'DM Sans',sans-serif",
  color: TEXT,
  background: "#fff",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: MUTED,
  marginBottom: 6,
  fontFamily: "'DM Sans',sans-serif",
};

export default function DemoRequestModal({ open, onClose }: DemoRequestModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      // Reset after the close animation would run, so re-opening starts fresh.
      const t = setTimeout(() => {
        setName(""); setEmail(""); setShopName(""); setPhone(""); setPreferredDate(""); setMessage("");
        setStatus("idle"); setErrorMsg(""); setSubmitting(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const valid = name.trim() && /\S+@\S+\.\S+/.test(email) && shopName.trim();

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await api.post("/api/public/request-demo", {
        name: name.trim(),
        email: email.trim(),
        shopName: shopName.trim(),
        phone: phone.trim(),
        preferredDate,
        message: message.trim(),
      });
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(28,25,23,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: BG2, borderRadius: 22, maxWidth: 480, width: "100%",
          padding: "36px 34px", position: "relative",
          boxShadow: "0 32px 80px rgba(0,0,0,0.35)",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute", top: 20, right: 20, width: 32, height: 32,
            borderRadius: 999, border: "none", background: "rgba(120,83,56,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            color: MUTED,
          }}
        >
          <X size={16} />
        </button>

        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%", background: "#d1fae5",
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
            }}>
              <CheckCircle2 size={28} color="#065f46" />
            </div>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 10, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Request received!
            </h3>
            <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7, fontFamily: "'DM Sans',sans-serif" }}>
              Thanks, {name.split(" ")[0] || "there"} — our team will reach out shortly to schedule your walkthrough.
            </p>
            <button
              onClick={onClose}
              className="btn-blue"
              style={{
                marginTop: 24, background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
                padding: "12px 28px", borderRadius: 10, fontFamily: "'DM Sans',sans-serif",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 6, fontFamily: "'DM Serif Display',Georgia,serif" }}>
              Book a free demo
            </h3>
            <p style={{ color: MUTED, fontSize: 14, marginBottom: 24, fontFamily: "'DM Sans',sans-serif" }}>
              20 minutes, no sales pressure. Tell us a bit about your shop.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali Raza" />
              </div>
              <div>
                <label style={labelStyle}>Work Email *</label>
                <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourshop.com" />
              </div>
              <div>
                <label style={labelStyle}>Shop Name *</label>
                <input style={inputStyle} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Al-Noor Mobile Repair" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 0000000" />
                </div>
                <div>
                  <label style={labelStyle}>Preferred Date</label>
                  <input style={inputStyle} type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Message</label>
                <textarea
                  style={{ ...inputStyle, resize: "vertical", minHeight: 70, fontFamily: "'DM Sans',sans-serif" }}
                  value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything specific you'd like us to cover?"
                />
              </div>

              {status === "error" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px" }}>
                  <AlertTriangle size={15} color="#dc2626" />
                  <span style={{ color: "#dc2626", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>{errorMsg}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!valid || submitting}
                className="btn-blue"
                style={{
                  background: valid ? `linear-gradient(135deg,${ACCENT},${ACCENT2})` : "#d6cdc4",
                  color: "#fff", fontWeight: 700, fontSize: 15, border: "none",
                  cursor: valid && !submitting ? "pointer" : "not-allowed",
                  padding: "14px 28px", borderRadius: 12, marginTop: 4,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                {submitting ? <Loader2 size={16} className="spin-anim" /> : null}
                {submitting ? "Sending…" : "Request Demo →"}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .spin-anim { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
