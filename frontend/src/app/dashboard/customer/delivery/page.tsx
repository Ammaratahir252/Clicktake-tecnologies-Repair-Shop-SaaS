'use client'

import React, { useEffect, useMemo, useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import PortalFeatureGuard from '@/components/PortalFeatureGuard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  MapPin, Phone, Clock, Truck, CheckCircle, User,
  ArrowRight, Info, Package, Wrench, FileCheck, ThumbsUp,
  MessageCircle, FileText, Loader2, Navigation, PackageSearch,
} from 'lucide-react'
import api from '@/lib/api'

// ------- Real ticket status vocabulary (from src/lib/enums.ts TicketStatus) -------
type RealStatus =
  | 'received' | 'diagnosed' | 'estimate_sent' | 'approved'
  | 'in_repair' | 'ready' | 'delivered' | 'cancelled'

const timelineSteps: { key: RealStatus; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'received',      label: 'Received',      icon: <Package className="w-5 h-5" />,     desc: 'Device checked in at the shop' },
  { key: 'diagnosed',     label: 'Diagnosed',      icon: <PackageSearch className="w-5 h-5" />, desc: 'Technician identified the issue' },
  { key: 'estimate_sent', label: 'Estimate Sent',  icon: <FileCheck className="w-5 h-5" />,    desc: 'Cost estimate sent for approval' },
  { key: 'approved',      label: 'Approved',       icon: <ThumbsUp className="w-5 h-5" />,     desc: 'Repair approved and queued' },
  { key: 'in_repair',     label: 'In Repair',      icon: <Wrench className="w-5 h-5" />,       desc: 'Technician is working on your device' },
  { key: 'ready',         label: 'Ready',          icon: <CheckCircle className="w-5 h-5" />,  desc: 'Ready for pickup / delivery' },
  { key: 'delivered',     label: 'Delivered',      icon: <Truck className="w-5 h-5" />,        desc: 'Delivered / collected' },
]

const statusOrder: RealStatus[] = ['received', 'diagnosed', 'estimate_sent', 'approved', 'in_repair', 'ready', 'delivered']

// Badge component only ships color variants for a subset of keys
// (received/diagnosed/repair/qc/ready/delivered/cancelled) — map the full
// TicketStatus set onto those so every status still renders with a color.
function badgeVariant(status: RealStatus): 'received' | 'diagnosed' | 'repair' | 'qc' | 'ready' | 'delivered' | 'cancelled' {
  const map: Record<RealStatus, 'received' | 'diagnosed' | 'repair' | 'qc' | 'ready' | 'delivered' | 'cancelled'> = {
    received: 'received',
    diagnosed: 'diagnosed',
    estimate_sent: 'qc',
    approved: 'repair',
    in_repair: 'repair',
    ready: 'ready',
    delivered: 'delivered',
    cancelled: 'cancelled',
  }
  return map[status] ?? 'received'
}

function pickDeliveryTicket(tickets: any[]): any | null {
  if (!tickets.length) return null

  // Prefer tickets that actually have a driver assigned or a location fix,
  // and are at/near the delivery stage.
  const withDriver = tickets.filter(
    (t) => (t.driverId || t.driverLocation) && ['ready', 'delivered'].includes(t.status)
  )
  if (withDriver.length > 0) {
    return withDriver.sort(
      (a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
    )[0]
  }

  // Otherwise fall back to the most recently updated non-terminal ticket.
  const active = tickets.filter((t) => !['delivered', 'cancelled'].includes(t.status))
  if (active.length > 0) {
    return active.sort(
      (a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
    )[0]
  }

  // Last resort: most recently updated ticket of any kind.
  return [...tickets].sort(
    (a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
  )[0]
}

function timeAgo(iso?: string): string {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// ======= Main Component =======
export default function DeliveryTrackingPage() {
  return (
    <DashboardShell requiredRole="customer">
      {() => (
        <PortalFeatureGuard feature="showDelivery">
          <DeliveryContent />
        </PortalFeatureGuard>
      )}
    </DashboardShell>
  )
}

function DeliveryContent() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get('/api/tickets')
      .then((res) => {
        const data = res.data?.data
        setTickets(Array.isArray(data) ? data : [data].filter(Boolean))
      })
      .catch((err) => setError(err.response?.data?.message || 'Could not load your repairs.'))
      .finally(() => setLoading(false))
  }, [])

  const ticket = useMemo(() => pickDeliveryTicket(tickets), [tickets])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading delivery status…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive font-medium max-w-3xl mx-auto">
        {error}
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 max-w-3xl mx-auto text-center">
        <Truck size={40} className="opacity-40" />
        <p className="font-medium">No repairs to track yet.</p>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/customer/shops">Find a shop &amp; book a repair</a>
        </Button>
      </div>
    )
  }

  const status: RealStatus = (ticket.status as RealStatus) ?? 'received'
  const isCancelled = status === 'cancelled'
  const currentIdx = statusOrder.indexOf(status)
  const progressPct = isCancelled ? 100 : Math.round(((currentIdx + 1) / statusOrder.length) * 100)

  const statusHistory: any[] = ticket.statusHistory ?? []
  const stepTimestamp = (key: RealStatus) => {
    const entry = [...statusHistory].reverse().find((h) => h.toStatus === key)
    return entry?.createdAt as string | undefined
  }

  const driver = ticket.driverId && typeof ticket.driverId === 'object' ? ticket.driverId : null
  const driverLocation = ticket.driverLocation as { lat: number; lng: number; updatedAt: string } | undefined
  const mapsLink = driverLocation ? `https://maps.google.com/?q=${driverLocation.lat},${driverLocation.lng}` : null
  const mapsEmbed = driverLocation
    ? `https://www.google.com/maps?q=${driverLocation.lat},${driverLocation.lng}&z=15&output=embed`
    : null

  const deviceName = `${ticket.deviceBrand ?? ''} ${ticket.deviceModel ?? ''}`.trim() || 'Your device'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Delivery &amp; Repair Tracking
          </h1>
          <p className="text-sm text-muted-foreground">
            Ticket <strong className="text-primary">{ticket.ticketNumber}</strong> · {deviceName}
          </p>
        </div>
        <Badge variant={badgeVariant(status)} className="px-4 py-2 text-sm">
          {timelineSteps.find((s) => s.key === status)?.label ?? status}
        </Badge>
      </div>

      {/* ── Status banner ── */}
      {!isCancelled && status !== 'delivered' && (
        <div className="bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg p-6 flex items-center gap-4 flex-wrap">
          <Truck className="w-12 h-12 shrink-0" />
          <div className="flex-1 min-w-[180px]">
            <div className="text-sm opacity-90">Current Stage</div>
            <div className="text-2xl font-bold">
              {timelineSteps.find((s) => s.key === status)?.label ?? status}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-90">Last Updated</div>
            <div className="text-xl font-bold">{timeAgo(ticket.updatedAt)}</div>
          </div>
        </div>
      )}

      {status === 'delivered' && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 flex items-center gap-4">
          <CheckCircle className="w-12 h-12" />
          <div>
            <div className="text-sm opacity-90">Status</div>
            <div className="text-xl font-bold">Device Delivered Successfully!</div>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 flex items-center gap-4">
          <Info className="w-10 h-10 text-destructive" />
          <div>
            <div className="text-sm text-destructive/80">Status</div>
            <div className="text-xl font-bold text-destructive">This repair was cancelled.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left Column ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Repair Progress</h3>
                <span className="text-sm font-semibold text-primary">{progressPct}%</span>
              </div>
              <Progress value={progressPct} className="mb-6 h-2" />

              {/* Timeline — driven by the ticket's real statusHistory */}
              <div className="space-y-0">
                {timelineSteps.map((step, idx) => {
                  const isDone = !isCancelled && idx <= currentIdx
                  const isCurrent = !isCancelled && idx === currentIdx
                  const isLast = idx === timelineSteps.length - 1
                  const ts = stepTimestamp(step.key)

                  return (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center" style={{ width: 40 }}>
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                            isDone ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                          } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                        >
                          {step.icon}
                        </div>
                        {!isLast && (
                          <div
                            className={`w-0.5 flex-1 min-h-7 transition-colors ${
                              idx < currentIdx && !isCancelled ? 'bg-primary' : 'bg-border'
                            }`}
                          />
                        )}
                      </div>

                      <div className="pb-6 pt-2">
                        <div className={`font-semibold text-sm ${isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                          {isCurrent && (
                            <Badge variant="secondary" className="ml-2 text-xs">Current</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{step.desc}</div>
                        {ts && (
                          <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                            {new Date(ts).toLocaleString('en-PK')}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Honest location panel — real driverLocation or an honest empty state */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <CardTitle className="text-base">Driver Location</CardTitle>
                </div>
                {driverLocation && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Last known
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {driverLocation ? (
                <div>
                  <div className="h-60 bg-muted relative overflow-hidden">
                    <iframe
                      title="Driver last known location"
                      src={mapsEmbed!}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
                    <span>Updated {timeAgo(driverLocation.updatedAt)}</span>
                    <a
                      href={mapsLink!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                    >
                      <Navigation className="w-3 h-3" /> Open in Google Maps
                    </a>
                  </div>
                </div>
              ) : (
                <div className="py-10 px-6 text-center text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">
                    {driver ? 'Driver has not shared a location yet.' : 'No driver assigned yet.'}
                  </p>
                  <p className="text-xs mt-1 text-muted-foreground/70">
                    Live location appears here once your driver shares it from the field.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column ── */}
        <div className="space-y-6">
          {/* Driver Card — real driver info if assigned, honest empty state otherwise */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <CardTitle className="text-base">Your Driver</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {driver ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                      {(driver.name ?? '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold">{driver.name ?? 'Driver'}</div>
                      <div className="text-xs text-muted-foreground">{driver.email}</div>
                    </div>
                  </div>

                  {driver.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{driver.phone}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" disabled={!driver.phone} asChild={!!driver.phone}>
                      {driver.phone ? (
                        <a href={`tel:${driver.phone}`}>
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </a>
                      ) : (
                        <span>
                          <Phone className="w-4 h-4 mr-1" />
                          No phone on file
                        </span>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No driver assigned to this ticket yet.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Repair Details */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <CardTitle className="text-base">Repair Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Issue</div>
                <div className="text-sm font-medium">{ticket.issue}</div>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Device</div>
                  <div className="text-sm font-medium">{deviceName}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ticket</div>
                  <div className="text-sm font-medium text-primary">{ticket.ticketNumber}</div>
                </div>
              </div>
              <hr className="border-border" />
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Updated:</span>
                <span className="font-medium">{timeAgo(ticket.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-2">
              <Button className="w-full" size="sm" asChild>
                <a href={`/dashboard/customer/track?ticket=${ticket._id}`}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  View Repair Ticket Details
                </a>
              </Button>
              {status === 'delivered' && (
                <Button variant="outline" className="w-full flex items-center gap-2" size="sm" asChild>
                  <a href="/dashboard/customer/review">
                    <FileText className="w-4 h-4" />
                    Leave a Review
                  </a>
                </Button>
              )}
              <Button variant="outline" className="w-full flex items-center gap-2" size="sm" asChild>
                <a href="/dashboard/customer/chat">
                  <MessageCircle className="w-4 h-4" />
                  Chat with Us
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Made with Bob
