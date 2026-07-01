'use client'

import React, { useState, useEffect } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  MapPin, Phone, Clock, Truck, CheckCircle, User,
  Star, Map, ArrowRight, Info, Package, Bike, Rocket,
  MessageCircle, FileText
} from 'lucide-react'

// ------- Types -------
type DeliveryStatus = 'preparing' | 'picked_up' | 'on_the_way' | 'delivered'

interface DeliveryJob {
  id: string
  ticketId: string
  deviceName: string
  driverName: string
  driverPhone: string
  driverAvatar: string
  driverRating: number
  vehicleType: string
  vehiclePlate: string
  eta: string
  etaMinutes: number
  status: DeliveryStatus
  distanceLeft: string
  deliveryAddress: string
  updatedAt: string
}

// ------- Mock data -------
const mockDelivery: DeliveryJob = {
  id: 'DLV-2026-00291',
  ticketId: 'REP-2026-00451',
  deviceName: 'iPhone 15 Pro — Space Black',
  driverName: 'Ahmed Raza',
  driverPhone: '+92 312 3456789',
  driverAvatar: 'AR',
  driverRating: 4.8,
  vehicleType: 'Bike',
  vehiclePlate: 'LHR-5521',
  eta: '3:45 PM',
  etaMinutes: 12,
  status: 'on_the_way',
  distanceLeft: '2.3 km',
  deliveryAddress: 'House #12, Street 4, DHA Phase 6, Lahore',
  updatedAt: 'Just now',
}

// ------- Timeline steps -------
const timelineSteps: { key: DeliveryStatus; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'preparing',  label: 'Preparing',   icon: <Package className="w-5 h-5" />, desc: 'Repair verified & packed' },
  { key: 'picked_up', label: 'Picked Up',    icon: <Bike className="w-5 h-5" />, desc: 'Driver collected device' },
  { key: 'on_the_way',label: 'On The Way',   icon: <Rocket className="w-5 h-5" />, desc: 'En route to your address' },
  { key: 'delivered', label: 'Delivered',    icon: <CheckCircle className="w-5 h-5" />, desc: 'Delivered successfully' },
]

const statusOrder: DeliveryStatus[] = ['preparing', 'picked_up', 'on_the_way', 'delivered']

const statusColorMap: Record<DeliveryStatus, string> = {
  preparing:   'bg-yellow-500',
  picked_up:   'bg-blue-500',
  on_the_way:  'bg-primary',
  delivered:   'bg-green-500',
}

const statusLabelMap: Record<DeliveryStatus, string> = {
  preparing:   'Preparing',
  picked_up:   'Picked Up',
  on_the_way:  'On The Way',
  delivered:   'Delivered',
}

// ======= Main Component =======
export default function DeliveryTrackingPage() {
  const delivery = mockDelivery
  const currentIdx = statusOrder.indexOf(delivery.status)
  const progressPct = Math.round(((currentIdx + 1) / statusOrder.length) * 100)
  const [etaLeft, setEtaLeft] = useState(delivery.etaMinutes)

  // Countdown timer
  useEffect(() => {
    if (delivery.status === 'delivered') return
    const interval = setInterval(() => {
      setEtaLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 60_000)
    return () => clearInterval(interval)
  }, [delivery.status])

  return (
    <DashboardShell requiredRole="customer">
      {() => (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Page header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Live Delivery Tracking
            </h1>
            <p className="text-sm text-muted-foreground">
              Ticket <strong className="text-primary">{delivery.ticketId}</strong> · {delivery.deviceName}
            </p>
          </div>
          <Badge className="px-4 py-2 text-sm">
            {statusLabelMap[delivery.status]}
          </Badge>
        </div>

        {/* ── ETA Banner ── */}
        {delivery.status !== 'delivered' && (
          <div className="bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg p-6 flex items-center gap-4">
            <Bike className="w-12 h-12" />
            <div className="flex-1">
              <div className="text-sm opacity-90">Estimated Arrival</div>
              <div className="text-2xl font-bold">
                {delivery.eta} <span className="text-base font-normal opacity-90">(~{etaLeft} min{etaLeft !== 1 ? 's' : ''} away)</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-90">Distance Left</div>
              <div className="text-xl font-bold">{delivery.distanceLeft}</div>
            </div>
          </div>
        )}

        {delivery.status === 'delivered' && (
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
                        {/* Left: icon + connector */}
                        <div className="flex flex-col items-center" style={{ width: 40 }}>
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                              isDone ? statusColorMap[delivery.status] + ' text-white' : 'bg-muted text-muted-foreground'
                            } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                          >
                            {step.icon}
                          </div>
                          {!isLast && (
                            <div
                              className={`w-0.5 flex-1 min-h-7 transition-colors ${
                                idx < currentIdx ? statusColorMap[delivery.status] : 'bg-border'
                              }`}
                            />
                          )}
                        </div>

                        {/* Right: text */}
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

            {/* Map placeholder */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Map className="w-4 h-4" />
                    <CardTitle className="text-base">Live Map</CardTitle>
                  </div>
                  <Badge variant="default" className="text-xs flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-60 bg-muted relative overflow-hidden">
                  {/* Map grid lines */}
                  <svg width="100%" height="100%" className="absolute inset-0 opacity-10">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <React.Fragment key={i}>
                        <line x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="currentColor" strokeWidth="1" />
                        <line x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="currentColor" strokeWidth="1" />
                      </React.Fragment>
                    ))}
                  </svg>

                  {/* Road lines */}
                  <svg width="100%" height="100%" className="absolute inset-0 opacity-20">
                    <path d="M 0 120 Q 200 80 350 130 Q 500 180 700 110" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" />
                    <path d="M 100 0 Q 150 100 200 130 Q 250 160 280 240" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" />
                  </svg>

                  {/* Pulsing driver marker */}
                  <div className="absolute left-[48%] top-[45%] -translate-x-1/2 -translate-y-1/2">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full bg-primary opacity-15 animate-ping" />
                      <div className="absolute inset-1.5 rounded-full bg-primary opacity-25 animate-ping animation-delay-500" />
                      <div className="absolute inset-3 rounded-full bg-primary flex items-center justify-center">
                        <Bike className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Destination pin */}
                  <div className="absolute right-[18%] top-[30%]">
                    <MapPin className="w-6 h-6 text-red-500 fill-red-500" />
                  </div>

                  {/* Map label */}
                  <div className="absolute bottom-0 right-0 bg-card/90 backdrop-blur-sm px-2 py-1 text-xs text-muted-foreground border-t border-l border-border rounded-tl">
                    <Info className="w-3 h-3 inline mr-1" />
                    Mapbox GL JS — Live GPS updates every 30s
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-6">
            {/* Driver Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <CardTitle className="text-base">Your Driver</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-13 h-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                    {delivery.driverAvatar}
                  </div>
                  <div>
                    <div className="font-bold">{delivery.driverName}</div>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-yellow-500">★</span>
                      <span className="font-semibold">{delivery.driverRating}</span>
                      <span className="text-muted-foreground">/ 5.0</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    <span>{delivery.vehicleType} · {delivery.vehiclePlate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{delivery.driverPhone}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={`tel:${delivery.driverPhone}`}>
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>
                </div>
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
                  <div className="text-sm font-medium">{delivery.deliveryAddress}</div>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Device</div>
                    <div className="text-sm font-medium">{delivery.deviceName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Job ID</div>
                    <div className="text-sm font-medium text-primary">{delivery.id}</div>
                  </div>
                </div>
                <hr className="border-border" />
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium">{delivery.updatedAt}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-2">
                <Button className="w-full" size="sm">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  View Repair Ticket Details
                </Button>
                <Button variant="outline" className="w-full flex items-center gap-2" size="sm">
                  <FileText className="w-4 h-4" />
                  Leave a Review
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pulse animation */}
        <style jsx>{`
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
          .animate-ping {
            animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
          .animation-delay-500 {
            animation-delay: 0.5s;
          }
        `}</style>
      </div>
      )}
    </DashboardShell>
  )
}

// Made with Bob
