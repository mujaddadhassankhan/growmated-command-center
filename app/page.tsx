'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Section from '@/components/Section'
import Sensitive from '@/components/Sensitive'
import { requireSupabase } from '@/lib/supabase'

/* ─── Types ──────────────────────────────────────────────── */
type Goals = {
  monthly_revenue_target_usd: number
  monthly_growmated_hours_target: number
  new_clients_target_per_quarter: number
  zaid_briefing: string | null
}

type ClientRow = {
  id: string
  client_name: string
  project_name: string | null
  phase: string | null
  status: string | null
  next_action: string | null
  next_action_due_date: string | null
}

type Money = { invoiced: number; received: number; outstanding: number; expenses: number }
type Hours = { nine_to_five: number; growmated: number }
type PipelineCounts = { email_sent: number; call_scheduled: number; proposal_sent: number; overdue: number }
type ActionItem = { id: string; who: string; action: string; due: string; urgency: 'today' | 'soon' | 'upcoming'; type: 'client' | 'pipeline' }

/* ─── Helpers ────────────────────────────────────────────── */
function isoToday() { return new Date().toISOString().slice(0, 10) }
function startOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }
function endOfMonth()   { const d = new Date(); return new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString().slice(0,10) }
function startOfWeek()  {
  const d = new Date(); const day = (d.getDay()+6)%7
  const s = new Date(d); s.setDate(d.getDate()-day); return s.toISOString().slice(0,10)
}
function endOfWeek()    {
  const d = new Date(); const day = (d.getDay()+6)%7
  const s = new Date(d); s.setDate(d.getDate()-day+6); return s.toISOString().slice(0,10)
}

function pct(value: number, max: number) {
  return Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0)
}

function progressColor(p: number): string {
  if (p >= 70) return '#4ade80'
  if (p >= 35) return '#fbbf24'
  return '#f87171'
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

/* ─── Sub-components ─────────────────────────────────────── */
function ProgressBar({ value, max }: { value: number; max: number }) {
  const p = pct(value, max)
  const color = progressColor(p)
  return (
    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden mt-3">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, backgroundColor: color }} />
    </div>
  )
}

function StatCard({
  label, value, sub, accent, children, href,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
  children?: React.ReactNode
  href?: string
}) {
  const card = (
    <div
      className="card p-5 flex flex-col gap-1 h-full"
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: accent ?? 'var(--muted)' }}>
        {label}
      </div>
      <div className="text-3xl font-bold mt-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: accent ?? 'var(--text)' }}>
        {value}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</div>}
      {children}
    </div>
  )
  if (href) return <Link href={href} className="block h-full hover:opacity-90 transition-opacity">{card}</Link>
  return card
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const [top3, setTop3] = useState<string[]>(['', '', ''])
  const [quickWins, setQuickWins] = useState('')
  const [goals, setGoals] = useState<Goals | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [money, setMoney] = useState<Money>({ invoiced: 0, received: 0, outstanding: 0, expenses: 0 })
  const [hours, setHours] = useState<Hours>({ nine_to_five: 0, growmated: 0 })
  const [pipeline, setPipeline] = useState<PipelineCounts>({ email_sent: 0, call_scheduled: 0, proposal_sent: 0, overdue: 0 })
  const [pipelineItems, setPipelineItems] = useState<Array<{ id: string; business_name: string; owner_name: string | null; next_follow_up_date: string | null; outreach_status: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Local-only state (no friction)
  useEffect(() => {
    const t = localStorage.getItem('cc_top3')
    const q = localStorage.getItem('cc_quickwins')
    if (t) setTop3(JSON.parse(t))
    if (q) setQuickWins(q)
  }, [])
  useEffect(() => { localStorage.setItem('cc_top3', JSON.stringify(top3)) }, [top3])
  useEffect(() => { localStorage.setItem('cc_quickwins', quickWins) }, [quickWins])

  // DB fetch
  useEffect(() => {
    ;(async () => {
      try {
        const sb = requireSupabase()
        const sm = startOfMonth(); const em = endOfMonth()
        const sw = startOfWeek();  const ew = endOfWeek()
        const today = isoToday()

        const [goalsRes, clientsRes, incRes, expRes, timesRes, pipeRes] = await Promise.all([
          sb.from('goals').select('monthly_revenue_target_usd,monthly_growmated_hours_target,new_clients_target_per_quarter,zaid_briefing').limit(1).maybeSingle(),
          sb.from('clients').select('id,client_name,project_name,phase,status,next_action,next_action_due_date')
            .order('next_action_due_date', { ascending: true, nullsFirst: false }).limit(20),
          sb.from('income').select('amount,status').gte('date', sm).lte('date', em),
          sb.from('expenses').select('amount').gte('date', sm).lte('date', em),
          sb.from('time_logs').select('hours_9to5,hours_growmated').gte('date', sw).lte('date', ew),
          sb.from('pipeline').select('id,business_name,owner_name,outreach_status,next_follow_up_date').not('outreach_status', 'in', '("Won","Lost")'),
        ])

        if (goalsRes.data) setGoals(goalsRes.data as Goals)
        setClients((clientsRes.data ?? []) as ClientRow[])

        const inc = incRes.data ?? []
        setMoney({
          invoiced:    inc.reduce((s:number,r:any) => s + (r.amount??0), 0),
          received:    inc.filter((r:any) => r.status === 'Paid').reduce((s:number,r:any) => s + (r.amount??0), 0),
          outstanding: inc.filter((r:any) => r.status === 'Outstanding').reduce((s:number,r:any) => s + (r.amount??0), 0),
          expenses:    (expRes.data ?? []).reduce((s:number,r:any) => s + (r.amount??0), 0),
        })

        const times = timesRes.data ?? []
        setHours({
          nine_to_five: times.reduce((s:number,r:any) => s + (r.hours_9to5??0), 0),
          growmated:    times.reduce((s:number,r:any) => s + (r.hours_growmated??0), 0),
        })

        const pipe = pipeRes.data ?? []
        setPipelineItems(pipe as any)
        const overdue = pipe.filter((r:any) =>
          r.next_follow_up_date && r.next_follow_up_date < today
        ).length
        setPipeline({
          email_sent:     pipe.filter((r:any) => r.outreach_status === 'Email sent').length,
          call_scheduled: pipe.filter((r:any) => r.outreach_status === 'Call scheduled').length,
          proposal_sent:  pipe.filter((r:any) => r.outreach_status === 'Proposal sent').length,
          overdue,
        })
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const todayLabel = useMemo(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), [])

  const netProfit = money.received - money.expenses
  const revTarget = goals?.monthly_revenue_target_usd ?? 5000
  const hrsTarget = goals?.monthly_growmated_hours_target ?? 60
  const revPct = pct(money.received, revTarget)
  const hrsPct  = pct(hours.growmated, hrsTarget)

  // Karen's proposal (check for it specifically)
  const karenClient = clients.find(c => c.client_name.toLowerCase().includes('karen'))
  const karenDaysUntilDue = karenClient?.next_action_due_date ? daysUntil(karenClient.next_action_due_date) : null

  // Build ACTION BOARD — client actions
  const today = isoToday()
  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = []
    // Client actions
    clients.forEach(c => {
      if (!c.next_action_due_date || !c.next_action) return
      const d = c.next_action_due_date
      const days = daysUntil(d)
      let urgency: ActionItem['urgency']
      if (d <= today) urgency = 'today'
      else if (days <= 3) urgency = 'soon'
      else if (days <= 7) urgency = 'upcoming'
      else return
      items.push({ id: c.id, who: c.client_name, action: c.next_action, due: d, urgency, type: 'client' })
    })
    // Pipeline follow-ups
    pipelineItems.forEach(p => {
      if (!p.next_follow_up_date) return
      const d = p.next_follow_up_date
      const days = daysUntil(d)
      let urgency: ActionItem['urgency']
      if (d <= today) urgency = 'today'
      else if (days <= 3) urgency = 'soon'
      else if (days <= 7) urgency = 'upcoming'
      else return
      items.push({
        id: p.id,
        who: p.business_name + (p.owner_name ? ` (${p.owner_name})` : ''),
        action: `Follow up · ${p.outreach_status}`,
        due: d,
        urgency,
        type: 'pipeline',
      })
    })
    // Sort: today first, then by date
    return items.sort((a, b) => {
      const order = { today: 0, soon: 1, upcoming: 2 }
      if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency]
      return a.due.localeCompare(b.due)
    })
  }, [clients, pipelineItems, today])

  const todayCount = actionItems.filter(i => i.urgency === 'today').length
  const urgentCount = todayCount

  return (
    <div className="space-y-5 pb-8">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Hey Muj.
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {todayLabel}
            {urgentCount > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171' }}>
                ● {urgentCount} need your attention
              </span>
            )}
          </p>
        </div>
        <Link href="/clients" className="text-xs hover:underline mt-1" style={{ color: '#5254CC' }}>
          View all clients →
        </Link>
      </div>

      {err && (
        <div className="card p-3 text-sm" style={{ borderLeft: '3px solid #f87171', color: '#f87171' }}>
          {err}
        </div>
      )}

      {/* ── Zaid's Briefing ────────────────────────────────── */}
      {goals?.zaid_briefing && (
        <div
          className="card p-5"
          style={{ borderLeft: '3px solid #5254CC', background: 'linear-gradient(135deg, rgba(82,84,204,0.07) 0%, rgba(20,25,34,0) 60%)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: '#5254CC' }}>
              <span className="text-white text-xs font-bold">Z</span>
            </div>
            <div className="text-xs font-bold tracking-widest uppercase" style={{ color: '#5254CC' }}>
              Intel from Zaid
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{goals.zaid_briefing}</p>
          <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>Updated by Zaid · Tell me what happened today and I&apos;ll update this</p>
        </div>
      )}

      {/* ── Key Metrics Row ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Revenue */}
        <div className="card p-5" style={{ borderLeft: `3px solid ${progressColor(revPct)}` }}>
          <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: progressColor(revPct) }}>
            Monthly Revenue
          </div>
          <div className="text-2xl font-bold mt-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            <Sensitive>${money.received.toLocaleString()}</Sensitive>
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            of ${revTarget.toLocaleString()} target · {revPct}%
          </div>
          <ProgressBar value={money.received} max={revTarget} />
        </div>

        {/* Growmated Hours */}
        <div className="card p-5" style={{ borderLeft: `3px solid ${progressColor(hrsPct)}` }}>
          <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: progressColor(hrsPct) }}>
            Growmated Hours
          </div>
          <div className="text-2xl font-bold mt-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {hours.growmated.toFixed(1)}h
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            of {hrsTarget}h target · {hrsPct}%
          </div>
          <ProgressBar value={hours.growmated} max={hrsTarget} />
        </div>

        {/* Karen — Biggest Opportunity */}
        {karenClient && (
          <Link href="/clients" className="block">
            <div className="card p-5 h-full" style={{ borderLeft: '3px solid #fbbf24', background: 'rgba(251,191,36,0.03)', cursor: 'pointer' }}>
              <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#fbbf24' }}>
                🎯 Big Opportunity
              </div>
              <div className="text-2xl font-bold mt-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#fbbf24' }}>
                <Sensitive>$10,000</Sensitive>
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Karen · Proposal Sent</div>
              <div className="text-xs mt-2 font-medium" style={{ color: '#fbbf24' }}>
                {karenDaysUntilDue !== null && karenDaysUntilDue <= 3
                  ? `Follow up ${karenDaysUntilDue === 0 ? 'today' : `in ${karenDaysUntilDue}d`} →`
                  : 'Close this deal →'}
              </div>
            </div>
          </Link>
        )}

        {/* Photo Booth Follow-ups */}
        <Link href="/pipeline" className="block">
          <div
            className="card p-5 h-full"
            style={{
              borderLeft: `3px solid ${pipeline.email_sent > 0 ? '#f87171' : '#4ade80'}`,
              background: pipeline.email_sent > 0 ? 'rgba(248,113,113,0.03)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: pipeline.email_sent > 0 ? '#f87171' : 'var(--muted)' }}>
              ⏰ Follow-ups Due
            </div>
            <div className="text-2xl font-bold mt-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: pipeline.email_sent > 0 ? '#f87171' : '#4ade80' }}>
              {pipeline.email_sent}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Email sent · awaiting reply</div>
            {pipeline.email_sent > 0 && (
              <div className="text-xs mt-2 font-medium" style={{ color: '#f87171' }}>Check Action Board →</div>
            )}
          </div>
        </Link>
      </div>

      {/* ── Today's Top 3 ──────────────────────────────────── */}
      <Section title="TODAY'S TOP 3 — What moves the needle?">
        <div className="space-y-2.5">
          {top3.map((v, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(82,84,204,0.2)', color: '#5254CC' }}
              >
                {idx + 1}
              </div>
              <input
                value={v}
                onChange={e => {
                  const n = [...top3]; n[idx] = e.target.value; setTop3(n)
                }}
                placeholder={
                  idx === 0 ? 'The most important thing today...' :
                  idx === 1 ? 'Second priority...' : 'Third priority...'
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Main Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Action Board */}
        <div className="lg:col-span-2">
          <Section title="ACTION BOARD — What needs doing">
            {loading && (
              <div className="py-6 text-center text-xs" style={{ color: 'var(--muted)' }}>Loading...</div>
            )}
            {!loading && actionItems.length === 0 && (
              <div className="py-8 text-center">
                <div className="text-2xl mb-2">🎉</div>
                <div className="text-sm font-medium" style={{ color: '#4ade80' }}>All clear — nothing due in the next 7 days</div>
              </div>
            )}
            {!loading && actionItems.length > 0 && (
              <div className="space-y-2">
                {/* Today */}
                {actionItems.filter(i => i.urgency === 'today').length > 0 && (
                  <div>
                    <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#f87171' }}>
                      ⚡ Today
                    </div>
                    {actionItems.filter(i => i.urgency === 'today').map(item => (
                      <Link key={item.id} href={item.type === 'client' ? '/clients' : '/pipeline'}>
                        <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ background: 'rgba(248,113,113,0.1)', borderLeft: '3px solid #f87171' }}>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{item.who}</div>
                            <div className="text-xs mt-0.5 truncate" style={{ color: '#f87171' }}>{item.action}</div>
                          </div>
                          <span className="text-xs font-bold flex-shrink-0 mt-0.5" style={{ color: '#f87171' }}>TODAY →</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {/* Soon (1-3 days) */}
                {actionItems.filter(i => i.urgency === 'soon').length > 0 && (
                  <div className="pt-1">
                    <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#fbbf24' }}>
                      ⏰ Coming Up (1–3 days)
                    </div>
                    {actionItems.filter(i => i.urgency === 'soon').map(item => (
                      <Link key={item.id} href={item.type === 'client' ? '/clients' : '/pipeline'}>
                        <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ background: 'rgba(251,191,36,0.08)', borderLeft: '3px solid #fbbf24' }}>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{item.who}</div>
                            <div className="text-xs mt-0.5 truncate" style={{ color: '#fbbf24' }}>{item.action}</div>
                          </div>
                          <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }}>{item.due}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                {/* Upcoming (4-7 days) */}
                {actionItems.filter(i => i.urgency === 'upcoming').length > 0 && (
                  <div className="pt-1">
                    <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--muted)' }}>
                      📅 This Week (4–7 days)
                    </div>
                    {actionItems.filter(i => i.urgency === 'upcoming').map(item => (
                      <Link key={item.id} href={item.type === 'client' ? '/clients' : '/pipeline'}>
                        <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ background: 'var(--surface2)', borderLeft: '3px solid var(--border)' }}>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>{item.who}</div>
                            <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{item.action}</div>
                          </div>
                          <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--muted)' }}>{item.due}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <Link href="/clients" className="block mt-3 text-xs text-center hover:underline" style={{ color: '#5254CC' }}>
                  View all clients & pipeline →
                </Link>
              </div>
            )}
          </Section>
        </div>

        {/* Right: Money + Pipeline */}
        <div className="space-y-5">

          {/* Money This Month */}
          <div className="card p-5">
            <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>
              Money This Month
            </div>
            <div className="space-y-3">
              {[
                { label: 'Received',    val: money.received,    color: '#4ade80' },
                { label: 'Outstanding', val: money.outstanding, color: '#fbbf24' },
                { label: 'Expenses',    val: money.expenses,    color: '#f87171' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
                  </div>
                  <Sensitive className="text-sm font-semibold" style={{ color } as any}>${val.toLocaleString()}</Sensitive>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Net Profit</span>
                <Sensitive
                  className="text-base font-bold"
                  style={{ color: netProfit >= 0 ? '#4ade80' : '#f87171' } as any}
                >
                  ${netProfit.toLocaleString()}
                </Sensitive>
              </div>
            </div>
          </div>

          {/* Pipeline Pulse */}
          <div className="card p-5">
            <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>
              Pipeline Pulse
            </div>
            <div className="space-y-3">
              {[
                { label: 'Email sent', val: pipeline.email_sent, color: '#f87171', note: pipeline.email_sent > 0 ? 'Follow up!' : '' },
                { label: 'Call scheduled', val: pipeline.call_scheduled, color: '#c4b5fd', note: '' },
                { label: 'Proposal out', val: pipeline.proposal_sent, color: '#fbbf24', note: '' },
                { label: 'Overdue follow-ups', val: pipeline.overdue, color: '#f87171', note: '' },
              ].map(({ label, val, color, note }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: val > 0 ? color : 'var(--faint)' }} />
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {note && <span className="text-xs font-medium" style={{ color }}>{note}</span>}
                    <span className="text-sm font-bold" style={{ color: val > 0 ? color : 'var(--muted)' }}>{val}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/pipeline" className="block mt-4 text-xs text-center font-medium hover:underline" style={{ color: '#5254CC' }}>
              Open Pipeline →
            </Link>
          </div>

          {/* Hours */}
          <div className="card p-5">
            <div className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--muted)' }}>
              Hours This Week
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Growmated</span>
                <span className="text-sm font-bold" style={{ color: '#5254CC' }}>{hours.growmated.toFixed(1)}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>9-to-5</span>
                <span className="text-sm font-bold">{hours.nine_to_five.toFixed(1)}h</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Wins ─────────────────────────────────────── */}
      <Section title="QUICK WINS — What moved forward this week?">
        <textarea
          value={quickWins}
          onChange={e => setQuickWins(e.target.value)}
          placeholder="Write small wins, progress, anything that moved. Even tiny things count."
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none resize-none"
          style={{ minHeight: '90px' }}
        />
      </Section>

    </div>
  )
}
