'use client'

import React, { useState } from 'react'
import DashboardShell from '@/components/DashboardShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import {
  Star, CheckCircle, Send, Zap, Wrench, MessageCircle,
  Gem, Frown, Meh, Smile, Heart, PartyPopper, Target,
  MessageSquare, BarChart3, X
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface RatingCategory {
  key: string
  label: string
  icon: React.ReactNode
  description: string
}

interface CategoryRatings {
  [key: string]: number
}

// ─── Config ──────────────────────────────────────────────────────────────────
const categories: RatingCategory[] = [
  { key: 'speed',         label: 'Repair Speed',    icon: <Zap className="w-5 h-5" />, description: 'How fast was your device repaired?' },
  { key: 'quality',       label: 'Repair Quality',  icon: <Wrench className="w-5 h-5" />, description: 'Quality of the repair work done' },
  { key: 'communication', label: 'Communication',   icon: <MessageCircle className="w-5 h-5" />, description: 'How well were you kept informed?' },
  { key: 'value',         label: 'Value for Money', icon: <Gem className="w-5 h-5" />, description: 'Was the price fair for the service?' },
]

const npsLabels: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  1: { label: 'Very Poor',  color: 'destructive',  icon: <Frown className="w-5 h-5" /> },
  2: { label: 'Poor',       color: 'destructive',  icon: <Frown className="w-5 h-5" /> },
  3: { label: 'Fair',       color: 'secondary', icon: <Meh className="w-5 h-5" /> },
  4: { label: 'Good',       color: 'default',    icon: <Smile className="w-5 h-5" /> },
  5: { label: 'Excellent',  color: 'default', icon: <Heart className="w-5 h-5" /> },
}

const ratingBarColors: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-yellow-500',
  3: 'bg-yellow-500',
  4: 'bg-blue-500',
  5: 'bg-green-500',
}

// ─── Star component ───────────────────────────────────────────────────────────
function StarRow({
  value,
  hovered,
  onRate,
  onHover,
  onLeave,
  size = 28,
}: {
  value: number
  hovered: number
  onRate: (v: number) => void
  onHover: (v: number) => void
  onLeave: () => void
  size?: number
}) {
  const active = hovered || value

  return (
    <div className="flex gap-1" onMouseLeave={onLeave}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          onMouseEnter={() => onHover(star)}
          className={`transition-all ${active >= star ? 'scale-110' : 'scale-100'}`}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px',
            cursor: 'pointer',
            lineHeight: 1,
          }}
          aria-label={`Rate ${star} stars`}
        >
          <Star
            size={size}
            className={`${active >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted'} transition-colors`}
          />
        </button>
      ))}
    </div>
  )
}

// ─── NPS Score Widget ─────────────────────────────────────────────────────────
function NpsScore({ score }: { score: number }) {
  const meta = npsLabels[Math.round(score)] || npsLabels[3]
  const pct  = (score / 5) * 100

  return (
    <div className="text-center">
      <div className="w-24 h-24 rounded-full bg-muted border-4 border-primary flex flex-col items-center justify-center mx-auto transition-all">
        <div className="text-3xl">{meta.icon}</div>
        <div className="text-base font-bold">{score.toFixed(1)}</div>
      </div>
      <Badge className="mt-2">{meta.label}</Badge>
      <Progress value={pct} className="mt-2 h-1.5" />
      <div className="text-xs text-muted-foreground mt-1">Overall Score</div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ReviewPage() {
  const [ratings, setRatings]       = useState<CategoryRatings>({})
  const [hovered, setHovered]       = useState<CategoryRatings>({})
  const [feedback, setFeedback]     = useState('')
  const [npsScore, setNpsScore]     = useState(0)
  const [npsHover, setNpsHover]     = useState(0)
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Calc overall average from categories + NPS
  const ratedCats   = Object.values(ratings).filter(v => v > 0)
  const catAvg      = ratedCats.length > 0
    ? ratedCats.reduce((a, b) => a + b, 0) / ratedCats.length
    : 0
  const overallScore = npsScore > 0
    ? (catAvg + npsScore) / (ratedCats.length > 0 ? 2 : 1)
    : catAvg

  const allCatsRated = categories.every(c => (ratings[c.key] || 0) > 0)
  const canSubmit    = allCatsRated && npsScore > 0

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1200)) // simulate API call
    setSubmitting(false)
    setSubmitted(true)
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <DashboardShell requiredRole="customer">
        {() => (
        <div className="flex items-center justify-center py-12 min-h-[60vh]">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-12 pb-8 px-6">
              <div className="mb-4">
                <PartyPopper className="w-16 h-16 mx-auto text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Thank You for Your Feedback!</h2>
              <p className="text-muted-foreground mb-6">
                Your review helps us improve and serve future customers better.
              </p>

              <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Review submitted successfully!</span>
              </div>

              {/* Summary */}
              <div className="bg-muted rounded-lg p-4 mb-6 text-left">
                <div className="font-semibold mb-3 text-sm">Your Ratings</div>
                {categories.map(cat => (
                  <div key={cat.key} className="flex justify-between items-center mb-2">
                    <span className="text-sm">{cat.icon} {cat.label}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star
                          key={s}
                          size={14}
                          className={s <= (ratings[cat.key] || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full" asChild>
                <a href="/dashboard/customer">Back to Dashboard</a>
              </Button>
            </CardContent>
          </Card>
        </div>
        )}
      </DashboardShell>
    )
  }

  // ── Main review form ──
  return (
    <DashboardShell requiredRole="customer">
      {() => (
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-1">Rate Your Experience</h1>
          <p className="text-sm text-muted-foreground">
            Repair <strong className="text-primary">REP-2026-00451</strong> · iPhone 15 Pro — Space Black
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: category ratings ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category Stars */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">⭐ Rate Each Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {categories.map(cat => {
                  const val = ratings[cat.key] || 0
                  const hov = hovered[cat.key] || 0

                  return (
                    <div key={cat.key}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold text-sm">{cat.icon} {cat.label}</div>
                          <div className="text-xs text-muted-foreground">{cat.description}</div>
                        </div>
                        {val > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {npsLabels[val]?.icon} {npsLabels[val]?.label}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <StarRow
                          value={val}
                          hovered={hov}
                          onRate={v => setRatings(prev => ({ ...prev, [cat.key]: v }))}
                          onHover={v => setHovered(prev => ({ ...prev, [cat.key]: v }))}
                          onLeave={() => setHovered(prev => ({ ...prev, [cat.key]: 0 }))}
                        />
                        {val > 0 && (
                          <div className="flex-1">
                            <div className={`h-1.5 rounded-full ${ratingBarColors[val]}`} style={{ width: `${(val / 5) * 100}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* NPS Score */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Overall Satisfaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label className="font-semibold mb-3 block text-sm">
                  How likely are you to recommend us to a friend?
                </Label>
                <div className="flex justify-center mb-4">
                  <StarRow
                    value={npsScore}
                    hovered={npsHover}
                    onRate={setNpsScore}
                    onHover={setNpsHover}
                    onLeave={() => setNpsHover(0)}
                    size={36}
                  />
                </div>
                {/* Labels row */}
                <div className="flex justify-between px-1">
                  {[1,2,3,4,5].map(n => (
                    <div key={n} className="text-center flex-1">
                      <div className="text-base">{npsLabels[n].icon}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{npsLabels[n].label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Written Feedback */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Written Feedback
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">(Optional)</span>
                </div>
              </CardHeader>
              <CardContent>
                <Label className="mb-2 block text-sm">
                  Tell us about your experience. Your feedback helps us improve!
                </Label>
                <textarea
                  rows={4}
                  placeholder="e.g. The technician was very professional and fixed my phone screen quickly. I especially appreciated the clear communication throughout the process…"
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="text-right text-xs text-muted-foreground mt-1">
                  {feedback.length} / 500 characters
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: score summary + submit ── */}
          <div className="space-y-6">
            {/* Overall Score card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Your Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overallScore > 0 ? (
                  <NpsScore score={overallScore} />
                ) : (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    Start rating to see<br />your overall score
                  </div>
                )}

                {/* Per-category mini scores */}
                <div className="mt-4 space-y-2">
                  {categories.map(cat => {
                    const val = ratings[cat.key] || 0
                    return (
                      <div key={cat.key} className="flex items-center gap-2">
                        <span className="text-sm w-5">{cat.icon}</span>
                        <div className="flex-1">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={val > 0 ? ratingBarColors[val] : 'bg-muted'} 
                              style={{ width: `${(val / 5) * 100}%`, height: '100%' }}
                            />
                          </div>
                        </div>
                        <span className="text-xs w-8 text-right text-muted-foreground">
                          {val > 0 ? `${val}/5` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Repair info */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Repair Ticket</div>
                  <div className="text-sm font-semibold text-primary">REP-2026-00451</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Device</div>
                  <div className="text-sm font-medium">iPhone 15 Pro</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Service</div>
                  <div className="text-sm font-medium">Screen Replacement</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed</div>
                  <div className="text-sm font-medium">June 5, 2026</div>
                </div>
              </CardContent>
            </Card>

            {/* Validation message */}
            {!canSubmit && (allCatsRated || npsScore > 0) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg text-sm">
                {!allCatsRated && 'Please rate all 4 categories. '}
                {!npsScore && 'Please set your overall satisfaction.'}
              </div>
            )}

            {/* Submit */}
            <Button
              className="w-full"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>

            <Button variant="ghost" className="w-full" size="sm">
              Skip for Now
            </Button>
          </div>
        </div>
      </div>
      )}
    </DashboardShell>
  )
}


