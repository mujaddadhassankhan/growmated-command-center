'use client'

import { useCallback, useEffect, useState } from 'react'
import Section from '@/components/Section'
import { requireSupabase } from '@/lib/supabase'
import { statusBadgeClass } from '@/lib/utils'

const PHASES = ['Discovery', 'Proposal Sent', 'In Build', 'Phase 1 Done', 'Phase 2 Done', 'Complete', 'Retainer']
const STATUSES = ['Green', 'Yellow', 'Red']

type Client = {
  id: string
  client_name: string
  business_type: string | null
  country: string | null
  project_name: string | null
  phase: string | null
  status: string | null
  start_date: string | null
  expected_completion: string | null
  contract_value_usd: number | null
  amount_received: number | null
  amount_outstanding: number | null
  monthly_retainer_usd: number | null
  next_action: string | null
  next_action_due_date: string | null
  notes: string | null
}

const BLANK: Omit<Client, 'id'> = {
  client_name: '', business_type: '', country: '', project_name: '',
  phase: 'Discovery', status: 'Green',
  start_date: null, expected_completion: null,
  contract_value_usd: null, amount_received: null, amount_outstanding: null, monthly_retainer_usd: null,
  next_action: '', next_action_due_date: null, notes: '',
}

type FormData = Omit<Client, 'id'> & { id?: string }

function todayStr() { return new Date().toISOString().slice(0, 10) }
function isOverdue(c: Client) {
  return !!c.next_action_due_date && c.next_action_due_date < todayStr()
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState<FormData | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = requireSupabase()
      const { data, error } = await sb.from('clients').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setClients((data ?? []) as Client[])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => setForm({ ...BLANK })
  const openEdit = (c: Client) => setForm({ ...c })
  const closeForm = () => setForm(null)

  function setF(key: keyof Client, val: any) {
    setForm(f => f ? { ...f, [key]: val } : f)
  }

  async function save() {
    if (!form || !form.client_name.trim()) return
    setSaving(true)
    try {
      const sb = requireSupabase()
      const { id, ...rest } = form
      if (id) {
        const { error } = await sb.from('clients').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await sb.from('clients').insert(rest)
        if (error) throw error
      }
      closeForm()
      await load()
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function del(id: string) {
    if (!confirm('Delete this client?')) return
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('clients').delete().eq('id', id)
      if (error) throw error
      setClients(prev => prev.filter(c => c.id !== id))
    } catch (e: any) { setErr(e.message) }
  }

  const filtered = clients.filter(c =>
    !search ||
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.project_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-gray-600">{clients.length} total</p>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 transition">
          + Add Client
        </button>
      </div>

      {err && (
        <div className="card p-3 bg-red-50 border-red-200 text-red-800 text-sm">
          {err} <button className="underline ml-2" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      <Section title="ALL CLIENTS" right={
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/50 text-xs px-2 py-1 outline-none w-32"
        />
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="pb-2 pr-3">Client</th>
                <th className="pb-2 pr-3">Project</th>
                <th className="pb-2 pr-3">Phase</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3 text-right">Value</th>
                <th className="pb-2 pr-3 text-right">Received</th>
                <th className="pb-2 pr-3">Next Action</th>
                <th className="pb-2 pr-3">Due</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="py-6 text-center text-gray-400 text-sm">Loading...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-gray-400 text-sm">No clients yet. Hit + Add Client to get started.</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} className={`border-t border-gray-100 ${isOverdue(c) ? 'bg-red-50' : ''}`}>
                  <td className="py-2.5 pr-3 font-medium">{c.client_name}</td>
                  <td className="py-2.5 pr-3 text-gray-600">{c.project_name ?? ''}</td>
                  <td className="py-2.5 pr-3">{c.phase ?? ''}</td>
                  <td className="py-2.5 pr-3">
                    <span className={statusBadgeClass(c.status ?? undefined)}>{c.status ?? '—'}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {c.contract_value_usd != null ? `$${Number(c.contract_value_usd).toLocaleString()}` : '—'}
                  </td>
                  <td className="py-2.5 pr-3 text-right">
                    {c.amount_received != null ? `$${Number(c.amount_received).toLocaleString()}` : '—'}
                  </td>
                  <td className="py-2.5 pr-3 max-w-[200px] truncate text-gray-600" title={c.next_action ?? ''}>
                    {c.next_action ?? ''}
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">{c.next_action_due_date ?? ''}</td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="text-navy text-xs hover:underline">Edit</button>
                      <button onClick={() => del(c.id)} className="text-red-500 text-xs hover:underline">Del</button>
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
              <h2 className="font-semibold text-white">{form.id ? 'Edit Client' : 'New Client'}</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Client Name *</label>
                <input value={form.client_name} onChange={e => setF('client_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Business Type</label>
                <input value={form.business_type ?? ''} onChange={e => setF('business_type', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Country</label>
                <input value={form.country ?? ''} onChange={e => setF('country', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Project Name</label>
                <input value={form.project_name ?? ''} onChange={e => setF('project_name', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phase</label>
                <select value={form.phase ?? 'Discovery'} onChange={e => setF('phase', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30">
                  {PHASES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select value={form.status ?? 'Green'} onChange={e => setF('status', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input type="date" value={form.start_date ?? ''} onChange={e => setF('start_date', e.target.value || null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Expected Completion</label>
                <input type="date" value={form.expected_completion ?? ''} onChange={e => setF('expected_completion', e.target.value || null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Contract Value (USD)</label>
                <input type="number" value={form.contract_value_usd ?? ''} onChange={e => setF('contract_value_usd', e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Monthly Retainer (USD)</label>
                <input type="number" value={form.monthly_retainer_usd ?? ''} onChange={e => setF('monthly_retainer_usd', e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount Received</label>
                <input type="number" value={form.amount_received ?? ''} onChange={e => setF('amount_received', e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Amount Outstanding</label>
                <input type="number" value={form.amount_outstanding ?? ''} onChange={e => setF('amount_outstanding', e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Next Action</label>
                <input value={form.next_action ?? ''} onChange={e => setF('next_action', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Next Action Due</label>
                <input type="date" value={form.next_action_due_date ?? ''} onChange={e => setF('next_action_due_date', e.target.value || null)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Notes</label>
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
