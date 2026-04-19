'use client'

import { useEffect, useState } from 'react'
import Section from '@/components/Section'
import { requireSupabase } from '@/lib/supabase'

type Goals = {
  id: string
  monthly_revenue_target_usd: number
  monthly_growmated_hours_target: number
  new_clients_target_per_quarter: number
  current_quarter_focus: string | null
  month1_goals: string | null
  month2_goals: string | null
  month3_goals: string | null
  parking_lot: string[]
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goals | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [newIdea, setNewIdea] = useState('')

  useEffect(() => {
    ;(async () => {
      try {
        const sb = requireSupabase()
        const { data, error } = await sb.from('goals').select('*').limit(1).maybeSingle()
        if (error) throw error
        if (data) {
          setGoals({ ...data, parking_lot: data.parking_lot ?? [] })
        } else {
          // Auto-create initial row
          const { data: created, error: cErr } = await sb.from('goals').insert({
            monthly_revenue_target_usd: 0,
            monthly_growmated_hours_target: 0,
            new_clients_target_per_quarter: 0,
            current_quarter_focus: '',
            month1_goals: '',
            month2_goals: '',
            month3_goals: '',
            parking_lot: [],
          }).select().single()
          if (cErr) throw cErr
          setGoals({ ...created, parking_lot: [] })
        }
      } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
    })()
  }, [])

  function set<K extends keyof Goals>(key: K, val: Goals[K]) {
    setGoals(g => g ? { ...g, [key]: val } : g)
  }

  async function save() {
    if (!goals) return
    setSaving(true)
    try {
      const sb = requireSupabase()
      const { id, ...rest } = goals
      const { error } = await sb.from('goals').update(rest).eq('id', id)
      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  function addIdea() {
    if (!newIdea.trim() || !goals) return
    set('parking_lot', [...goals.parking_lot, newIdea.trim()])
    setNewIdea('')
  }

  function removeIdea(idx: number) {
    if (!goals) return
    set('parking_lot', goals.parking_lot.filter((_, i) => i !== idx))
  }

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Goals &amp; Focus</h1>
          <p className="text-sm text-gray-600">Your strategic layer &mdash; where you&apos;re headed</p>
        </div>
        <button onClick={save} disabled={saving}
          className="px-4 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 disabled:opacity-50 transition">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save All'}
        </button>
      </div>

      {err && (
        <div className="card p-3 bg-red-50 border-red-200 text-red-800 text-sm">
          {err} <button className="underline ml-2" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      {/* Targets */}
      <Section title="TARGETS">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Monthly Revenue Target (USD)</label>
            <input
              type="number"
              value={goals?.monthly_revenue_target_usd ?? 0}
              onChange={e => set('monthly_revenue_target_usd', Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Growmated Hours Target / Month</label>
            <input
              type="number"
              value={goals?.monthly_growmated_hours_target ?? 0}
              onChange={e => set('monthly_growmated_hours_target', Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">New Clients Target / Quarter</label>
            <input
              type="number"
              value={goals?.new_clients_target_per_quarter ?? 0}
              onChange={e => set('new_clients_target_per_quarter', Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
            />
          </div>
        </div>
      </Section>

      {/* Quarter Focus */}
      <Section title="CURRENT QUARTER FOCUS">
        <textarea
          value={goals?.current_quarter_focus ?? ''}
          onChange={e => set('current_quarter_focus', e.target.value)}
          rows={3}
          placeholder="What is the one thing you are building toward this quarter?"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30 resize-none"
        />
      </Section>

      {/* 3-Month Plan */}
      <Section title="3-MONTH PLAN">
        <div className="space-y-4">
          {(['month1_goals', 'month2_goals', 'month3_goals'] as const).map((key, i) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1">Month {i + 1}</label>
              <textarea
                value={goals?.[key] ?? ''}
                onChange={e => set(key, e.target.value)}
                rows={2}
                placeholder={`What needs to happen in month ${i + 1}?`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30 resize-none"
              />
            </div>
          ))}
        </div>
      </Section>

      {/* Parking Lot */}
      <Section title="PARKING LOT">
        <p className="text-xs text-gray-500 mb-3">Ideas you don&apos;t want to lose but aren&apos;t acting on yet.</p>
        <div className="space-y-2 mb-4">
          {(goals?.parking_lot ?? []).length === 0 && (
            <p className="text-sm text-gray-400">No ideas yet. Add one below.</p>
          )}
          {(goals?.parking_lot ?? []).map((idea, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="flex-1 text-sm">{idea}</span>
              <button onClick={() => removeIdea(idx)} className="text-gray-400 hover:text-red-500 text-xs leading-none mt-0.5 transition">
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newIdea}
            onChange={e => setNewIdea(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addIdea()}
            placeholder="Add an idea and press Enter..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
          />
          <button onClick={addIdea}
            className="px-4 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 transition">
            Add
          </button>
        </div>
      </Section>
    </div>
  )
}
