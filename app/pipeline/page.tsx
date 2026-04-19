'use client'

import { useCallback, useEffect, useState } from 'react'
import Section from '@/components/Section'
import { requireSupabase } from '@/lib/supabase'

const STATUSES = ['Not contacted', 'Email sent', 'Replied', 'Call scheduled', 'Proposal sent', 'Won', 'Lost']
const SOURCES = ['Google Maps', 'LinkedIn', 'Referral', 'Instagram', 'Cold outreach', 'Other']
const SKIP_OVERDUE = ['Won', 'Lost']

type Prospect = {
  id: string
  business_name: string
  owner_name: string | null
  email: string | null
  industry: string | null
  country_city: string | null
  source: string | null
  outreach_status: string | null
  date_first_contacted: string | null
  last_follow_up_date: string | null
  next_follow_up_date: string | null
  notes: string | null
}

const BLANK: Omit<Prospect, 'id'> = {
  business_name: '', owner_name: '', email: '', industry: '', country_city: '',
  source: 'Cold outreach', outreach_status: 'Not contacted',
  date_first_contacted: null, last_follow_up_date: null, next_follow_up_date: null, notes: '',
}

type FormData = Omit<Prospect, 'id'> & { id?: string }

function todayStr() { return new Date().toISOString().slice(0, 10) }

function isOverdue(p: Prospect) {
  if (!p.next_follow_up_date) return false
  if (p.outreach_status && SKIP_OVERDUE.includes(p.outreach_status)) return false
  return p.next_follow_up_date < todayStr()
}

function statusClass(s: string | null) {
  switch (s) {
    case 'Won': return 'badge bg-green-100 text-green-800'
    case 'Lost': return 'badge bg-gray-100 text-gray-500'
    case 'Proposal sent': return 'badge bg-blue-100 text-blue-800'
    case 'Call scheduled': return 'badge bg-purple-100 text-purple-800'
    case 'Replied': return 'badge bg-amber-100 text-amber-800'
    case 'Email sent': return 'badge bg-sky-100 text-sky-800'
    default: return 'badge bg-gray-100 text-gray-600'
  }
}

export default function PipelinePage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState<FormData | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = requireSupabase()
      const { data, error } = await sb.from('pipeline').select('*')
        .order('next_follow_up_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      setProspects((data ?? []) as Prospect[])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => setForm({ ...BLANK })
  const openEdit = (p: Prospect) => setForm({ ...p })
  const closeForm = () => setForm(null)

  function setF(key: keyof Prospect, val: any) {
    setForm(f => f ? { ...f, [key]: val } : f)
  }

  async function save() {
    if (!form || !form.business_name.trim()) return
    setSaving(true)
    try {
      const sb = requireSupabase()
      const { id, ...rest } = form
      const payload = {
        ...rest,
        date_first_contacted: rest.date_first_contacted || null,
        last_follow_up_date: rest.last_follow_up_date || null,
        next_follow_up_date: rest.next_follow_up_date || null,
      }
      if (id) {
        const { error } = await sb.from('pipeline').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await sb.from('pipeline').insert(payload)
        if (error) throw error
      }
      closeForm()
      await load()
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function del(id: string) {
    if (!confirm('Delete this prospect?')) return
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('pipeline').delete().eq('id', id)
      if (error) throw error
      setProspects(prev => prev.filter(p => p.id !== id))
    } catch (e: any) { setErr(e.message) }
  }

  const filtered = prospects.filter(p => {
    const matchSearch = !search ||
      p.business_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.owner_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || p.outreach_status === filterStatus
    return matchSearch && matchStatus
  })

  const overdueCt = prospects.filter(isOverdue).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-gray-600">
            {prospects.length} prospects{overdueCt > 0 ? ` · ${overdueCt} overdue` : ''}
          </p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 transition">
          + Add Prospect
        </button>
      </div>

      {err && (
        <div className="card p-3 bg-red-50 border-red-200 text-red-800 text-sm">
          {err} <button className="underline ml-2" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      <Section title="ALL PROSPECTS" right={
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 text-white text-xs px-2 py-1 outline-none"
          >
            <option value="All">All</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/50 text-xs px-2 py-1 outline-none w-28"
          />
        </div>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-3">Business</th>
                <th className="pb-2 pr-3">Owner</th>
                <th className="pb-2 pr-3">Email</th>
                <th className="pb-2 pr-3">Location</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Last Follow-up</th>
                <th className="pb-2 pr-3">Next Follow-up</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="py-6 text-center text-gray-400 text-sm">Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-gray-400 text-sm">No prospects found.</td></tr>}
              {filtered.map(p => (
                <tr key={p.id} className={`border-t border-gray-100 ${isOverdue(p) ? 'bg-amber-50' : ''}`}>
                  <td className="py-2.5 pr-3 font-medium">{p.business_name}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{p.owner_name ?? ''}</td>
                  <td className="py-2.5 pr-3 text-gray-500 text-xs">{p.email ?? ''}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{p.country_city ?? ''}</td>
                  <td className="py-2.5 pr-3">
                    <span className={statusClass(p.outreach_status)}>{p.outreach_status ?? '—'}</span>
                  </td>
                  <td className="py-2.5 pr-3">{p.last_follow_up_date ?? ''}</td>
                  <td className="py-2.5 pr-3">{p.next_follow_up_date ?? ''}</td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-navy text-xs hover:underline">Edit</button>
                      <button onClick={() => del(p.id)} className="text-red-500 text-xs hover:underline">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {form && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-xl">
            <div className="hdr rounded-t-2xl px-6 py-4">
              <h2 className="font-semibold text-white">{form.id ? 'Edit Prospect' : 'New Prospect'}</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Business Name *</label>
                <input value={form.business_name} onChange={e => setF('business_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Owner Name</label>
                <input value={form.owner_name ?? ''} onChange={e => setF('owner_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input type="email" value={form.email ?? ''} onChange={e => setF('email', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Industry</label>
                <input value={form.industry ?? ''} onChange={e => setF('industry', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">City / Country</label>
                <input value={form.country_city ?? ''} onChange={e => setF('country_city', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Source</label>
                <select value={form.source ?? 'Cold outreach'} onChange={e => setF('source', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30">
                  {SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Outreach Status</label>
                <select value={form.outreach_status ?? 'Not contacted'} onChange={e => setF('outreach_status', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">First Contacted</label>
                <input type="date" value={form.date_first_contacted ?? ''} onChange={e => setF('date_first_contacted', e.target.value || null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Last Follow-up</label>
                <input type="date" value={form.last_follow_up_date ?? ''} onChange={e => setF('last_follow_up_date', e.target.value || null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Next Follow-up</label>
                <input type="date" value={form.next_follow_up_date ?? ''} onChange={e => setF('next_follow_up_date', e.target.value || null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Notes / Personalization Hook</label>
                <textarea value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)} rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 justify-end px-6 pb-6">
              <button onClick={closeForm} className="px-4 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
