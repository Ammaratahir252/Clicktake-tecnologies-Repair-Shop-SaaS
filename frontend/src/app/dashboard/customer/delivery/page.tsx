'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/DashboardShell'
import PortalFeatureGuard from '@/components/PortalFeatureGuard'
import GpsMap from '@/components/GpsMap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import api from '@/lib/api'
import {
  MapPin, Phone, Clock, Truck, CheckCircle, User,
  ArrowRight, Info, Package, Bike, Rocket,
  FileText, Satellite, Loader2, AlertCircle, Map,
} from 'lucide-react'

// ------- Types -------
type DeliveryStatus = 'preparing' | 'on_the_way' | 'delivered'

// ------- Timeline steps -------
const timelineSteps: { key: DeliveryStatus; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'preparing',   label: 'Preparing',  icon: <Package className="w-5 h-5" />, desc: 'Repair in progress or awaiting handover' },
  { key: 'on_the_way',  label: 'On The Way', icon: <Rocket className="w-5 h-5" />,  desc: 'Ready — out for delivery' },
  { key: 'delivered',   label: 'Delivered',  icon: <CheckCircle className="w-5 h-5" />, desc: 'Delivered successfully' },
]

const statusOrder: DeliveryStatus[] = ['preparing', 'on_the_way', 'delivered']

const statusColorMap: Record<DeliveryStatus, string> = {
  preparing:  'bg-yellow-500',
  on_the_way: 'bg-primary',
  delivered:  'bg-green-500',
}

const statusLabelMap: Record<DeliveryStatus, string> = {
  preparing:  'Preparing',
  on_the_way: 'On The Way',
  delivered:  'Delivered',
}

function toDeliveryStatus(ticketStatus: string): DeliveryStatus {
  if (ticketStatus === 'delivered') return 'delivered'
  if (ticketStatus === 'ready') return 'on_the_way'
  return 'preparing'
}

// ======= Main Component =======
export default function DeliveryTrackingPage() {
  const [activeTicket, setActiveTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // ── GPS (Module: Global GPS) — real ticket + delivery-location capture ──
  const [gpsState, setGpsState] = useState<'idle' | 'locating' | 'saving' | 'done' | 'error'>('idle')
  const [gpsError, setGpsError] = useState('')
  const [savedLocation, setSavedLocation] = useState<any>(null)
  const [liveTracking, setLiveTracking] = useState<any>(null)

  useEffect(() => {
    api.get('/api/tickets')
      .then((res) => {
        const tickets: any[] = res.data?.data ?? []
        // Prefer a ticket that's actually out for delivery / just delivered over an early-stage one
        const active =
          tickets.find((t) => t.status === 'ready') ??
          tickets.find((t) => t.status === 'delivered') ??
          tickets.find((t) => !['cancelled'].includes(t.status)) ??
          tickets[0]
        setActiveTicket(active ?? null)
        if (active?.deliveryLocation?.lat) setSavedLocation(active.deliveryLocation)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Poll the assigned technician/driver's live position while the ticket is out for delivery.
  useEffect(() => {
    if (!activeTicket?._id) return
    if (!['ready', 'delivered'].includes(activeTicket.status)) return

    const poll = () => {
      api.get(`/api/tickets/${activeTicket._id}/driver-location`)
        .then((res) => setLiveTracking(res.data?.data ?? null))
        .catch(() => {})
    }
    poll()
    const interval = setInterval(poll, 15000)
    return () => clearInterval(interval)
  }, [activeTicket?._id, activeTicket?.status])

  const setDeliveryLocation = () => {
    if (!navigator.geolocation) {
      setGpsState('error')
      setGpsError('GPS is not supported on this device/browser.')
      return
    }
    if (!activeTicket?._id) {
      setGpsState('error')
      setGpsError('No active repair ticket found to attach a delivery location to.')
      return
    }
    setGpsState('locating')
    setGpsError('')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setGpsState('saving')
        try {
          const res = await api.patch(`/api/tickets/${activeTicket._id}/delivery-location`, {
            lat: latitude,
            lng: longitude,
          })
          setSavedLocation(res.data?.data ?? { lat: latitude, lng: longitude })
          setGpsState('done')
          setTimeout(() => setGpsState('idle'), 4000)
        } catch {
          setGpsState('error')
          setGpsError('Failed to save your delivery location. Please try again.')
        }
      },
      (err) => {
        setGpsState('error')
        setGpsError(err.message || 'Unable to get your location.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  }

  if (loading) {
    return (
      <DashboardShell requiredRole="customer">
        {() => (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading delivery status…
          </div>
        )}
      </DashboardShell>
    )
  }

  if (!activeTicket) {
    return (
      <DashboardShell requiredRole="customer">
        {() => (
          <PortalFeatureGuard feature="showDelivery">
            <div className="max-w-2xl mx-auto text-center py-24">
              <Truck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h1 className="text-xl font-bold text-foreground mb-1">No deliveries to track yet</h1>
              <p className="text-sm text-muted-foreground">Once you have an active repair, its delivery status will show up here.</p>
            </div>
          </PortalFeatureGuard>
        )}
      </DashboardShell>
    )
  }

  const deviceName = `${activeTicket.deviceBrand ?? ''} ${activeTicket.deviceModel ?? ''}`.trim()
  const deliveryStatus = toDeliveryStatus(activeTicket.status)
  const currentIdx = statusOrder.indexOf(deliveryStatus)
  const progressPct = Math.round(((currentIdx + 1) / statusOrder.length) * 100)
  const driver = activeTicket.technicianId
  const deliveryAddress = savedLocation?.address || activeTicket.customerId?.address || 'Not set yet'
  const lastUpdatedAt = liveTracking?.driverLocation?.updatedAt || activeTicket.updatedAt

  return (
    <DashboardShell requiredRole="customer">
      {() => (
      <PortalFeatureGuard feature="showDelivery">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Live Delivery Tracking
            </h1>
            <p className="text-sm text-muted-foreground">
              Ticket <strong className="text-primary">{activeTicket.ticketNumber}</strong> · {deviceName}
            </p>
          </div>
          <Badge className="px-4 py-2 text-sm">
            {statusLabelMap[deliveryStatus]}
          </Badge>
        </div>

        {deliveryStatus === 'delivered' && (
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 flex items-center gap-4">
            <CheckCircle className="w-12 h-12" />
            <div>
              <div className="text-sm opacity-90">Status</div>
              <div className="text-xl font-bold">Device Delivered Successfully!</div>
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
                  <h3 className="font-semibold">Delivery Progress</h3>
                  <span className="text-sm font-semibold text-primary">{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="mb-6 h-2" />

                {/* Timeline */}
                <div className="space-y-0">
                  {timelineSteps.map((step, idx) => {
                    const isDone = idx <= currentIdx
                    const isCurrent = idx === currentIdx
                    const isLast = idx === timelineSteps.length - 1

                    return (
                      <div key={step.key} className="flex gap-4">
                        <div className="flex flex-col items-center" style={{ width: 40 }}>
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                              isDone ? statusColorMap[deliveryStatus] + ' text-white' : 'bg-muted text-muted-foreground'
                            } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                          >
                            {step.icon}
                          </div>
                          {!isLast && (
                            <div
                              className={`w-0.5 flex-1 min-h-7 transition-colors ${
                                idx < currentIdx ? statusColorMap[deliveryStatus] : 'bg-border'
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
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Live Map */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4" />
                    <CardTitle className="text-base">Live Map</CardTitle>
                  </div>
                  {liveTracking?.driverLocation && (
                    <Badge variant="default" className="text-xs flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Live
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {liveTracking?.driverLocation && (liveTracking?.destination || savedLocation) ? (
                  <GpsMap
                    height={240}
                    className="rounded-none border-0"
                    markers={[
                      {
                        lng: liveTracking.driverLocation.lng,
                        lat: liveTracking.driverLocation.lat,
                        color: "#6366f1",
                        popupText: liveTracking.driverLocation.driverName ?? "Your technician",
                        pulse: true,
                      },
                      ...(liveTracking?.destination || savedLocation
                        ? [{
                            lng: (liveTracking?.destination ?? savedLocation).lng,
                            lat: (liveTracking?.destination ?? savedLocation).lat,
                            color: "#ef4444",
                            popupText: "Delivery address",
                          }]
                        : []),
                    ]}
                  />
                ) : (
                  <div className="h-60 bg-muted relative overflow-hidden flex items-center justify-center">
                    <div className="text-center px-6">
                      <Bike className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {deliveryStatus === 'preparing'
                          ? "The map will appear here once your device is out for delivery."
                          : "Waiting for live GPS from your technician…"}
                      </p>
                    </div>
                    <div className="absolute bottom-0 right-0 bg-card/90 backdrop-blur-sm px-2 py-1 text-xs text-muted-foreground border-t border-l border-border rounded-tl">
                      <Info className="w-3 h-3 inline mr-1" />
                      Live GPS updates every 15s
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* Driver / Technician Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <CardTitle className="text-base">Your Technician</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {driver ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-13 h-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                        {(driver.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="font-bold">{driver.name}</div>
                    </div>
                    {driver.phone && (
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span>{driver.phone}</span>
                        </div>
                      </div>
                    )}
                    {driver.phone && (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <a href={`tel:${driver.phone}`}>
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </a>
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Not yet assigned.</p>
                )}
              </CardContent>
            </Card>

            {/* Delivery Details */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <CardTitle className="text-base">Delivery Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Delivery Address
                  </div>
                  <div className="text-sm font-medium">{deliveryAddress}</div>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Device</div>
                    <div className="text-sm font-medium">{deviceName || '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Ticket</div>
                    <div className="text-sm font-medium text-primary">{activeTicket.ticketNumber}</div>
                  </div>
                </div>
                <hr className="border-border" />
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium">{lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleString() : '—'}</span>
                </div>

                {/* ── GPS (Module: Global GPS) — set precise drop-off point ── */}
                <hr className="border-border" />
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    Precise Delivery Location
                  </div>
                  {savedLocation?.lat ? (
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Pin set{savedLocation.address ? `: ${savedLocation.address}` : ` (${savedLocation.lat.toFixed(4)}, ${savedLocation.lng.toFixed(4)})`}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Set your exact GPS pin so the driver can find you precisely — works anywhere in the world.
                    </p>
                  )}
                  {gpsError && (
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      {gpsError}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex items-center gap-2"
                    onClick={setDeliveryLocation}
                    disabled={gpsState === 'locating' || gpsState === 'saving'}
                  >
                    {gpsState === 'locating' || gpsState === 'saving' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Satellite className="w-4 h-4" />
                    )}
                    {gpsState === 'locating' ? 'Locating…' : gpsState === 'saving' ? 'Saving…' : 'Set delivery location with GPS'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-2">
                <Button className="w-full" size="sm" asChild>
                  <Link href="/dashboard/customer/track">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    View Repair Ticket Details
                  </Link>
                </Button>
                {deliveryStatus === 'delivered' && (
                  <Button variant="outline" className="w-full flex items-center gap-2" size="sm" asChild>
                    <Link href="/dashboard/customer/review">
                      <FileText className="w-4 h-4" />
                      Leave a Review
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </PortalFeatureGuard>
      )}
    </DashboardShell>
  )
}
