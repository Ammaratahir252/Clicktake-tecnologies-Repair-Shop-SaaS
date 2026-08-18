"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api";
import { Loader2, ArrowLeft, Clock, Save, UserPlus, MessageSquare, Images, DollarSign, Package, Timer, Receipt } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { TICKET_STATUS_TRANSITIONS, TicketStatus } from "@/lib/enums";

interface TicketDetailProps {
  ticketId: string;
  rolePath: string;
  userRole: string;
}

export default function TicketDetail({ ticketId, rolePath, userRole }: TicketDetailProps) {
  const router = useRouter();
  
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Assignment
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTech, setSelectedTech] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Driver assignment (explicit hand-off, alongside a driver's own implicit
  // self-claim via status transitions on their dashboard)
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [driverAssignLoading, setDriverAssignLoading] = useState(false);

  // Status
  const [newStatus, setNewStatus] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  // Estimate
  const [estimateInput, setEstimateInput] = useState("");
  const [estimateLoading, setEstimateLoading] = useState(false);

  // Parts used (M2-M3 bridge — deducts stock via /api/tickets/:id/parts)
  const [parts, setParts] = useState<any[]>([]);
  const [selectedPart, setSelectedPart] = useState("");
  const [partQty, setPartQty] = useState("1");
  const [partLoading, setPartLoading] = useState(false);
  const [partError, setPartError] = useState("");

  // Labor time logged against this ticket (time-sessions API)
  const [laborSeconds, setLaborSeconds] = useState<number | null>(null);
  const [laborSessions, setLaborSessions] = useState(0);

  // Job Completion — Cost & Revenue (owner/manager, once ready/delivered)
  const [actualCostInput, setActualCostInput] = useState("");
  const [costLoading, setCostLoading] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "easypaisa" | "jazzcash">("cash");
  const [amountReceivedInput, setAmountReceivedInput] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [canRecordRevenue, setCanRecordRevenue] = useState(true);

  const canAssign = userRole === "owner" || userRole === "manager";
  const canSetEstimate = userRole === "owner" || userRole === "manager" || userRole === "technician";
  const canUseParts = ["owner", "manager", "technician"].includes(userRole);
  const canSeeLabor = ["owner", "manager", "technician", "frontdesk"].includes(userRole);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await api.get(`/api/tickets/${ticketId}`);
      setTicket(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // "Assign To" — any staff member (technician, frontdesk, manager, driver), not
  // just technicians, so a manager can hand a ticket to whoever should own it.
  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await api.get("/api/users");
      const staff = (res.data.data || []).filter((u: any) => u.role !== "customer");
      setTechnicians(staff);
    } catch {
      // silent fail for tech fetch
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    try {
      const res = await api.get("/api/users?role=driver");
      setDrivers(res.data.data || []);
    } catch {
      // silent fail — the assign-driver form just stays empty
    }
  }, []);

  const fetchParts = useCallback(async () => {
    try {
      const res = await api.get("/api/parts");
      setParts((res.data.data || []).filter((p: any) => p.quantity > 0));
    } catch {
      // silent fail — the add-part form just stays empty
    }
  }, []);

  const fetchLabor = useCallback(async () => {
    try {
      const res = await api.get(`/api/time-sessions?ticketId=${ticketId}`);
      const sessions: any[] = res.data.data || [];
      setLaborSessions(sessions.length);
      setLaborSeconds(sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0));
    } catch {
      setLaborSeconds(null);
    }
  }, [ticketId]);

  const fetchPayment = useCallback(async () => {
    try {
      const res = await api.get(`/api/payments?ticketId=${ticketId}`);
      const payments: any[] = res.data.data || [];
      setPayment(payments.find((p) => p.status === "completed") ?? null);
    } catch {
      // silent fail — revenue card just shows the "record payment" form
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
    if (canAssign) { fetchTechnicians(); fetchDrivers(); }
    if (canUseParts) fetchParts();
    if (canSeeLabor) fetchLabor();
    if (canAssign) fetchPayment();
    if (userRole === "manager") {
      api
        .get("/api/tenant/branding")
        .then((res) => setCanRecordRevenue(res.data?.data?.branding?.managerPermissions?.recordRevenue ?? true))
        .catch(() => setCanRecordRevenue(true));
    }
    // canAssign/canUseParts/canSeeLabor/userRole are derived from the userRole prop,
    // which doesn't change for a mounted ticket-detail view — the fetch* functions
    // are the only real dependencies, and they're stable via useCallback above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTicket, fetchTechnicians, fetchDrivers, fetchParts, fetchLabor, fetchPayment]);

  const handleUsePart = async () => {
    const qty = parseInt(partQty, 10);
    if (!selectedPart || !Number.isInteger(qty) || qty <= 0) return;
    setPartLoading(true);
    setPartError("");
    try {
      await api.post(`/api/tickets/${ticketId}/parts`, { partId: selectedPart, quantity: qty });
      setSelectedPart("");
      setPartQty("1");
      await Promise.all([fetchTicket(), fetchParts()]);
    } catch (err: any) {
      setPartError(err.response?.data?.message || "Failed to add part");
    } finally {
      setPartLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    setStatusLoading(true);
    try {
      await api.patch(`/api/tickets/${ticketId}/status`, { status: newStatus });
      setNewStatus("");
      await fetchTicket();
      alert("Status updated successfully");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedTech) return;
    setAssignLoading(true);
    try {
      await api.patch(`/api/tickets/${ticketId}/assign`, { technicianId: selectedTech });
      setSelectedTech("");
      await fetchTicket();
      alert("Technician assigned");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to assign technician");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDriver) return;
    setDriverAssignLoading(true);
    try {
      await api.patch(`/api/tickets/${ticketId}/assign-driver`, { driverId: selectedDriver });
      setSelectedDriver("");
      await fetchTicket();
      alert("Driver assigned");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to assign driver");
    } finally {
      setDriverAssignLoading(false);
    }
  };

  const handleSetEstimate = async () => {
    const amount = Number(estimateInput);
    if (!estimateInput || Number.isNaN(amount) || amount < 0) return;
    setEstimateLoading(true);
    try {
      await api.patch(`/api/tickets/${ticketId}/estimate`, { estimateAmount: amount });
      setEstimateInput("");
      await fetchTicket();
      alert("Estimate set — customer has been notified");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to set estimate");
    } finally {
      setEstimateLoading(false);
    }
  };

  const handleSetActualCost = async () => {
    const amount = Number(actualCostInput);
    if (!actualCostInput || Number.isNaN(amount) || amount < 0) return;
    setCostLoading(true);
    try {
      await api.patch(`/api/tickets/${ticketId}/cost`, { actualCost: amount });
      setActualCostInput("");
      await fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to record cost");
    } finally {
      setCostLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    setRecordingPayment(true);
    try {
      const amountReceived = amountReceivedInput ? Number(amountReceivedInput) : undefined;
      await api.post(`/api/tickets/${ticketId}/payment`, { method: payMethod, amountReceived });
      setAmountReceivedInput("");
      await Promise.all([fetchTicket(), fetchPayment()]);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setNoteLoading(true);
    try {
      await api.post(`/api/tickets/${ticketId}/notes`, { content: noteContent });
      setNoteContent("");
      await fetchTicket();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add note");
    } finally {
      setNoteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin w-8 h-8 mb-4" />
        <p>Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block bg-red-50 text-red-600 p-4 rounded-xl font-semibold">
          {error || "Ticket not found"}
        </div>
      </div>
    );
  }

  // Calculate valid next statuses based on RBAC
  const allValidNextStatuses = TICKET_STATUS_TRANSITIONS[ticket.status as TicketStatus] || [];
  let allowedStatusesForRole = allValidNextStatuses;

  if (userRole === "technician") {
    allowedStatusesForRole = allValidNextStatuses.filter(s => s === "diagnosed" || s === "in_repair" || s === "ready");
  } else if (userRole === "frontdesk") {
    allowedStatusesForRole = allValidNextStatuses.filter(s => s === "received" || s === "ready" || s === "delivered");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* SECTION 1: Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(rolePath)}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-slate-900">{ticket.ticketNumber}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
          <Clock size={16} />
          {new Date(ticket.createdAt).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-2 space-y-6">
          
          {/* SECTION 2: Device & Issue Info */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Ticket Details</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <span className="block text-xs font-bold text-slate-400 mb-1">Device</span>
                <span className="block font-semibold text-slate-900">{ticket.deviceBrand} {ticket.deviceModel}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 mb-1">Customer</span>
                <span className="block font-semibold text-slate-900">{ticket.customerId?.name}</span>
                <span className="block text-sm text-slate-500">{ticket.customerId?.phone}</span>
              </div>
              {ticket.estimateAmount !== null && (
                <div>
                  <span className="block text-xs font-bold text-slate-400 mb-1">Estimate Amount</span>
                  <span className="block font-semibold text-slate-900">PKR {ticket.estimateAmount.toLocaleString()}</span>
                </div>
              )}
              <div>
                <span className="block text-xs font-bold text-slate-400 mb-1">Priority</span>
                <span className="block font-semibold text-slate-900 capitalize">{ticket.priority || "medium"}</span>
                {ticket.dueDate && (
                  <span className="block text-sm text-slate-500">Due {new Date(ticket.dueDate).toLocaleDateString()}</span>
                )}
              </div>
              <div className="col-span-2 mt-2">
                <span className="block text-xs font-bold text-slate-400 mb-1">Issue Description</span>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {ticket.issue}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 4.5: Repair Photos */}
          {ticket.photos?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Images size={16} /> Repair Photos ({ticket.photos.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...ticket.photos].reverse().map((photo: any) => (
                  <a
                    key={photo._id}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative h-28 rounded-xl overflow-hidden border border-slate-100 group"
                  >
                    <Image
                      src={photo.url}
                      alt={photo.type}
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                      <p className="text-white text-[10px] font-bold capitalize">{photo.type} · {photo.uploadedByName}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4.7: Parts Used — real inventory deduction via /api/tickets/:id/parts */}
          {(canUseParts || ticket.partsUsed?.length > 0) && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Package size={16} /> Parts Used {ticket.partsUsed?.length > 0 && `(${ticket.partsUsed.length})`}
              </h2>

              {ticket.partsUsed?.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {[...ticket.partsUsed].reverse().map((p: any, i: number) => (
                    <div key={p._id ?? i} className="flex items-center justify-between bg-slate-50 border border-slate-100 px-4 py-3 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">SKU: {p.sku} · {new Date(p.addedAt).toLocaleString()}</p>
                      </div>
                      <span className="text-sm font-black text-slate-700">×{p.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic mb-4">No parts used on this repair yet.</p>
              )}

              {canUseParts && ticket.status !== "delivered" && ticket.status !== "cancelled" && (
                <div className="pt-4 border-t border-slate-100">
                  {partError && (
                    <p className="text-red-600 text-xs font-bold mb-2">{partError}</p>
                  )}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={selectedPart}
                      onChange={(e) => setSelectedPart(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700"
                    >
                      <option value="">Select a part from inventory…</option>
                      {parts.map((p) => (
                        <option key={p._id} value={p._id}>{p.name} · {p.sku} ({p.quantity} in stock)</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={partQty}
                      onChange={(e) => setPartQty(e.target.value)}
                      className="w-full sm:w-24 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700"
                      placeholder="Qty"
                    />
                    <button
                      onClick={handleUsePart}
                      disabled={!selectedPart || partLoading || parseInt(partQty, 10) <= 0}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                    >
                      {partLoading ? "Adding…" : "Use Part"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">Stock is deducted from inventory and logged in stock movement history.</p>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: Notes */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <MessageSquare size={16} /> Internal Notes
            </h2>
            
            <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2">
              {ticket.notes?.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No notes added yet.</p>
              ) : (
                [...ticket.notes].reverse().map((note: any, i: number) => (
                  <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900">{note.authorName}</span>
                      <span className="text-[10px] font-semibold text-slate-400">{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-3">
              <textarea
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Add a new note..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white transition-colors focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none text-sm"
              />
              <button
                onClick={handleAddNote}
                disabled={noteLoading || !noteContent.trim()}
                className="self-end bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
              >
                {noteLoading ? "Saving..." : "Add Note"}
              </button>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* SECTION 2.5: Set Estimate */}
          {canSetEstimate && ticket.status === "diagnosed" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <DollarSign size={16} /> Set Estimate
              </h2>
              <div className="flex flex-col gap-3">
                <input
                  type="number"
                  min="0"
                  value={estimateInput}
                  onChange={e => setEstimateInput(e.target.value)}
                  placeholder="Estimate amount (PKR)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700"
                />
                <button
                  onClick={handleSetEstimate}
                  disabled={!estimateInput || estimateLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  {estimateLoading ? "Sending..." : "Send Estimate to Customer"}
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: Status Update */}
          {allowedStatusesForRole.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Save size={16} /> Update Status
              </h2>
              <div className="flex flex-col gap-3">
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700"
                >
                  <option value="">Select Next Status...</option>
                  {allowedStatusesForRole.map(s => (
                    <option key={s} value={s}>{s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</option>
                  ))}
                </select>
                <button
                  onClick={handleUpdateStatus}
                  disabled={!newStatus || statusLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  {statusLoading ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          )}

          {/* SECTION 4: Assignment — any staff member (technician/frontdesk/manager/driver) */}
          {canAssign && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <UserPlus size={16} /> Assignment
              </h2>
              <div className="mb-4">
                <span className="block text-xs font-bold text-slate-400 mb-1">Currently Assigned</span>
                <span className="block font-semibold text-slate-900">
                  {ticket.technicianId?.name || <span className="text-slate-400 italic">Unassigned</span>}
                </span>
              </div>

              {ticket.status !== "delivered" && ticket.status !== "cancelled" && (
                <div className="flex flex-col gap-3">
                  <select
                    value={selectedTech}
                    onChange={e => setSelectedTech(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700"
                  >
                    <option value="">Select staff member...</option>
                    {technicians.map(t => (
                      <option key={t._id} value={t._id}>{t.name} ({t.role})</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedTech || assignLoading}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                  >
                    {assignLoading ? "Assigning..." : "Assign"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4.5: Driver Assignment — explicit hand-off for pickup/delivery,
              alongside a driver's own implicit self-claim on their dashboard */}
          {canAssign && (ticket.status === "received" || ticket.status === "ready") && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <UserPlus size={16} /> Driver
              </h2>
              <div className="mb-4">
                <span className="block text-xs font-bold text-slate-400 mb-1">Currently Assigned</span>
                <span className="block font-semibold text-slate-900">
                  {ticket.driverId?.name || <span className="text-slate-400 italic">Unassigned</span>}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <select
                  value={selectedDriver}
                  onChange={e => setSelectedDriver(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700"
                >
                  <option value="">Select Driver...</option>
                  {drivers.map(d => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleAssignDriver}
                  disabled={!selectedDriver || driverAssignLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  {driverAssignLoading ? "Assigning..." : "Assign Driver"}
                </button>
                {drivers.length === 0 && (
                  <p className="text-xs text-slate-400 text-center">No driver accounts on this shop yet.</p>
                )}
              </div>
            </div>
          )}

          {/* SECTION 5.7: Job Completion — Cost & Revenue */}
          {canAssign && (ticket.status === "ready" || ticket.status === "delivered") && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Receipt size={16} /> Job Completion — Cost &amp; Revenue
              </h2>

              {!canRecordRevenue ? (
                <p className="text-xs text-slate-400 italic">
                  Your shop owner has not enabled cost/revenue recording for managers.
                </p>
              ) : (
                <div className="space-y-5">
                  {/* Actual Cost */}
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1.5">Actual Cost (parts + labor)</span>
                    {ticket.actualCost != null ? (
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{ticket.actualCost.toLocaleString()}</span>
                        <button
                          onClick={() => setActualCostInput(String(ticket.actualCost))}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      </div>
                    ) : null}
                    {(ticket.actualCost == null || actualCostInput !== "") && (
                      <div className="flex gap-2 mt-1.5">
                        <input
                          type="number"
                          min="0"
                          value={actualCostInput}
                          onChange={(e) => setActualCostInput(e.target.value)}
                          placeholder="Enter actual cost"
                          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700"
                        />
                        <button
                          onClick={handleSetActualCost}
                          disabled={!actualCostInput || costLoading}
                          className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm shrink-0"
                        >
                          {costLoading ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Revenue / Payment */}
                  <div>
                    <span className="block text-xs font-bold text-slate-400 mb-1.5">Revenue (customer payment)</span>
                    {payment ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                        <p className="text-sm font-bold text-emerald-700">
                          Paid {payment.amount?.toLocaleString()} via {payment.gateway}
                        </p>
                      </div>
                    ) : !ticket.estimateAmount ? (
                      <p className="text-xs text-slate-400 italic">This ticket has no estimate to collect payment against.</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          {(["cash", "card", "easypaisa", "jazzcash"] as const).map((m) => (
                            <button
                              key={m}
                              onClick={() => setPayMethod(m)}
                              className={`px-2 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                                payMethod === m ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={amountReceivedInput}
                          onChange={(e) => setAmountReceivedInput(e.target.value)}
                          placeholder={`Amount received (optional, est. ${ticket.estimateAmount.toLocaleString()})`}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm font-semibold text-slate-700"
                        />
                        <button
                          onClick={handleRecordPayment}
                          disabled={recordingPayment}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                        >
                          {recordingPayment ? "Recording..." : "Record Payment"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Profit readout */}
                  {ticket.actualCost != null && payment && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Profit</span>
                      <span className="font-black text-slate-900">
                        {(payment.amount - ticket.actualCost).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SECTION 5.5: Labor time logged via the technician timer */}
          {canSeeLabor && laborSeconds !== null && laborSessions > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Timer size={16} /> Time Logged
              </h2>
              <p className="text-2xl font-black text-slate-900 tabular-nums">
                {Math.floor(laborSeconds / 3600)}h {Math.floor((laborSeconds % 3600) / 60).toString().padStart(2, "0")}m
              </p>
              <p className="text-xs text-slate-500 mt-1">{laborSessions} session{laborSessions !== 1 ? "s" : ""} recorded by technicians</p>
            </div>
          )}

          {/* SECTION 6: Ticket History */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">History Log</h2>
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
              {ticket.statusHistory && [...ticket.statusHistory].reverse().map((entry: any, i: number) => (
                <div key={i} className="relative pl-6">
                  <div className="absolute w-3 h-3 bg-slate-200 rounded-full -left-[7px] top-1.5 border-2 border-white"></div>
                  <div className="text-xs font-bold text-slate-900 mb-0.5">
                    {entry.changedByName}
                  </div>
                  <div className="text-xs text-slate-500 mb-1">
                    {entry.fromStatus === entry.toStatus ? (
                      <span className="font-semibold text-slate-700">{entry.note || "Updated ticket"}</span>
                    ) : (
                      <>
                        Changed from <span className="font-semibold">{entry.fromStatus}</span> to <span className="font-semibold">{entry.toStatus}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
