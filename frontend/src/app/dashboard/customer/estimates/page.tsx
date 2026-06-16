'use client'

import React, { useState, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Smartphone,
  Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type EstimateStatus = 'pending' | 'approved' | 'rejected' | 'expired'

interface EstimateItem {
  description: string
  qty: number
  unitPrice: number
}

interface Estimate {
  id: string
  device: string
  issue: string
  status: EstimateStatus
  createdDate: string
  expiryDate: string
  technician: string
  items: EstimateItem[]
  notes: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const ESTIMATES: Estimate[] = [
  {
    id: 'EST-2024-0018',
    device: 'iPhone 14 Pro',
    issue: 'Screen + Battery Replacement',
    status: 'pending',
    createdDate: '2024-06-03',
    expiryDate: '2024-06-10',
    technician: 'Ali Hassan',
    items: [
      { description: 'OEM Screen Assembly (iPhone 14 Pro)', qty: 1, unitPrice: 7500 },
      { description: 'OEM Battery (iPhone 14 Pro)', qty: 1, unitPrice: 1800 },
      { description: 'Labour Charges', qty: 1, unitPrice: 800 },
    ],
    notes: 'Screen has deep cracks affecting touch functionality. Battery health at 67%. Both replacements recommended.',
  },
  {
    id: 'EST-2024-0014',
    device: 'MacBook Air M1',
    issue: 'Keyboard Replacement',
    status: 'approved',
    createdDate: '2024-05-28',
    expiryDate: '2024-06-04',
    technician: 'Sara Ahmed',
    items: [
      { description: 'MacBook Air M1 Keyboard Assembly', qty: 1, unitPrice: 9500 },
      { description: 'Labour Charges', qty: 1, unitPrice: 1200 },
    ],
    notes: 'Multiple keys not registering. Full keyboard assembly replacement required.',
  },
]

const STATUS_CONFIG: Record<EstimateStatus, { color: string; icon: React.ElementType; label: string }> = {
  pending: { color: 'bg-amber-500', icon: Clock, label: 'Pending' },
  approved: { color: 'bg-emerald-500', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'bg-red-500', icon: XCircle, label: 'Rejected' },
  expired: { color: 'bg-gray-500', icon: AlertTriangle, label: 'Expired' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EstimatesPage() {
  return (
    <DashboardShell requiredRole="customer">
      {(user) => <EstimatesContent />}
    </DashboardShell>
  )
}

function EstimatesContent() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Estimate | null>(null)
  const [signed, setSigned] = useState(false)
  const [actionDone, setActionDone] = useState<Record<string, 'approved' | 'rejected'>>({})

  const filtered = useMemo(() => {
    return ESTIMATES.filter((e) => {
      const matchSearch =
        e.id.toLowerCase().includes(search.toLowerCase()) ||
        e.device.toLowerCase().includes(search.toLowerCase()) ||
        e.issue.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || e.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  const getStatus = (e: Estimate): EstimateStatus => actionDone[e.id] ?? e.status

  const handleAction = (action: 'approved' | 'rejected') => {
    if (!selected) return
    setActionDone((prev) => ({ ...prev, [selected.id]: action }))
    setSelected(null)
    setSigned(false)
  }

  const getTotal = (items: EstimateItem[]) =>
    items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)

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
          {ESTIMATES.filter((e) => (actionDone[e.id] ?? e.status) === 'pending').length} Pending
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['pending', 'approved', 'rejected', 'expired'] as EstimateStatus[]).map((s) => {
          const config = STATUS_CONFIG[s]
          const Icon = config.icon
          const count = ESTIMATES.filter((e) => (actionDone[e.id] ?? e.status) === s).length
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
            const status = getStatus(est)
            const config = STATUS_CONFIG[status]
            const Icon = config.icon
            const total = getTotal(est.items)

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
                        <span>Expires: {est.expiryDate}</span>
                        <span>Technician: {est.technician}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">Rs. {total.toLocaleString()}</p>
                      <Button
                        size="sm"
                        onClick={() => { setSelected(est); setSigned(false) }}
                        className="mt-2"
                      >
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
                  <Badge variant="outline" className={`${STATUS_CONFIG[getStatus(selected)].color} text-white border-0`}>
                    {STATUS_CONFIG[getStatus(selected)].label}
                  </Badge>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Estimate Breakdown</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border-b border-border last:border-0">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{item.description}</p>
                        <span className="text-xs text-muted-foreground">Qty: {item.qty}</span>
                      </div>
                      <span className="font-semibold text-primary">
                        Rs. {(item.qty * item.unitPrice).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center p-3 bg-muted">
                    <strong className="text-foreground">Total</strong>
                    <strong className="text-primary text-lg">Rs. {getTotal(selected.items).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">{selected.notes}</p>
                </div>
              </div>

              {/* Signature for pending */}
              {getStatus(selected) === 'pending' && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Digital Signature</p>
                  <div
                    onClick={() => setSigned(true)}
                    className={`border-2 border-dashed rounded-lg h-20 flex items-center justify-center cursor-pointer transition-colors ${
                      signed ? 'border-emerald-500 bg-emerald-500/10' : 'border-border hover:border-primary'
                    }`}
                  >
                    {signed ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Signed
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Click here to sign digitally</span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setSelected(null)} className="flex-1">
                  Close
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-1" />
                  PDF
                </Button>
                {getStatus(selected) === 'pending' && (
                  <>
                    <Button variant="destructive" onClick={() => handleAction('rejected')}>
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      disabled={!signed}
                      onClick={() => handleAction('approved')}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {signed ? 'Approve' : 'Sign First'}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Made with Bob
