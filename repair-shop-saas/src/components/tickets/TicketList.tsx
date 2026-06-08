"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2, Plus, ShieldAlert, Trash2, Eye } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

interface TicketListProps {
  rolePath: string; // e.g. "/dashboard/owner/tickets"
  canCreate?: boolean;
  canDelete?: boolean;
}

export default function TicketList({ rolePath, canCreate, canDelete }: TicketListProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetchTickets(filter);
  }, [filter]);

  const fetchTickets = async (currentFilter: string) => {
    setLoading(true);
    setError("");
    try {
      let url = "/api/tickets";
      if (currentFilter !== "All") {
        const statusMap: Record<string, string> = {
          "Received": "received",
          "In Repair": "in_repair",
          "Ready": "ready",
          "Delivered": "delivered"
        };
        const mappedStatus = statusMap[currentFilter];
        if (mappedStatus) url += `?status=${mappedStatus}`;
      }
      const res = await api.get(url);
      setTickets(res.data?.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;
    try {
      await api.delete(`/api/tickets/${ticketId}`);
      setTickets(tickets.filter(t => t._id !== ticketId));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete ticket.");
    }
  };

  const filters = ["All", "Received", "In Repair", "Ready", "Delivered"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">Tickets</h1>
        {canCreate && (
          <button
            onClick={() => router.push(`${rolePath}/new`)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus size={18} />
            Create New Ticket
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              filter === f
                ? "bg-slate-900 text-white shadow-md"
                : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin w-8 h-8 mb-4" />
            <p>Loading tickets...</p>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 font-semibold">
              <ShieldAlert className="w-5 h-5" />
              {error}
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 font-medium mb-4">No tickets found.</p>
            {canCreate && (
              <button
                onClick={() => router.push(`${rolePath}/new`)}
                className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              >
                <Plus size={16} />
                Create First Ticket
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Ticket #</th>
                  <th className="px-6 py-4">Device</th>
                  <th className="px-6 py-4">Issue</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-slate-700 divide-y divide-slate-50">
                {tickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                      {ticket.ticketNumber}
                    </td>
                    <td className="px-6 py-4">
                      {ticket.deviceBrand} {ticket.deviceModel}
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate text-slate-500">
                      {ticket.issue}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-6 py-4">
                      {ticket.customerId?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      {ticket.technicianId?.name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <button
                        onClick={() => router.push(`${rolePath}/${ticket._id}`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Ticket"
                      >
                        <Eye size={16} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(ticket._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Ticket"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
