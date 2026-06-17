'use client'

import React, { useEffect, useState, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Search, Filter, CreditCard, CheckCircle, XCircle, Clock,
  Smartphone, Info, Printer, DollarSign, AlertTriangle, X, Loader2,
} from 'lucide-react'
import api from '@/lib/api'

type PaymentStatus = 'paid' | 'unpaid' | 'partial'

interface Invoice {
  id:            string
  ticketId:      string
  device:        string
  issue:         string
  paymentStatus: PaymentStatus
  issuedDate:    string
  technician:    string
  amount:        number
  notes:         string
}

const STATUS_CONFIG: Record<PaymentStatus, { variant: 'default' | 'destructive' | 'secondary'; icon: React.ReactNode; label: string }> = {
  paid:    { variant: 'default',     icon: <CheckCircle className="w-3 h-3" />, label: 'Paid'    },
  unpaid:  { variant: 'destructive', icon: <XCircle className="w-3 h-3" />,     label: 'Unpaid'  },
  partial: { variant: 'secondary',   icon: <Clock className="w-3 h-3" />,        label: 'Partial' },
}

const ITEMS_PER_PAGE = 5

function ticketToInvoice(t: any): Invoice {
  let paymentStatus: PaymentStatus = 'unpaid'
  if (t.status === 'delivered') paymentStatus = 'paid'
  else if (t.status === 'ready') paymentStatus = 'unpaid'
  return {
    id:            t.ticketNumber,
    ticketId:      t._id,
    device:        `${t.deviceBrand} ${t.deviceModel}`.trim(),
    issue:         t.issue,
    paymentStatus,
    issuedDate:    new Date(t.createdAt).toLocaleDateString('en-PK'),
    technician:    t.technicianId?.name ?? 'Unassigned',
    amount:        t.estimateAmount ?? 0,
    notes:         t.diagnosisNotes ?? '',
  }
}

export default function InvoicesPage() {
  return (
    <DashboardShell requiredRole="customer">
      {() => <InvoicesContent />}
    </DashboardShell>
  )
}

function InvoicesContent() {
  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage]   = useState(1)
  const [selected, setSelected]   = useState<Invoice | null>(null)
  const [toast, setToast]         = useState('')

  useEffect(() => {
    api.get('/api/tickets')
      .then((res) => {
        const tickets: any[] = res.data?.data ?? []
        const withAmount = tickets.filter((t) => t.estimateAmount && t.estimateAmount > 0)
        setInvoices(withAmount.map(ticketToInvoice))
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.id.toLowerCase().includes(search.toLowerCase()) ||
        inv.device.toLowerCase().includes(search.toLowerCase()) ||
        inv.issue.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, invoices])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const totalInvoiced = invoices.reduce((s, inv) => s + inv.amount, 0)
  const totalPaid     = invoices.filter((inv) => inv.paymentStatus === 'paid').reduce((s, inv) => s + inv.amount, 0)
  const totalPending  = invoices.filter((inv) => inv.paymentStatus !== 'paid').reduce((s, inv) => s + inv.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="animate-spin w-6 h-6 mr-3" />
        <span className="font-medium">Loading invoices…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">My Invoices</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">View your repair invoices</p>
        </div>
        <Badge variant="destructive" className="px-3 py-1">
          {invoices.filter((inv) => inv.paymentStatus === 'unpaid').length} Unpaid
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Invoiced</p>
            <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Rs. {(totalInvoiced / 1000).toFixed(1)}k</h3>
            <Progress value={100} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">Rs. {(totalPaid / 1000).toFixed(1)}k</h3>
            <Progress value={totalInvoiced ? Math.round((totalPaid / totalInvoiced) * 100) : 0} className="mt-2 h-1" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Balance Due</p>
            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">Rs. {(totalPending / 1000).toFixed(1)}k</h3>
            <Progress value={totalInvoiced ? Math.round((totalPending / totalInvoiced) * 100) : 0} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice ID, device or issue..."
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
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Invoices</CardTitle>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Issued</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  paginated.map((inv) => {
                    const config = STATUS_CONFIG[inv.paymentStatus]
                    return (
                      <tr key={inv.ticketId} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-sm">{inv.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{inv.device}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{inv.issue}</td>
                        <td className="px-4 py-3">
                          <Badge variant={config.variant} className="gap-1">
                            {config.icon}
                            {config.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">{inv.issuedDate}</td>
                        <td className="px-4 py-3 font-semibold text-sm">
                          {inv.amount ? `Rs. ${inv.amount.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" onClick={() => setSelected(inv)}>
                            <Info className="w-4 h-4 mr-1" />
                            View
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

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
          <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">{selected.id}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Device</p>
                  <p className="font-semibold">{selected.device}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Issue</p>
                  <p className="font-semibold">{selected.issue}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Technician</p>
                  <p className="font-semibold">{selected.technician}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Issued</p>
                  <p className="font-semibold">{selected.issuedDate}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payment Status</p>
                  <Badge variant={STATUS_CONFIG[selected.paymentStatus].variant} className="gap-1">
                    {STATUS_CONFIG[selected.paymentStatus].icon}
                    {STATUS_CONFIG[selected.paymentStatus].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount</p>
                  <p className="text-2xl font-bold text-primary">Rs. {selected.amount.toLocaleString()}</p>
                </div>
              </div>

              {selected.notes && (
                <div className="p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{selected.notes}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
