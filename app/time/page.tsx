'use client'

import { useCallback, useEffect, useState } from 'react'
import Section from '@/components/Section'
import { requireSupabase } from '@/lib/supabase'

type TimeLog = {
  id: string
  date: string
  hours_9to5: number | null
  hours_growmated: number | null
  project_task: string | null
  notes: string | null
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function weekBounds() {
  const d = new Date()
  const day = (d.getDay() + 6) % 7 // Mon = 0
  const start = new Date(d)
  start.setDate(d.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export default function TimePage() {
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    date: todayStr(), hours_9to5: '', hours_growmated: '', project_task: '', notes: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = requireSupabase()
      const { data, error } = await sb.from('time_logs').select('*')
        .order('date', { ascending: false }).limit(60)
      if (error) throw error
      setLogs((data ?? []) as TimeLog[])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function addLog() {
    if (!form.hours_9to5 && !form.hours_growmated) return
    setSaving(true)
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('time_logs').insert({
        date: form.date,
        hours_9to5: form.hours_9to5 ? Number(form.hours_9to5) : null,
        hours_growmated: form.hours_growmated ? Number(form.hours_growmated) : null,
        project_task: form.project_task || null,
        notes: form.notes || null,
      })
      if (error) throw error
      setForm({ date: todayStr(), hours_9to5: '', hours_growmated: '', project_task: '', notes: '' })
      await load()
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function del(id: string) {
    if (!confirm('Delete this entry?')) return
    try {
      const sb = requireSupabase()
      await sb.from('time_logs').delete().eq('id', id)
      setLogs(prev => prev.filter(l => l.id !== id))
    } catch (e: any) { setErr(e.message) }
  }

  const { start: sw, end: ew } = weekBounds()
  const weekLogs = logs.filter(l => l.date >= sw && l.date <= ew)
  const weekGrowmated = weekLogs.reduce((s, l) => s + Number(l.hours_growmated ?? 0), 0)
  const weekJob = weekLogs.reduce((s, l) => s + Number(l.hours_9to5 ?? 0), 0)

  const projectHours: Record<string, number> = {}
  weekLogs.forEach(l => {
    if (l.project_task && l.hours_growmated) {
      projectHours[l.project_task] = (projectHours[l.project_task] ?? 0) + Number(l.hours_growmated)
    }
  })
  const topProject = Object.entries(projectHours).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Time Log</h1>
        <p className="text-sm text-gray-600">Track hours across your 9-to-5 and Growmated</p>
      </div>

      {err && (
        <div className="card p-3 bg-red-50 border-red-200 text-red-800 text-sm">
          {err} <button className="underline ml-2" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      {/* Weekly summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Growmated hours (this week)</div>
          <div className="text-2xl font-semibold" style={{ color: '#5254CC' }}>{weekGrowmated.toFixed(1)}h</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">9-to-5 hours (this week)</div>
          <div className="text-2xl font-semibold">{weekJob.toFixed(1)}h</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Top Growmated project</div>
          <div className="text-sm font-medium mt-1">
            {topProject ? `${topProject[0]} (${topProject[1].toFixed(1)}h)` : '—'}
          </div>
        </div>
      </div>

      {/* Log form */}
      <Section title="LOG TIME">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hours 9-to-5</label>
            <input type="number" step="0.5" min="0" value={form.hours_9to5}
              onChange={e => setForm(f => ({ ...f, hours_9to5: e.target.value }))} placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hours Growmated</label>
            <input type="number" step="0.5" min="0" value={form.hours_growmated}
              onChange={e => setForm(f => ({ ...f, hours_growmated: e.target.value }))} placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Project / Task</label>
            <input value={form.project_task} onChange={e => setForm(f => ({ ...f, project_task: e.target.value }))}
              placeholder="e.g. Karen proposal"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <div className="flex gap-2">
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              <button onClick={addLog} disabled={saving}
                className="px-3 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 disabled:opacity-50">
                {saving ? '…' : 'Log'}
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* Recent entries */}
      <Section title="RECENT ENTRIES">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">9-to-5</th>
                <th className="pb-2 pr-3">Growmated</th>
                <th className="pb-2 pr-3">Project / Task</th>
                <th className="pb-2 pr-3">Notes</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="py-6 text-center text-gray-400 text-sm">Loading...</td></tr>}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400 text-sm">No entries yet. Log time above.</td></tr>
              )}
              {logs.map(l => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="py-2 pr-3">{l.date}</td>
                  <td className="py-2 pr-3">{l.hours_9to5 != null ? `${l.hours_9to5}h` : '—'}</td>
                  <td className="py-2 pr-3 font-medium" style={{ color: '#5254CC' }}>{l.hours_growmated != null ? `${l.hours_growmated}h` : '—'}</td>
                  <td className="py-2 pr-3">{l.project_task ?? ''}</td>
                  <td className="py-2 pr-3 text-gray-500 text-xs">{l.notes ?? ''}</td>
                  <td className="py-2">
                    <button onClick={() => del(l.id)} className="text-red-500 text-xs hover:underline">Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  )
}
