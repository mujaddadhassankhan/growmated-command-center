'use client'

import { useEffect, useMemo, useState } from 'react'
import Section from '@/components/Section'
import { requireSupabase } from '@/lib/supabase'
import { statusBadgeClass } from '@/lib/utils'

type ClientRow = {
  id: string
  client_name: string
  project_name: string | null
  phase: string | null
  status: string | null
  next_action: string | null
  next_action_due_date: string | null
}

type PipelineCounts = {
  reaching_out: number
  discovery: number
  proposals_waiting: number
}

type Money = {
  invoiced: number
  received: number
  outstanding: number
  expenses: number
  net_profit: number
}

type Hours = {
  nine_to_five: number
  growmated: number
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function startOfWeek(d = new Date()) {
  const day = (d.getDay() + 6) % 7 // Mon=0
  const s = new Date(d)
  s.setDate(d.getDate() - day)
  s.setHours(0, 0, 0, 0)
  return s
}
function endOfWeek(d = new Date()) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  e.setHours(23, 59, 59, 999)
  return e
}

export default function DashboardPage() {
  const [top3, setTop3] = useState<string[]>(['', '', ''])
  const [quickWins, setQuickWins] = useState('')
  const [clients, setClients] = useState<ClientRow[]>([])
  const [pipeline, setPipeline] = useState<PipelineCounts>({ reaching_out: 0, discovery: 0, proposals_waiting: 0 })
  const [money, setMoney] = useState<Money>({ invoiced: 0, received: 0, outstanding: 0, expenses: 0, net_profit: 0 })
  const [hours, setHours] = useState<Hours>({ nine_to_five: 0, growmated: 0 })
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    // Local-only inputs: fast + no friction
    const t = localStorage.getItem('cc_top3')
    const q = localStorage.getItem('cc_quickwins')
    if (t) setTop3(JSON.parse(t))
    if (q) setQuickWins(q)
  }, [])

  useEffect(() => {
    localStorage.setItem('cc_top3', JSON.stringify(top3))
  }, [top3])

  useEffect(() => {
    localStorage.setItem('cc_quickwins', quickWins)
  }, [quickWins])

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = requireSupabase()

        // Clients (active = phase != 'Complete')
        const { data: cData, error: cErr } = await supabase
          .from('clients')
          .select('id, client_name, project_name, phase, status, next_action, next_action_due_date')
          .neq('phase', 'Complete')
          .order('next_action_due_date', { ascending: true, nullsFirst: false })
          .limit(25)

        if (cErr) throw cErr
        setClients((cData ?? []) as any)

        // Pipeline counts
        const statuses = ['Not contacted', 'Email sent', 'Call scheduled', 'Proposal sent']
        const { data: pData, error: pErr } = await supabase
          .from('pipeline')
          .select('outreach_status')
          .in('outreach_status', statuses)
        if (pErr) throw pErr
        const reaching = (pData ?? []).filter((r: any) => r.outreach_status === 'Not contacted' || r.outreach_status === 'Email sent').length
        const discovery = (pData ?? []).filter((r: any) => r.outreach_status === 'Call scheduled').length
        const proposals = (pData ?? []).filter((r: any) => r.outreach_status === 'Proposal sent').length
        setPipeline({ reaching_out: reaching, discovery, proposals_waiting: proposals })

        // Money this month
        const sm = startOfMonth()
        const em = endOfMonth()

        const { data: incData, error: incErr } = await supabase
          .from('income')
          .select('amount, status, date')
          .gte('date', sm.toISOString().slice(0, 10))
          .lte('date', em.toISOString().slice(0, 10))
        if (incErr) throw incErr

        const { data: expData, error: expErr } = await supabase
          .from('expenses')
          .select('amount, date')
          .gte('date', sm.toISOString().slice(0, 10))
          .lte('date', em.toISOString().slice(0, 10))
        if (expErr) throw expErr

        const invoiced = (incData ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
        const received = (incData ?? []).filter((r: any) => r.status === 'Paid').reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
        const outstanding = (incData ?? []).filter((r: any) => r.status === 'Outstanding').reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
        const expenses = (expData ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0)
        const net_profit = received - expenses
        setMoney({ invoiced, received, outstanding, expenses, net_profit })

        // Hours this week
        const sw = startOfWeek()
        const ew = endOfWeek()
        const { data: tData, error: tErr } = await supabase
          .from('time_logs')
          .select('hours_9to5, hours_growmated, date')
          .gte('date', sw.toISOString().slice(0, 10))
          .lte('date', ew.toISOString().slice(0, 10))
        if (tErr) throw tErr
        const nine_to_five = (tData ?? []).reduce((s: number, r: any) => s + (r.hours_9to5 ?? 0), 0)
        const growmated = (tData ?? []).reduce((s: number, r: any) => s + (r.hours_growmated ?? 0), 0)
        setHours({ nine_to_five, growmated })

      } catch (e: any) {
        setErr(e?.message ?? 'Failed loading data')
      }
    })()
  }, [])

  const today = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), [])

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-600">{today}</p>
        </div>
      </div>

      {err && (
        <div className="card p-4 border-red-200 bg-red-50 text-red-800">
          <div className="font-semibold">Setup needed</div>
          <div className="text-sm mt-1">{err}</div>
          <div className="text-sm mt-2">Add your Supabase env vars (see .env.example), then refresh.</div>
        </div>
      )}

      <Section title="TODAY'S TOP 3">
        <div className="space-y-3">
          {top3.map((v, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-7 text-lg font-semibold text-gray-700">{idx + 1}.</div>
              <input
                value={v}
                onChange={e => {
                  const n = [...top3]
                  n[idx] = e.target.value
                  setTop3(n)
                }}
                placeholder="Write the one thing that matters"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-navy/30"
              />
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="ACTIVE CLIENTS SNAPSHOT">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2">Client</th>
                    <th className="py-2">Project</th>
                    <th className="py-2">Phase</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Next action</th>
                    <th className="py-2">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="py-2 font-medium">{c.client_name}</td>
                      <td className="py-2">{c.project_name ?? ''}</td>
                      <td className="py-2">{c.phase ?? ''}</td>
                      <td className="py-2"><span className={statusBadgeClass(c.status ?? undefined)}>{c.status ?? '-'}</span></td>
                      <td className="py-2 max-w-[280px] truncate" title={c.next_action ?? ''}>{c.next_action ?? ''}</td>
                      <td className="py-2">{c.next_action_due_date ?? ''}</td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td className="py-3 text-gray-500" colSpan={6}>No active clients yet. Add them on the Clients page.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="PIPELINE SUMMARY">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Reaching out</span><span className="font-semibold">{pipeline.reaching_out}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Discovery</span><span className="font-semibold">{pipeline.discovery}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Proposals waiting</span><span className="font-semibold">{pipeline.proposals_waiting}</span></div>
            </div>
          </Section>

          <Section title="MONEY THIS MONTH">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Invoiced</span><span className="font-semibold">${money.invoiced.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Received</span><span className="font-semibold">${money.received.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Outstanding</span><span className="font-semibold">${money.outstanding.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Expenses</span><span className="font-semibold">${money.expenses.toLocaleString()}</span></div>
              <div className="pt-2 border-t border-gray-100 flex justify-between"><span className="text-gray-600">Net profit</span><span className="font-semibold">${money.net_profit.toLocaleString()}</span></div>
            </div>
          </Section>

          <Section title="HOURS THIS WEEK">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">9-to-5</span><span className="font-semibold">{hours.nine_to_five.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Growmated</span><span className="font-semibold">{hours.growmated.toFixed(1)}</span></div>
            </div>
          </Section>
        </div>
      </div>

      <Section title="QUICK WINS THIS WEEK">
        <textarea
          value={quickWins}
          onChange={e => setQuickWins(e.target.value)}
          placeholder="What moved forward? Small wins count."
          className="min-h-[120px] w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
        />
      </Section>
    </div>
  )
}
