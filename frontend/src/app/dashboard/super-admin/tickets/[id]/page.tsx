"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import {
  ArrowLeft, Loader2, AlertTriangle, Building2, User, Phone, Mail,
  Smartphone, Wrench, Clock, MessageSquare, Package,
} from "lucide-react";

export default function SuperAdminTicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardShell requiredRole={["super_admin", "admin"]}>
      {() => <TicketDetailContent ticketId={params.id} />}
    </DashboardShell>
  );
}

function TicketDetailContent({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/admin/tickets/${ticketId}`);
        setTicket(res.data?.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load ticket.");
      } finally {
        setLoading(false);
      }
    })();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading ticket…</span>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.push("/dashboard/super-admin/tickets")} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to tickets
        </button>
        <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-destructive shrink-0" />
          <p className="text-sm font-semibold text-destructive">{error || "Ticket not found."}</p>
        </div>
      </div>
    );
  }

  const tenant = typeof ticket.tenantId === "object" ? ticket.tenantId : null;
  const technician = typeof ticket.technicianId === "object" ? ticket.technicianId : null;
  const customer = typeof ticket.customerId === "object" ? ticket.customerId : null;

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/dashboard/super-admin/tickets")} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Back to tickets
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">{ticket.ticketNumber}</h1>
          <p className="text-muted-foreground font-medium mt-0.5 flex items-center gap-1.5">
            <Building2 size={13} /> {tenant?.name ?? "Unknown shop"}
          </p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Smartphone size={14} /> Device</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Brand / Model</p><p className="font-medium text-foreground">{ticket.deviceBrand} {ticket.deviceModel}</p></div>
              {ticket.deviceColor && <div><p className="text-xs text-muted-foreground">Color</p><p className="font-medium text-foreground">{ticket.deviceColor}</p></div>}
              {ticket.deviceIMEI && <div><p className="text-xs text-muted-foreground">IMEI</p><p className="font-mono text-xs text-foreground">{ticket.deviceIMEI}</p></div>}
              {ticket.estimateAmount != null && <div><p className="text-xs text-muted-foreground">Estimate</p><p className="font-medium text-foreground">Rs. {Number(ticket.estimateAmount).toLocaleString()}</p></div>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Issue</p>
              <p className="text-sm text-foreground mt-1">{ticket.issue}</p>
            </div>
            {ticket.diagnosisNotes && (
              <div>
                <p className="text-xs text-muted-foreground">Diagnosis</p>
                <p className="text-sm text-foreground mt-1">{ticket.diagnosisNotes}</p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Clock size={14} /> Status History</h2>
            {ticket.statusHistory?.length ? (
              <div className="space-y-3">
                {ticket.statusHistory.map((h: any) => (
                  <div key={h._id} className="flex items-start gap-3 text-sm border-l-2 border-primary/30 pl-3">
                    <div>
                      <p className="font-medium text-foreground">{h.fromStatus} → {h.toStatus}</p>
                      <p className="text-xs text-muted-foreground">by {h.changedByName} · {new Date(h.createdAt).toLocaleString()}</p>
                      {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No status changes recorded.</p>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><MessageSquare size={14} /> Notes</h2>
            {ticket.notes?.length ? (
              <div className="space-y-3">
                {ticket.notes.map((n: any) => (
                  <div key={n._id} className="text-sm bg-muted/50 rounded-xl p-3">
                    <p className="text-foreground">{n.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.authorName} · {new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </div>

          {ticket.partsUsed?.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Package size={14} /> Parts Used</h2>
              <div className="space-y-2">
                {ticket.partsUsed.map((p: any) => (
                  <div key={p._id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{p.name} <span className="text-muted-foreground font-mono text-xs">({p.sku})</span></span>
                    <span className="font-medium text-foreground">×{p.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ticket.photos?.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-foreground">Photos</h2>
              <div className="grid grid-cols-3 gap-2">
                {ticket.photos.map((url: string, i: number) => (
                  <div key={i} className="relative aspect-square rounded-xl border border-border overflow-hidden">
                    <Image src={url} alt={`Photo ${i + 1}`} fill sizes="33vw" className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><User size={14} /> Customer</h2>
            <p className="font-medium text-foreground">{customer?.name ?? "—"}</p>
            {customer?.phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone size={11} /> {customer.phone}</p>}
            {customer?.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail size={11} /> {customer.email}</p>}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Wrench size={14} /> Technician</h2>
            {technician ? (
              <>
                <p className="font-medium text-foreground">{technician.name}</p>
                {technician.email && <p className="text-xs text-muted-foreground">{technician.email}</p>}
              </>
            ) : (
              <p className="text-sm text-amber-600 font-bold">Unassigned</p>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-2 text-sm">
            <h2 className="text-sm font-bold text-foreground mb-1">Shop</h2>
            <p className="text-foreground font-medium">{tenant?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{tenant?.subdomain ? `${tenant.subdomain}.dibnow.com` : "—"}</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-2 text-sm">
            <p className="text-muted-foreground">Created</p>
            <p className="text-foreground font-medium">{new Date(ticket.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
