"use client";

import DashboardShell from "@/components/DashboardShell";
import TicketDetail from "@/components/tickets/TicketDetail";
import { ChevronLeft, Wrench, AlertCircle, Clock, User, Phone, MapPin, Package, FileText, Camera, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function TechnicianTicketDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <DashboardShell requiredRole="technician">
      {(user) => (
        <div className="space-y-6">
          {/* Header with Back Button */}
          <div className="space-y-4 animate-in fade-in slide-in-from-top duration-500">
            <Link
              href="/dashboard/technician/tickets"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-bold text-sm transition-colors group"
            >
              <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Back to Tickets
            </Link>

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Wrench size={24} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl font-black text-foreground truncate">
                    Ticket #{params.id}
                  </h1>
                  <p className="text-muted-foreground font-medium mt-1">Repair Details & Diagnostics</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Status</p>
                  <span className="inline-block mt-1 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-bold text-xs">
                    In Progress
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-card border border-border rounded-2xl animate-in fade-in slide-in-from-top duration-700 delay-100">
            <div className="flex items-center gap-1 p-1 border-b border-border">
              {[
                { id: "details", label: "Details", icon: FileText },
                { id: "diagnostics", label: "Diagnostics", icon: AlertCircle },
                { id: "time", label: "Time Log", icon: Clock },
                { id: "photos", label: "Photos", icon: Camera },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-all duration-300 rounded-lg ${
                    activeTab === id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 space-y-6">
              {activeTab === "details" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <User size={18} className="text-primary" />
                      Customer Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-muted rounded-xl p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Customer Name</p>
                        <p className="font-bold text-foreground">Ahmed Khan</p>
                      </div>
                      <div className="bg-muted rounded-xl p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Contact</p>
                        <a href="tel:+92300123456" className="font-bold text-primary hover:text-primary/80">
                          +92 300 123456
                        </a>
                      </div>
                      <div className="bg-muted rounded-xl p-4 sm:col-span-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Address</p>
                        <p className="text-foreground flex items-start gap-2">
                          <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                          House 12, Block B, DHA Phase 5, Lahore
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Device Info */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <Package size={18} className="text-primary" />
                      Device Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-muted rounded-xl p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Device Type</p>
                        <p className="font-bold text-foreground">iPhone 15 Pro Max</p>
                      </div>
                      <div className="bg-muted rounded-xl p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Issue</p>
                        <p className="text-foreground">Screen flickering</p>
                      </div>
                      <div className="bg-muted rounded-xl p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Estimated Cost</p>
                        <p className="font-bold text-primary">Rs. 8,500</p>
                      </div>
                      <div className="bg-muted rounded-xl p-4">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Received Date</p>
                        <p className="text-foreground">Jan 15, 2024</p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <FileText size={18} className="text-primary" />
                      Customer Notes
                    </h3>
                    <div className="bg-muted rounded-xl p-4 border border-border">
                      <p className="text-foreground text-sm leading-relaxed">
                        Customer reported screen flickering after dropping the phone. Says it happens randomly, especially when using apps. Wants it fixed ASAP.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "diagnostics" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-4">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                      <AlertCircle size={18} className="text-primary" />
                      Diagnostic Findings
                    </h3>

                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-700/30 rounded-xl p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-400 font-medium">
                        Display connector issue detected. Flex cable may be damaged.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 bg-muted rounded-xl border border-border">
                        <Zap size={18} className="text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-foreground text-sm">Possible Root Cause</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Physical damage to display flex cable or connector pins bent after impact
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="font-bold text-foreground text-sm">Recommended Actions</p>
                        <ul className="space-y-2">
                          <li className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                            Replace display flex cable
                          </li>
                          <li className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                            Test display before reassembly
                          </li>
                          <li className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full mt-1.5 flex-shrink-0"></span>
                            Inspect for any water damage
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Internal Notes */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-foreground">Internal Notes</h3>
                    <textarea
                      placeholder="Add diagnostic notes, findings, or repair progress…"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium text-sm resize-none"
                      rows={4}
                    />
                    <button className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-all text-sm">
                      Save Notes
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "time" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700/30 rounded-xl p-4">
                    <p className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                      <Clock size={16} />
                      Total Time Logged: 2h 45m
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { date: "Jan 15, 2024", time: "1h 30m", task: "Initial diagnosis & disassembly" },
                      { date: "Jan 16, 2024", time: "1h 15m", task: "Flex cable replacement & testing" },
                    ].map((entry, idx) => (
                      <div key={idx} className="bg-muted rounded-xl p-4 border border-border">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-foreground text-sm">{entry.task}</p>
                            <p className="text-xs text-muted-foreground mt-1">{entry.date}</p>
                          </div>
                          <span className="text-primary font-bold text-sm">{entry.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-bold text-foreground">Start/Stop Timer</h4>
                    <button className="w-full px-4 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-all">
                      Start Time Clock
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "photos" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="aspect-square bg-muted rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                      <div className="text-center">
                        <Camera size={24} className="text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-bold">Before Photos</p>
                      </div>
                    </div>
                    <div className="aspect-square bg-muted rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                      <div className="text-center">
                        <Camera size={24} className="text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-bold">After Photos</p>
                      </div>
                    </div>
                  </div>

                  <button className="w-full px-4 py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                    <Camera size={18} />
                    Upload Photos
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-top duration-700 delay-300">
            <h3 className="font-bold text-foreground text-sm">Update Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["Received", "Diagnosed", "In Repair", "Ready"].map((status) => (
                <button
                  key={status}
                  className="px-4 py-2.5 bg-muted hover:bg-primary/10 text-foreground hover:text-primary border border-border hover:border-primary/40 font-bold rounded-lg text-xs transition-all duration-300"
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* TicketDetail Component */}
          <div className="animate-in fade-in slide-in-from-top duration-700 delay-500">
            <TicketDetail 
              ticketId={params.id} 
              rolePath="/dashboard/technician/tickets" 
              userRole="technician" 
            />
          </div>
        </div>
      )}
    </DashboardShell>
  );
}