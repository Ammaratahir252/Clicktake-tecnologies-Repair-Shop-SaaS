"use client";

import DashboardShell from "@/components/DashboardShell";
import { useState } from "react";
import { Truck, MapPin, User, Phone, Package, CheckCircle, Clock, AlertCircle, Search, Plus } from "lucide-react";

const DELIVERY_STATUSES = [
  { key: "pending",    label: "Pending",    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  { key: "assigned",   label: "Assigned",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { key: "en_route",   label: "En Route",   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { key: "delivered",  label: "Delivered",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
];

const MOCK_DELIVERIES = [
  {
    id: "DEL-001",
    ticketNumber: "REP-2026-00451",
    customerName: "Ahmed Khan",
    customerPhone: "+92 300 1234567",
    address: "House 12, Block B, DHA Phase 5, Lahore",
    deviceType: "iPhone 15 Pro Max",
    driver: "Kamran Ali",
    status: "en_route",
    scheduledTime: "10:00 AM",
    type: "pickup",
  },
  {
    id: "DEL-002",
    ticketNumber: "REP-2026-00448",
    customerName: "Sara Malik",
    customerPhone: "+92 321 9876543",
    address: "Flat 3A, Gulberg III, Lahore",
    deviceType: "Samsung Galaxy S24",
    driver: "Kamran Ali",
    status: "delivered",
    scheduledTime: "12:30 PM",
    type: "delivery",
  },
  {
    id: "DEL-003",
    ticketNumber: "REP-2026-00455",
    customerName: "Fatima Noor",
    customerPhone: "+92 311 2223344",
    address: "Plot 7, Model Town Extension, Lahore",
    deviceType: "Dell Laptop",
    driver: null,
    status: "pending",
    scheduledTime: "2:00 PM",
    type: "pickup",
  },
  {
    id: "DEL-004",
    ticketNumber: "REP-2026-00453",
    customerName: "Bilal Sheikh",
    customerPhone: "+92 345 7778899",
    address: "House 4, Johar Town, Lahore",
    deviceType: "iPad Pro",
    driver: "Asif Mehmood",
    status: "assigned",
    scheduledTime: "3:30 PM",
    type: "delivery",
  },
];

function StatusBadge({ status }: { status: string }) {
  const s = DELIVERY_STATUSES.find((x) => x.key === status) ?? DELIVERY_STATUSES[0];
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.color}`}>{s.label}</span>;
}

export default function FrontdeskDeliveryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = MOCK_DELIVERIES.filter((d) => {
    const matchSearch = d.customerName.toLowerCase().includes(search.toLowerCase()) ||
      d.ticketNumber.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.status === filter || d.type === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    pending: MOCK_DELIVERIES.filter((d) => d.status === "pending").length,
    inProgress: MOCK_DELIVERIES.filter((d) => d.status === "en_route" || d.status === "assigned").length,
    delivered: MOCK_DELIVERIES.filter((d) => d.status === "delivered").length,
  };

  return (
    <DashboardShell requiredRole="frontdesk">
      {(user) => (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-foreground">Delivery Management</h1>
              <p className="text-muted-foreground font-medium mt-0.5">Today's pickups and deliveries</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all text-sm">
              <Plus size={16} />
              Schedule Delivery
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-amber-500">{stats.pending}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Pending</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-blue-500">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">In Progress</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-500">{stats.delivered}</p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">Delivered</p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by customer or ticket…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
              />
            </div>
            <div className="flex gap-2">
              {[
                { key: "all", label: "All" },
                { key: "pending", label: "Pending" },
                { key: "en_route", label: "En Route" },
                { key: "pickup", label: "Pickups" },
                { key: "delivery", label: "Deliveries" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                    filter === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Delivery List */}
          <div className="space-y-3">
            {filtered.map((d) => (
              <div key={d.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      d.type === "pickup" ? "bg-orange-100 dark:bg-orange-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                    }`}>
                      {d.type === "pickup" ? (
                        <Package size={18} className="text-orange-600 dark:text-orange-400" />
                      ) : (
                        <Truck size={18} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">{d.ticketNumber}</p>
                      <p className="text-xs text-muted-foreground capitalize">{d.type} · {d.scheduledTime}</p>
                    </div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mb-3">
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-muted-foreground" />
                    <span className="font-semibold text-foreground">{d.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-muted-foreground" />
                    <a href={`tel:${d.customerPhone}`} className="text-primary font-medium">{d.customerPhone}</a>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin size={13} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground text-xs truncate">{d.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package size={13} className="text-muted-foreground" />
                    <span className="text-muted-foreground">{d.deviceType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck size={13} className="text-muted-foreground" />
                    {d.driver ? (
                      <span className="text-foreground font-medium">{d.driver}</span>
                    ) : (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <AlertCircle size={12} />
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>

                {d.status === "pending" && (
                  <button className="w-full py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-sm hover:bg-primary/20 transition-all">
                    Assign Driver
                  </button>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="bg-card border border-border rounded-2xl p-10 text-center">
                <Truck size={32} className="text-muted-foreground mx-auto mb-2" />
                <p className="font-bold text-foreground">No deliveries found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
