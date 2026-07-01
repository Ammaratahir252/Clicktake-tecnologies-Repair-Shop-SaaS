"use client";

/**
 * FRONT DESK DASHBOARD — /dashboard/frontdesk
 *
 * Per blueprint Section 5.1 Role 4:
 * - Create new repair tickets (device intake)
 * - Search and create customer profiles
 * - Assign tickets to available technicians
 * - Update ticket status: Received, Ready for Pickup, Delivered
 * - Process payments at point of sale
 * - Print receipts, invoices, and ticket labels
 * - Check in doorstep delivery/pickup requests
 * - CANNOT: edit estimates, access financial reports, manage inventory,
 *   create user accounts, view leads
 */

import DashboardShell from "@/components/DashboardShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Ticket, Users, CreditCard, Printer, Truck,
  ChevronRight, ShieldCheck, Info, AlertCircle
} from "lucide-react";

const MODULES = [
  {
    key: "create-ticket",
    icon: Ticket,
    title: "New Ticket",
    desc: "Create a repair ticket for walk-in customer",
    href: "/dashboard/frontdesk/tickets/new",
    color: "bg-emerald-600",
    badge: "Primary Action",
  },
  {
    key: "tickets",
    icon: Ticket,
    title: "All Tickets",
    desc: "View and update tickets from your shift",
    href: "/dashboard/frontdesk/tickets",
    color: "bg-blue-600",
    badge: null,
  },
  {
    key: "customers",
    icon: Users,
    title: "Customers",
    desc: "Search profiles or create new customer",
    href: "/dashboard/frontdesk/customers",
    color: "bg-purple-600",
    badge: null,
  },
  {
    key: "payments",
    icon: CreditCard,
    title: "Process Payment",
    desc: "Cash, card, JazzCash, EasyPaisa",
    href: "/dashboard/frontdesk/payments",
    color: "bg-amber-500",
    badge: null,
  },
  {
    key: "print",
    icon: Printer,
    title: "Print / Labels",
    desc: "Print receipts, invoices, ticket labels",
    href: "/dashboard/frontdesk/print",
    color: "bg-slate-600",
    badge: null,
  },
  {
    key: "delivery",
    icon: Truck,
    title: "Doorstep Intake",
    desc: "Check in pickup/delivery requests",
    href: "/dashboard/frontdesk/delivery",
    color: "bg-rose-500",
    badge: null,
  },
];

// Valid statuses front desk can set — per blueprint
const ALLOWED_STATUSES = [
  { value: "received",  label: "Received",          color: "bg-slate-100 text-slate-700" },
  { value: "ready",     label: "Ready for Pickup",  color: "bg-emerald-100 text-emerald-700" },
  { value: "delivered", label: "Delivered",         color: "bg-blue-100 text-blue-700" },
];

export default function FrontDeskDashboard() {
  return (
    <DashboardShell requiredRole="frontdesk">
      {(user) => (
        <div className="space-y-6">

          {/* ── Module Cards ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
              Your Tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MODULES.map(({ key, icon: Icon, title, desc, href, color, badge }) => (
                <Card key={key} className="relative hover:shadow-md transition-all group active:scale-[0.98]">
                  <a href={href} className="block">
                    <CardContent className="p-5 flex items-center gap-4">
                      {badge && (
                        <Badge className="absolute top-3 right-3 text-[10px]" variant="default">
                          {badge}
                        </Badge>
                      )}
                      <div className={`${color} w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md`}>
                        <Icon className="text-white w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm">{title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
                    </CardContent>
                  </a>
                </Card>
              ))}
            </div>
          </section>

          {/* ── Ticket Status Quick Reference ─────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info size={16} className="text-primary" />
                <CardTitle className="text-sm">Status Updates You Can Make</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {ALLOWED_STATUSES.map((s) => (
                  <Badge
                    key={s.value}
                    variant="secondary"
                    className={s.color}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Diagnosis, estimate, and repair statuses are updated by technicians and managers only.
              </p>
            </CardContent>
          </Card>

          {/* ── Access Restrictions ───────────────────────────────────────── */}
          <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
            <CardContent className="pt-6 flex items-start gap-3">
              <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Front Desk Access</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  You can create tickets, manage customers, process payments, and handle intake. You
                  cannot access financial reports, edit estimates, manage inventory stock, or create
                  user accounts. Contact your manager for those actions.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* ── Quick Tips ────────────────────────────────────────────────── */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-100 dark:border-blue-800">
            <CardContent className="pt-6 flex items-start gap-3">
              <AlertCircle size={18} className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Ticket Intake Checklist</p>
                <ol className="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-decimal ml-4">
                  <li>Search for existing customer by phone or email first</li>
                  <li>If new customer, create profile before creating ticket</li>
                  <li>Always capture device brand, model, and issue description</li>
                  <li>Take damage photos at intake — protects shop from disputes</li>
                  <li>Assign ticket to an available technician before saving</li>
                </ol>
              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </DashboardShell>
  );
}
