"use client";

import DashboardShell from "@/components/DashboardShell";
import TicketList from "@/components/tickets/TicketList";
import { Wrench, Filter, Search, TrendingUp, AlertCircle } from "lucide-react";
import { useState } from "react";

const STATUS_FILTERS = [
  { key: "all", label: "All Tickets", color: "bg-slate-100 dark:bg-slate-800" },
  { key: "received", label: "Received", color: "bg-slate-100 dark:bg-slate-800" },
  { key: "diagnosed", label: "Diagnosed", color: "bg-blue-100 dark:bg-blue-900/30" },
  { key: "in_repair", label: "In Repair", color: "bg-amber-100 dark:bg-amber-900/30" },
  { key: "ready", label: "Ready", color: "bg-emerald-100 dark:bg-emerald-900/30" },
];

const PRIORITY_FILTERS = [
  { key: "all", label: "All Priorities" },
  { key: "high", label: "High Priority" },
  { key: "normal", label: "Normal" },
];

export default function TechnicianTicketsPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  return (
    <DashboardShell requiredRole="technician">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2 animate-in fade-in slide-in-from-top duration-500">
            <h1 className="text-3xl md:text-4xl font-black text-foreground flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <Wrench size={24} className="text-primary" />
              </div>
              My Tickets
            </h1>
            <p className="text-muted-foreground font-medium">
              View and manage your assigned repair tickets
            </p>
          </div>

          {/* Filters Section */}
          <div className="space-y-4 animate-in fade-in slide-in-from-top duration-700 delay-100">
            {/* Search Bar */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by ticket number or customer name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
              />
            </div>

            {/* Filter Chips */}
            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              {/* Status Filters */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Filter size={14} />
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((status) => (
                    <button
                      key={status.key}
                      onClick={() => setStatusFilter(status.key)}
                      className={`px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 ${
                        statusFilter === status.key
                          ? "bg-primary text-primary-foreground shadow-md scale-105"
                          : `${status.color} text-foreground hover:shadow-md hover:scale-105`
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Filters */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} />
                  Priority
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRIORITY_FILTERS.map((priority) => (
                    <button
                      key={priority.key}
                      onClick={() => setPriorityFilter(priority.key)}
                      className={`px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 ${
                        priorityFilter === priority.key
                          ? "bg-primary text-primary-foreground shadow-md scale-105"
                          : "bg-muted text-foreground hover:shadow-md hover:scale-105"
                      }`}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={14} />
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-foreground font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="priority">High Priority First</option>
                  <option value="due-soon">Due Soon</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ticket List */}
          <div className="animate-in fade-in slide-in-from-top duration-700 delay-200">
            <TicketList
              rolePath="/dashboard/technician/tickets"
              canCreate={false}
              canDelete={false}
            />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}