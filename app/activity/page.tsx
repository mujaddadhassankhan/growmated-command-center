'use client'

import { useCallback, useEffect, useState } from 'react'
import { requireSupabase } from '@/lib/supabase'

type LogEntry = {
  id: string
  date: string
  time_of_day: string | null
  category: string
  action: string
  quantity: number | null
  unit: string | null
  created_at: string
}

const CAT_COLORS: Record<string, string> = {
  Email:    '#34d399',
  LinkedIn: '#818cf8',
  App:      '#60a5fa',
  Pipeline: '#fb923c',
  Client:   '#fbbf24',
  Admin:    '#94a3b8',
}

function isoToday() {
  return new Date().toISOString().split('T')[0]
}

// ── Donut Ring ────────────────────────────────────────────────
function DonutRing({
  value, max, color, label, sub,
}: { value: number; max: number; color: string; label: string; sub?: string }) {
  const r = 46
  const circ = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const dash = pct * circ
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="116" height="116" viewBox="0 0 116 116">
        {/* glow */}
        <defs>
          <filter id={`glow-${label.replace(/\s/g, '')}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* track */}
        <circle cx="58" cy="58" r={r} fill="none" strokeWidth="7" stroke="rgba(255,255,255,0.05)" />
        {/* progress */}
        <circle
          cx="58" cy="58" r={r}
          fill="none" strokeWidth="7"
          stroke={color}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 58 58)"
          style={{ filter: `drop-shadow(0 0 5px ${color}90)` }}
        />
        {/* center */}
        <text x="58" y="53" textAnchor="middle" fill="white" fontSize="21" fontWeight="700"
          fontFamily="Plus Jakarta Sans, sans-serif">{value}</text>
        {sub && (
          <text x="58" y="70" textAnchor="middle" fill="#475569" fontSize="9.5"
            fontFamily="Plus Jakarta Sans, sans-serif">{sub}</text>
        )}
      </svg>
      <span className="text-xs font-bold tracking-widest uppercase text-center"
        style={{ color: '#475569', letterSpacing: '0.07em' }}>{label}</span>
    </div>
  )
}

// ── Stat Pill ─────────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-xl"
      style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
      <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{value}</span>
    </div>
  )
}

// ── Horizontal Bar ────────────────────────────────────────────
function HBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}55`, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

// ── Category Badge ────────────────────────────────────────────
function CatBadge({ cat }: { cat: string }) {
  const c = CAT_COLORS[cat] ?? '#94a3b8'
  return (
    <span className="inline-block text-xs px-2 py-0.5 rounded-md font-semibold"
      style={{ background: `${c}18`, color: c }}>{cat}</span>
  )
}

// ── Week Bar ──────────────────────────────────────────────────
function WeekBar({ day, count, isToday }: { day: string; count: number; isToday: boolean }) {
  const pct = Math.min((count / 50) * 100, 100)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full rounded-xl overflow-hidden flex flex-col justify-end relative"
        style={{ height: 72, background: 'rgba(255,255,255,0.04)' }}>
        {pct > 0 && (
          <div className="w-full rounded-xl"
            style={{
              height: `${pct}%`,
              background: isToday ? 'linear-gradient(180deg,#818cf8,#5254CC)' : '#334155',
              boxShadow: isToday ? '0 0 14px #818cf866' : 'none',
              minHeight: 4,
            }} />
        )}
      </div>
      <span className="text-xs font-semibold"
        style={{ color: isToday ? '#818cf8' : '#475569' }}>{day}</span>
      {count > 0 && (
        <span className="text-xs font-bold"
          style={{ color: isToday ? 'white' : '#64748b' }}>{count}</span>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function ActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const today = isoToday()
  const dayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const load = useCallback(async () => {
    try {
      const sb = requireSupabase()
      const { data } = await sb
        .from('activity_log')
        .select('*')
        .order('date', { ascending: false })
        .order('time_of_day', { ascending: true })
      setLogs((data ?? []) as LogEntry[])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Today stats
  const todayLogs = logs.filter(l => l.date === today)

  const emailsSent     = todayLogs.find(l => l.category === 'Email' && l.action.includes('sent'))?.quantity ?? 0
  const emailsDelivered = todayLogs.find(l => l.category === 'Email' && l.action.includes('Delivered'))?.quantity ?? 0
  const emailsBounced  = todayLogs.find(l => l.category === 'Email' && l.action.includes('Bounced'))?.quantity ?? 0
  const liConnects     = todayLogs.find(l => l.category === 'LinkedIn' && l.action.includes('connection'))?.quantity ?? 0
  const liDMs          = todayLogs.find(l => l.category === 'LinkedIn' && l.action.includes('DM'))?.quantity ?? 0
  const liTotal        = liConnects + liDMs
  const totalToday     = emailsSent + liTotal

  // ── Week data (Mon–Sun, Mon=today for this week)
  const weekDays  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  // Build a map: ISO date → total quantity / count
  const weekCounts: Record<string, number> = {}
  logs.forEach(l => {
    const d = new Date(l.date)
    const dow = d.getDay() // 0=Sun,1=Mon
    weekCounts[l.date] = (weekCounts[l.date] ?? 0) + (l.quantity ?? 1)
  })
  // Get Mon–Sun of the current ISO week
  const getWeekDates = () => {
    const now   = new Date(today)
    const dow   = now.getDay()                           // 0=Sun
    const diff  = dow === 0 ? -6 : 1 - dow               // Monday offset
    const mon   = new Date(now); mon.setDate(now.getDate() + diff)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon); d.setDate(mon.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }
  const weekDates  = getWeekDates()
  const weekValues = weekDates.map(d => weekCounts[d] ?? 0)

  // ── All-time email totals (across all log entries)
  const allDelivered = logs.filter(l => l.action.includes('Delivered')).reduce((s, l) => s + (l.quantity ?? 0), 0)
  const allBounced   = logs.filter(l => l.action.includes('Bounced')).reduce((s, l) => s + (l.quantity ?? 0), 0)
  const allEmailSent = logs.filter(l => l.category === 'Email' && l.action.includes('sent')).reduce((s, l) => s + (l.quantity ?? 0), 0)

  return (
    <div className="space-y-5">

      {/* ── Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Activity Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {dayLabel} · {dateLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Live Session
        </div>
      </div>

      {/* ── KPI Rings */}
      <div className="card p-6">
        <div className="text-xs font-bold tracking-widest uppercase mb-6"
          style={{ color: '#475569' }}>Today&apos;s Output</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
          <DonutRing value={totalToday}     max={60} color="#818cf8" label="Total Touches"  sub="today" />
          <DonutRing value={emailsSent}     max={30} color="#34d399" label="Emails Sent"    sub={`${emailsDelivered} delivered`} />
          <DonutRing value={liTotal}        max={30} color="#60a5fa" label="LinkedIn"        sub={`${liConnects}+${liDMs}`} />
          <DonutRing value={55}             max={75} color="#fb923c" label="Pipeline Active" sub="prospects" />
        </div>
      </div>

      {/* ── Middle Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">

        {/* Activity Timeline */}
        <div className="card p-5 md:col-span-3">
          <div className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: '#475569' }}>Activity Feed · Today</div>
          {loading && <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>}
          {!loading && todayLogs.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>No activity logged yet today.</p>
          )}
          <div className="space-y-0">
            {!loading && todayLogs.map((log, i) => {
              const c = CAT_COLORS[log.category] ?? '#94a3b8'
              const isLast = i === todayLogs.length - 1
              return (
                <div key={log.id} className="flex gap-3">
                  {/* Spine */}
                  <div className="flex flex-col items-center pt-1.5">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: c, boxShadow: `0 0 7px ${c}99` }} />
                    {!isLast && (
                      <div className="w-px flex-1 mt-0.5" style={{ background: 'var(--border)', minHeight: 20 }} />
                    )}
                  </div>
                  {/* Content */}
                  <div className="pb-4 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{log.action}</p>
                      {log.quantity != null && (
                        <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: `${c}20`, color: c }}>
                          {log.quantity} {log.unit}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <CatBadge cat={log.category} />
                      {log.time_of_day && (
                        <span className="text-xs" style={{ color: '#475569' }}>
                          {log.time_of_day.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="md:col-span-2 space-y-5">

          {/* Email Funnel */}
          <div className="card p-5 space-y-3">
            <div className="text-xs font-bold tracking-widest uppercase mb-1"
              style={{ color: '#475569' }}>Email Funnel · All Time</div>
            <StatPill label="Prospects Scraped" value={50}            color="#94a3b8" />
            <StatPill label="Emails Sent"        value={allEmailSent} color="#818cf8" />
            <StatPill label="Delivered"          value={allDelivered} color="#60a5fa" />
            <StatPill label="Bounced"            value={allBounced}   color="#f87171" />
            <StatPill label="Replies"            value={0}            color="#34d399" />
          </div>

          {/* Channel Breakdown */}
          <div className="card p-5 space-y-3">
            <div className="text-xs font-bold tracking-widest uppercase mb-1"
              style={{ color: '#475569' }}>Today by Channel</div>
            <HBar label="Cold Email"         value={emailsSent} max={40} color="#34d399" />
            <HBar label="LinkedIn Connects"  value={liConnects} max={40} color="#818cf8" />
            <HBar label="LinkedIn DMs"       value={liDMs}      max={40} color="#60a5fa" />
          </div>

        </div>
      </div>

      {/* ── Week Scoreboard */}
      <div className="card p-5">
        <div className="text-xs font-bold tracking-widest uppercase mb-5"
          style={{ color: '#475569' }}>Week Scoreboard</div>
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day, i) => (
            <WeekBar key={day} day={day} count={weekValues[i]} isToday={weekDates[i] === today} />
          ))}
        </div>
      </div>

      {/* ── Recent History (last 7 days, not today) */}
      {logs.filter(l => l.date !== today).length > 0 && (
        <div className="card p-5">
          <div className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: '#475569' }}>Recent History</div>
          <div className="space-y-2">
            {Object.entries(
              logs
                .filter(l => l.date !== today)
                .reduce((acc, l) => {
                  if (!acc[l.date]) acc[l.date] = []
                  acc[l.date].push(l)
                  return acc
                }, {} as Record<string, LogEntry[]>)
            ).map(([date, entries]) => (
              <div key={date}>
                <div className="text-xs font-semibold mb-2 mt-3"
                  style={{ color: '#475569' }}>
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="space-y-1.5">
                  {entries.map(log => {
                    const c = CAT_COLORS[log.category] ?? '#94a3b8'
                    return (
                      <div key={log.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                        style={{ background: 'var(--surface2)' }}>
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: c }} />
                        <span className="text-xs flex-1" style={{ color: 'var(--muted)' }}>{log.action}</span>
                        <CatBadge cat={log.category} />
                        {log.quantity != null && (
                          <span className="text-xs font-bold" style={{ color: c }}>
                            {log.quantity} {log.unit}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
