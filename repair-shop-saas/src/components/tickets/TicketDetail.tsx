"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2, ArrowLeft, Clock, Save, UserPlus, MessageSquare } from "lucide-react";
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

  // Status
  const [newStatus, setNewStatus] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);

  const canAssign = userRole === "owner" || userRole === "manager";

  useEffect(() => {
    fetchTicket();
    if (canAssign) fetchTechnicians();
  }, []);

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/api/tickets/${ticketId}`);
      setTicket(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await api.get("/api/users?role=technician");
      setTechnicians(res.data.data || []);
    } catch {
      // silent fail for tech fetch
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
    allowedStatusesForRole = allValidNextStatuses.filter(s => s === "in_repair" || s === "ready");
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
              <div className="col-span-2 mt-2">
                <span className="block text-xs font-bold text-slate-400 mb-1">Issue Description</span>
                <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                  {ticket.issue}
                </p>
              </div>
            </div>
          </div>

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

          {/* SECTION 4: Technician Assignment */}
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
                    <option value="">Select Technician...</option>
                    {technicians.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!selectedTech || assignLoading}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                  >
                    {assignLoading ? "Assigning..." : "Assign Technician"}
                  </button>
                </div>
              )}
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
