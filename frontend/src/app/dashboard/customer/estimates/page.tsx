'use client'

import React, { useEffect, useState, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import PortalFeatureGuard from '@/components/PortalFeatureGuard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText, Search, Filter, CheckCircle, XCircle, Clock, AlertTriangle,
  Download, Smartphone, Info, Loader2, Wallet,
} from 'lucide-react'
import api from '@/lib/api'
import { useTenantCurrency } from '@/lib/useTenantCurrency'

type EstimateStatus = 'pending' | 'approved' | 'rejected' | 'expired'

interface Estimate {
  id:          string
  ticketId:    string
  device:      string
  issue:       string
  status:      EstimateStatus
  createdDate: string
  technician:  string
  amount:      number
  notes:       string
}

type GatewayKey = 'easypaisa' | 'jazzcash' | 'stripe' | 'paypal'

const GATEWAY_LABELS: Record<GatewayKey, string> = {
  easypaisa: 'EasyPaisa',
  jazzcash: 'JazzCash',
  stripe: 'Stripe',
  paypal: 'PayPal',
}

const STATUS_CONFIG: Record<EstimateStatus, { color: string; icon: React.ElementType; label: string }> = {
  pending:  { color: 'bg-amber-500',  icon: Clock,          label: 'Pending'  },
  approved: { color: 'bg-emerald-500', icon: CheckCircle,   label: 'Approved' },
  rejected: { color: 'bg-red-500',    icon: XCircle,        label: 'Rejected' },
  expired:  { color: 'bg-gray-500',   icon: AlertTriangle,  label: 'Expired'  },
}

function ticketToEstimate(t: any): Estimate {
  let status: EstimateStatus = 'pending'
  if (t.status === 'approved' || t.status === 'in_repair' || t.status === 'ready' || t.status === 'delivered') {
    status = 'approved'
  } else if (t.status === 'cancelled') {
    status = 'rejected'
  } else if (t.status === 'estimate_sent' || t.status === 'diagnosed') {
    status = 'pending'
  }
  return {
    id:          t.ticketNumber,
    ticketId:    t._id,
    device:      `${t.deviceBrand} ${t.deviceModel}`.trim(),
    issue:       t.issue,
    status,
    createdDate: new Date(t.createdAt).toLocaleDateString('en-PK'),
    technician:  t.technicianId?.name ?? 'Unassigned',
    amount:      t.estimateAmount ?? 0,
    notes:       t.diagnosisNotes ?? '',
  }
}

export default function EstimatesPage() {
  return (
    <DashboardShell requiredRole="customer">
      {() => (
        <PortalFeatureGuard feature="showEstimates">
          <EstimatesContent />
        </PortalFeatureGuard>
      )}
    </DashboardShell>
  )
}

function EstimatesContent() {
  const { format } = useTenantCurrency()
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected]   = useState<Estimate | null>(null)
  const [paying, setPaying]       = useState<GatewayKey | null>(null)
  const [payError, setPayError]   = useState('')
  const [payInfo, setPayInfo]     = useState('')
  const [enabledGateways, setEnabledGateways] = useState<GatewayKey[]>([])

  const payVia = async (gateway: GatewayKey, ticketId: string) => {
    setPaying(gateway)
    setPayError('')
    setPayInfo('')
    try {
      const res = await api.post(`/api/payments/${gateway}/initiate`, { ticketId })
      const data = res.data?.data
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setPayInfo(data?.responseDesc || `Payment initiated — follow the instructions in your ${GATEWAY_LABELS[gateway]} app to complete it.`)
      }
    } catch (err: any) {
      setPayError(err.response?.data?.message || 'Could not start payment. Please try again.')
    } finally {
      setPaying(null)
    }
  }

  useEffect(() => {
    api.get('/api/tickets')
      .then((res) => {
        const tickets: any[] = res.data?.data ?? []
        const withEstimate = tickets.filter((t) => t.estimateAmount && t.estimateAmount > 0)
        setEstimates(withEstimate.map(ticketToEstimate))
      })
      .catch(() => setEstimates([]))
      .finally(() => setLoading(false))

    api.get('/api/tenant/payment-config')
      .then((res) => {
        const data = res.data?.data ?? {}
        const enabled = (Object.keys(data) as GatewayKey[]).filter((gw) => data[gw]?.enabled)
        setEnabledGateways(enabled)
      })
      .catch(() => setEnabledGateways([]))
  }, [])

  const filtered = useMemo(() => {
    return estimates.filter((e) => {
      const matchSearch =
        e.id.toLowerCase().includes(search.toLowerCase()) ||
        e.device.toLowerCase().includes(search.toLowerCase()) ||
        e.issue.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || e.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, estimates])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading estimates…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Repair Estimates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve repair estimates from our technicians
          </p>
        </div>
        <Badge variant="default" className="bg-amber-500 text-white px-4 py-2">
          {estimates.filter((e) => e.status === 'pending').length} Pending
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['pending', 'approved', 'rejected', 'expired'] as EstimateStatus[]).map((s) => {
          const config = STATUS_CONFIG[s]
          const Icon = config.icon
          const count = estimates.filter((e) => e.status === s).length
          return (
            <Card key={s}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`${config.color} w-10 h-10 rounded-xl flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground capitalize">{config.label}</p>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, device or issue..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimates List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No estimates found</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((est) => {
            const config = STATUS_CONFIG[est.status]
            const Icon = config.icon
            return (
              <Card key={est.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-foreground">{est.id}</span>
                        <Badge variant="outline" className={`${config.color} text-white border-0`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Smartphone className="w-4 h-4" />
                        <span>{est.device}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{est.issue}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Created: {est.createdDate}</span>
                        <span>Technician: {est.technician}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {format(est.amount)}
                      </p>
                      <Button size="sm" onClick={() => { setSelected(est); setPayError(''); setPayInfo('') }} className="mt-2">
                        <Info className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {selected.id}
              </CardTitle>
              <CardDescription>Estimate Details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Device</p>
                  <p className="font-semibold text-foreground">{selected.device}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Issue</p>
                  <p className="font-semibold text-foreground">{selected.issue}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Technician</p>
                  <p className="font-semibold text-foreground">{selected.technician}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className={`${STATUS_CONFIG[selected.status].color} text-white border-0`}>
                    {STATUS_CONFIG[selected.status].label}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Estimate Amount</p>
                  <p className="text-2xl font-bold text-primary">{format(selected.amount)}</p>
                </div>
              </div>

              {selected.notes && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground">{selected.notes}</p>
                  </div>
                </div>
              )}

              {payError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-500">{payError}</p>
                </div>
              )}
              {payInfo && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">{payInfo}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {selected.status === 'approved' && selected.amount > 0 && enabledGateways.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {enabledGateways.map((gw) => (
                      <Button
                        key={gw}
                        onClick={() => payVia(gw, selected.ticketId)}
                        disabled={paying !== null}
                        className="flex-1 min-w-[140px]"
                      >
                        {paying === gw ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wallet className="w-4 h-4 mr-1" />}
                        {paying === gw ? 'Starting…' : `Pay via ${GATEWAY_LABELS[gw]}`}
                      </Button>
                    ))}
                  </div>
                )}
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
