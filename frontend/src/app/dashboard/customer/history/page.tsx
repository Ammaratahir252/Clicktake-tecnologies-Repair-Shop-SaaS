'use client'

import React, { useEffect, useState, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Search, Filter, History, FileText, Smartphone,
  Star, ArrowRight, X, Loader2,
} from 'lucide-react'
import api from '@/lib/api'

type RepairStatus = 'delivered' | 'cancelled' | 'ready' | 'in_repair' | 'received' | 'diagnosed' | 'estimate_sent' | 'approved'

interface RepairRecord {
  id:            string
  ticketId:      string
  device:        string
  issue:         string
  status:        RepairStatus
  technician:    string
  completedDate: string
  cost:          number
}

const STATUS_CONFIG: Record<string, { variant: 'default' | 'destructive' | 'secondary'; label: string }> = {
  delivered:     { variant: 'default',      label: 'Delivered'   },
  cancelled:     { variant: 'destructive',  label: 'Cancelled'   },
  ready:         { variant: 'secondary',    label: 'Ready'       },
  in_repair:     { variant: 'secondary',    label: 'In Repair'   },
  received:      { variant: 'secondary',    label: 'Received'    },
  diagnosed:     { variant: 'secondary',    label: 'Diagnosed'   },
  estimate_sent: { variant: 'secondary',    label: 'Estimate Sent' },
  approved:      { variant: 'secondary',    label: 'Approved'    },
}

const ITEMS_PER_PAGE = 5

const StarRating = ({ value }: { value?: number }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-4 h-4 ${s <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
      ))}
    </div>
  )
}

function ticketToRecord(t: any): RepairRecord {
  return {
    id:            t.ticketNumber,
    ticketId:      t._id,
    device:        `${t.deviceBrand} ${t.deviceModel}`.trim(),
    issue:         t.issue,
    status:        t.status,
    technician:    t.technicianId?.name ?? 'Unassigned',
    completedDate: new Date(t.updatedAt ?? t.createdAt).toLocaleDateString('en-PK'),
    cost:          t.estimateAmount ?? 0,
  }
}

export default function RepairHistoryPage() {
  return (
    <DashboardShell requiredRole="customer">
      {() => <HistoryContent />}
    </DashboardShell>
  )
}

function HistoryContent() {
  const [records, setRecords]   = useState<RepairRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage]   = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<RepairRecord | null>(null)

  useEffect(() => {
    api.get('/api/tickets')
      .then((res) => {
        const tickets: any[] = res.data?.data ?? []
        setRecords(tickets.map(ticketToRecord))
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.device.toLowerCase().includes(search.toLowerCase()) ||
        r.issue.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, records])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const totalSpent   = records.filter((r) => r.status === 'delivered').reduce((s, r) => s + r.cost, 0)
  const completedCnt = records.filter((r) => r.status === 'delivered').length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading history…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Repair History</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">All your past repair orders in one place</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Repairs</p>
            <h3 className="text-2xl font-bold text-primary">{records.length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Completed</p>
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCnt}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
            <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              Rs. {(totalSpent / 1000).toFixed(1)}k
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, device, or issue..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Statuses</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="ready">Ready</option>
                <option value="in_repair">In Repair</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Orders</CardTitle>
            <Badge variant="secondary">{filtered.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Issue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Cost</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No records found
                    </td>
                  </tr>
                ) : (
                  paginated.map((record) => {
                    const config = STATUS_CONFIG[record.status] ?? STATUS_CONFIG.received
                    return (
                      <tr key={record.ticketId} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-sm">{record.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{record.device}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{record.issue}</td>
                        <td className="px-4 py-3">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{record.completedDate}</td>
                        <td className="px-4 py-3 font-semibold text-sm">
                          {record.cost ? `Rs. ${record.cost.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(record)}>
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-2 px-4 py-3 border-t border-border">
              <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Previous</Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} size="sm" variant={p === currentPage ? 'default' : 'outline'} onClick={() => setCurrentPage(p)}>{p}</Button>
              ))}
              <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedOrder(null)}>
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">{selectedOrder.id}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Device</p>
                  <p className="font-semibold">{selectedOrder.device}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Issue</p>
                  <p className="font-semibold">{selectedOrder.issue}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Technician</p>
                  <p className="font-semibold">{selectedOrder.technician}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Date</p>
                  <p className="font-semibold">{selectedOrder.completedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <Badge variant={(STATUS_CONFIG[selectedOrder.status] ?? STATUS_CONFIG.received).variant}>
                    {(STATUS_CONFIG[selectedOrder.status] ?? STATUS_CONFIG.received).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount</p>
                  <p className="font-semibold text-primary">
                    {selectedOrder.cost ? `Rs. ${selectedOrder.cost.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
