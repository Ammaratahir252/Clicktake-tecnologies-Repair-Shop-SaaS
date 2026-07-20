"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2, Plus, ShieldAlert, Trash2, Eye } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { filterAndSortTickets, ticketPriority, TicketSortBy } from "@/lib/ticketFilters";

interface TicketListProps {
  rolePath: string; // e.g. "/dashboard/owner/tickets"
  canCreate?: boolean;
  canDelete?: boolean;
  /**
   * Controlled mode: when a page supplies its own filter controls, it passes
   * their state here and TicketList hides its built-in filter row — one source
   * of truth. `statusFilter` is the API status key ('all' | 'received' | …).
   */
  statusFilter?: string;
  search?: string;
  priorityFilter?: string;
  sortBy?: TicketSortBy;
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  low:    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function TicketList({
  rolePath, canCreate, canDelete,
  statusFilter, search, priorityFilter, sortBy,
}: TicketListProps) {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");

  const controlled = statusFilter !== undefined || search !== undefined
    || priorityFilter !== undefined || sortBy !== undefined;

  // Status is filtered server-side (?status=...); search/priority/sort client-side.
  const apiStatus = controlled
    ? (statusFilter && statusFilter !== "all" ? statusFilter : "")
    : ({ "Received": "received", "In Repair": "in_repair", "Ready": "ready", "Delivered": "delivered" }[filter] ?? "");

  useEffect(() => {
    fetchTickets(apiStatus);
  }, [apiStatus]);

  const fetchTickets = async (status: string) => {
    setLoading(true);
    setError("");
    try {
      const url = status ? `/api/tickets?status=${status}` : "/api/tickets";
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

  const visibleTickets = controlled
    ? filterAndSortTickets(tickets, { search, priority: priorityFilter, sortBy })
    : tickets;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-foreground">Tickets</h1>
        {canCreate && (
          <button
            onClick={() => router.push(`${rolePath}/new`)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus size={18} />
            Create New Ticket
          </button>
        )}
      </div>

      {!controlled && (
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card text-muted-foreground border border-border hover:border-border/80"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin w-8 h-8 mb-4" />
            <p>Loading tickets...</p>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl flex items-center gap-3 font-semibold border border-destructive/20">
              <ShieldAlert className="w-5 h-5" />
              {error}
            </div>
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground font-medium mb-4">No tickets found.</p>
            {canCreate && (
              <button
                onClick={() => router.push(`${rolePath}/new`)}
                className="inline-flex items-center gap-2 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-xl text-sm font-bold transition-all"
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
                <tr className="bg-muted border-b border-border text-left text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  <th className="px-6 py-4">Ticket #</th>
                  <th className="px-6 py-4">Device</th>
                  <th className="px-6 py-4">Issue</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-card-foreground divide-y divide-border">
                {visibleTickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-foreground">
                      {ticket.ticketNumber}
                    </td>
                    <td className="px-6 py-4">
                      {ticket.deviceBrand} {ticket.deviceModel}
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate text-muted-foreground">
                      {ticket.issue}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${PRIORITY_STYLES[ticketPriority(ticket)]}`}>
                        {ticketPriority(ticket)}
                      </span>
                      {ticket.dueDate && (
                        <span className="block text-[10px] text-muted-foreground mt-1">
                          Due {new Date(ticket.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {ticket.customerId?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      {ticket.technicianId?.name || <span className="text-muted-foreground italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 flex items-center gap-2">
                      <button
                        onClick={() => router.push(`${rolePath}/${ticket._id}`)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="View Ticket"
                      >
                        <Eye size={16} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(ticket._id)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
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
