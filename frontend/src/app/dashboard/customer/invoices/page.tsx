'use client'

import React, { useState, useMemo } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  Search, Filter, CreditCard, CheckCircle, XCircle, Clock,
  Smartphone, Info, Download, Printer, DollarSign, AlertTriangle, X
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'paid' | 'unpaid' | 'partial'

interface InvoiceItem {
  description: string
  qty: number
  unitPrice: number
}

interface Invoice {
  id: string
  repairId: string
  device: string
  issue: string
  paymentStatus: PaymentStatus
  issuedDate: string
  dueDate: string
  technician: string
  items: InvoiceItem[]
  amountPaid: number
  notes: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INVOICES: Invoice[] = [
  {
    id: 'INV-2024-0042',
    repairId: 'RPR-2024-0042',
    device: 'iPhone 14 Pro',
    issue: 'Screen + Battery Replacement',
    paymentStatus: 'paid',
    issuedDate: '2024-06-01',
    dueDate: '2024-06-08',
    technician: 'Ali Hassan',
    amountPaid: 10100,
    items: [
      { description: 'OEM Screen Assembly (iPhone 14 Pro)', qty: 1, unitPrice: 7500 },
      { description: 'OEM Battery (iPhone 14 Pro)', qty: 1, unitPrice: 1800 },
      { description: 'Labour Charges', qty: 1, unitPrice: 800 },
    ],
    notes: 'Full payment received via EasyPaisa. Thank you!',
  },
  {
    id: 'INV-2024-0038',
    repairId: 'RPR-2024-0038',
    device: 'Samsung Galaxy S22',
    issue: 'Battery Replacement',
    paymentStatus: 'partial',
    issuedDate: '2024-05-22',
    dueDate: '2024-05-29',
    technician: 'Usman Raza',
    amountPaid: 1500,
    items: [
      { description: 'Samsung S22 Battery (OEM)', qty: 1, unitPrice: 2500 },
      { description: 'Labour Charges', qty: 1, unitPrice: 700 },
    ],
    notes: 'Partial payment of Rs. 1500 received. Remaining balance due.',
  },
  {
    id: 'INV-2024-0031',
    repairId: 'RPR-2024-0031',
    device: 'MacBook Air M1',
    issue: 'Charging Port Repair',
    paymentStatus: 'unpaid',
    issuedDate: '2024-05-10',
    dueDate: '2024-05-17',
    technician: 'Sara Ahmed',
    amountPaid: 0,
    items: [
      { description: 'USB-C Charging Board Replacement', qty: 1, unitPrice: 4800 },
      { description: 'Labour Charges', qty: 1, unitPrice: 700 },
    ],
    notes: 'Invoice overdue. Please clear payment at earliest.',
  },
  {
    id: 'INV-2024-0019',
    repairId: 'RPR-2024-0019',
    device: 'iPhone 13',
    issue: 'Water Damage',
    paymentStatus: 'paid',
    issuedDate: '2024-04-15',
    dueDate: '2024-04-22',
    technician: 'Bilal Khan',
    amountPaid: 12000,
    items: [
      { description: 'Water Damage Treatment', qty: 1, unitPrice: 3500 },
      { description: 'Logic Board Repair', qty: 1, unitPrice: 7000 },
      { description: 'Labour Charges', qty: 1, unitPrice: 1500 },
    ],
    notes: 'Full payment received via bank transfer.',
  },
  {
    id: 'INV-2024-0012',
    repairId: 'RPR-2024-0012',
    device: 'OnePlus 11',
    issue: 'Back Glass Replacement',
    paymentStatus: 'paid',
    issuedDate: '2024-03-28',
    dueDate: '2024-04-04',
    technician: 'Usman Raza',
    amountPaid: 2800,
    items: [
      { description: 'Back Glass (OnePlus 11)', qty: 1, unitPrice: 2200 },
      { description: 'Labour Charges', qty: 1, unitPrice: 600 },
    ],
    notes: 'Payment received in cash.',
  },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PaymentStatus, { variant: 'default' | 'destructive' | 'secondary'; icon: React.ReactNode; label: string }> = {
  paid: { variant: 'default', icon: <CheckCircle className="w-3 h-3" />, label: 'Paid' },
  unpaid: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, label: 'Unpaid' },
  partial: { variant: 'secondary', icon: <Clock className="w-3 h-3" />, label: 'Partial' },
}

const ITEMS_PER_PAGE = 5

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [paidIds, setPaidIds] = useState<string[]>([])
  const [toast, setToast] = useState('')

  const getStatus = (inv: Invoice): PaymentStatus =>
    paidIds.includes(inv.id) ? 'paid' : inv.paymentStatus

  const filtered = useMemo(() => {
    return INVOICES.filter((inv) => {
      const matchSearch =
        inv.id.toLowerCase().includes(search.toLowerCase()) ||
        inv.device.toLowerCase().includes(search.toLowerCase()) ||
        inv.issue.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || getStatus(inv) === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter, paidIds])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  const getTotal = (items: InvoiceItem[]) =>
    items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)

  const getBalance = (inv: Invoice) => getTotal(inv.items) - inv.amountPaid

  // Stats
  const totalInvoiced = INVOICES.reduce((s, inv) => s + getTotal(inv.items), 0)
  const totalPaid = INVOICES.filter(inv => getStatus(inv) === 'paid').reduce((s, inv) => s + getTotal(inv.items), 0)
  const totalPending = INVOICES.filter(inv => getStatus(inv) !== 'paid').reduce((s, inv) => s + getBalance(inv), 0)

  const handlePayNow = (inv: Invoice) => {
    setPayingId(inv.id)
    setTimeout(() => {
      setPaidIds(prev => [...prev, inv.id])
      setPayingId(null)
      setSelected(null)
      setToast(`Payment of Rs. ${getBalance(inv).toLocaleString()} received for ${inv.id}!`)
      setTimeout(() => setToast(''), 4000)
    }, 2000)
  }

  return (
    <DashboardShell requiredRole="customer">
      {() => (
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg">
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">My Invoices</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              View and pay your repair invoices online
            </p>
          </div>
          <Badge variant="destructive" className="px-3 py-1">
            {INVOICES.filter(inv => getStatus(inv) === 'unpaid').length} Overdue
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Invoiced</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                Rs. {(totalInvoiced / 1000).toFixed(1)}k
              </h3>
              <Progress value={100} className="mt-2 h-1" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Total Paid</p>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                Rs. {(totalPaid / 1000).toFixed(1)}k
              </h3>
              <Progress value={Math.round((totalPaid / totalInvoiced) * 100)} className="mt-2 h-1" />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Balance Due</p>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Rs. {(totalPending / 1000).toFixed(1)}k
              </h3>
              <Progress value={Math.round((totalPending / totalInvoiced) * 100)} className="mt-2 h-1" />
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

        {/* Table */}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Invoice ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Device</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Issue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Issued</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Balance</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                        No invoices found
                      </td>
                    </tr>
                  ) : (
                    paginated.map((inv) => {
                      const status = getStatus(inv)
                      const total = getTotal(inv.items)
                      const balance = paidIds.includes(inv.id) ? 0 : getBalance(inv)
                      const config = STATUS_CONFIG[status]
                      
                      return (
                        <tr key={inv.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-sm">{inv.id}</div>
                            <div className="text-xs text-muted-foreground">{inv.repairId}</div>
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
                          <td className="px-4 py-3">
                            <span className={`text-sm ${status === 'unpaid' && !paidIds.includes(inv.id) ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
                              {inv.dueDate}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-sm">
                            Rs. {total.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold text-sm ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                              {balance > 0 ? `Rs. ${balance.toLocaleString()}` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelected(inv)}
                            >
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
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-end items-center gap-2 px-4 py-3 border-t border-border">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={p === currentPage ? 'default' : 'outline'}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Detail Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelected(null)}>
            <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">{selected.id}</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-6 space-y-6">
                {(() => {
                  const status = getStatus(selected)
                  const total = getTotal(selected.items)
                  const balance = paidIds.includes(selected.id) ? 0 : getBalance(selected)
                  const isPaying = payingId === selected.id
                  const config = STATUS_CONFIG[status]

                  return (
                    <>
                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Device</p>
                          <p className="font-semibold">{selected.device}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Repair ID</p>
                          <p className="font-semibold">{selected.repairId}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Issued Date</p>
                          <p className="font-semibold">{selected.issuedDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Due Date</p>
                          <p className={`font-semibold ${status === 'unpaid' ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {selected.dueDate}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Technician</p>
                          <p className="font-semibold">{selected.technician}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Payment Status</p>
                          <Badge variant={config.variant} className="gap-1">
                            {config.icon}
                            {config.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Line Items */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-2">Invoice Items</p>
                        <div className="border border-border rounded-lg overflow-hidden">
                          {selected.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-3 border-b border-border last:border-b-0">
                              <div>
                                <p className="font-semibold text-sm">{item.description}</p>
                                <span className="text-xs text-muted-foreground">
                                  {item.qty} × Rs. {item.unitPrice.toLocaleString()}
                                </span>
                              </div>
                              <span className="font-semibold text-primary">
                                Rs. {(item.qty * item.unitPrice).toLocaleString()}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between p-3 border-b border-border">
                            <span className="text-sm text-muted-foreground">Amount Paid</span>
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              Rs. {(paidIds.includes(selected.id) ? total : selected.amountPaid).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between p-3 bg-muted/50">
                            <strong>Balance Due</strong>
                            <strong className={balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400 flex items-center gap-1'}>
                              {balance > 0 ? `Rs. ${balance.toLocaleString()}` : (
                                <>
                                  Paid in Full
                                  <CheckCircle className="w-4 h-4" />
                                </>
                              )}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Payment Progress */}
                      <div>
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                          <span>Payment Progress</span>
                          <span>{Math.round(((paidIds.includes(selected.id) ? total : selected.amountPaid) / total) * 100)}%</span>
                        </div>
                        <Progress 
                          value={Math.round(((paidIds.includes(selected.id) ? total : selected.amountPaid) / total) * 100)} 
                          className="h-2"
                        />
                      </div>

                      {/* Notes */}
                      <div className={`p-3 rounded-lg border ${balance > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                        <div className="flex items-start gap-2">
                          {balance > 0 ? <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" /> : <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />}
                          <span className="text-sm">{selected.notes}</span>
                        </div>
                      </div>

                      {/* Pay Now UI */}
                      {balance > 0 && !isPaying && (
                        <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="pt-4">
                            <p className="font-semibold mb-1 text-primary flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              Pay Outstanding Balance
                            </p>
                            <p className="text-sm text-muted-foreground mb-3">
                              Amount due: <strong className="text-red-600 dark:text-red-400">Rs. {balance.toLocaleString()}</strong>
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {['EasyPaisa', 'JazzCash', 'Bank Transfer', 'Cash on Pickup'].map((method) => (
                                <Button
                                  key={method}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePayNow(selected)}
                                >
                                  {method}
                                </Button>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Processing */}
                      {isPaying && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-lg text-center">
                          <Clock className="w-4 h-4 inline mr-2" />
                          Processing payment... please wait
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
    </DashboardShell>
  )
}

// Made with Bob
