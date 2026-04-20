'use client'

import { useCallback, useEffect, useState } from 'react'
import { requireSupabase } from '@/lib/supabase'

const PLATFORMS = ['All', 'Facebook', 'LinkedIn', 'Facebook + LinkedIn']
const STATUSES  = ['Draft', 'Scheduled', 'Posted', 'Skipped']
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  'Draft':     { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
  'Scheduled': { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24' },
  'Posted':    { bg: 'rgba(74,222,128,0.15)',  text: '#4ade80' },
  'Skipped':   { bg: 'rgba(248,113,113,0.15)', text: '#f87171' },
}
const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  'Facebook':            { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  'LinkedIn':            { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },
  'Facebook + LinkedIn': { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
}

type Post = {
  id: string
  title: string
  content: string
  platform: string
  target_audience: string | null
  scheduled_date: string | null
  status: string
  notes: string | null
  views: number | null
  comments: number | null
  dms_received: number | null
  leads_generated: number | null
  created_at: string
}

const BLANK: Omit<Post, 'id' | 'created_at'> = {
  title: '', content: '', platform: 'Facebook',
  target_audience: '', scheduled_date: null,
  status: 'Draft', notes: '',
  views: null, comments: null, dms_received: null, leads_generated: null,
}

type FormData = Omit<Post, 'id' | 'created_at'> & { id?: string }

function todayStr() { return new Date().toISOString().slice(0, 10) }

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS['Draft']
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}>{status}</span>
  )
}

function PlatformBadge({ platform }: { platform: string }) {
  const c = PLATFORM_COLORS[platform] ?? PLATFORM_COLORS['Facebook']
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}>{platform}</span>
  )
}

export default function ContentCalendarPage() {
  const [posts, setPosts]       = useState<Post[]>([])
  const [filter, setFilter]     = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [loading, setLoading]   = useState(true)
  const [err, setErr]           = useState<string | null>(null)
  const [form, setForm]         = useState<FormData | null>(null)
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = requireSupabase()
      const { data, error } = await sb.from('content_calendar').select('*')
        .order('scheduled_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      setPosts((data ?? []) as Post[])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function copy(p: Post) {
    await navigator.clipboard.writeText(p.content)
    setCopied(p.id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function markPosted(p: Post) {
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('content_calendar').update({ status: 'Posted' }).eq('id', p.id)
      if (error) throw error
      setPosts(prev => prev.map(x => x.id === p.id ? { ...x, status: 'Posted' } : x))
    } catch (e: any) { setErr(e.message) }
  }

  const openAdd  = () => setForm({ ...BLANK })
  const openEdit = (p: Post) => setForm({ id: p.id, title: p.title, content: p.content, platform: p.platform, target_audience: p.target_audience, scheduled_date: p.scheduled_date, status: p.status, notes: p.notes, views: p.views, comments: p.comments, dms_received: p.dms_received, leads_generated: p.leads_generated })
  const closeForm = () => setForm(null)

  function setF(key: keyof FormData, val: any) {
    setForm(f => f ? { ...f, [key]: val } : f)
  }

  async function save() {
    if (!form || !form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const sb = requireSupabase()
      const { id, ...rest } = form
      const payload = { ...rest, scheduled_date: rest.scheduled_date || null }
      if (id) {
        const { error } = await sb.from('content_calendar').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await sb.from('content_calendar').insert(payload)
        if (error) throw error
      }
      closeForm()
      await load()
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function del(id: string) {
    if (!confirm('Delete this post?')) return
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('content_calendar').delete().eq('id', id)
      if (error) throw error
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (e: any) { setErr(e.message) }
  }

  const today = todayStr()
  const filtered = posts.filter(p => {
    const matchPlatform = filter === 'All' || p.platform === filter
    const matchStatus = filterStatus === 'All' || p.status === filterStatus
    return matchPlatform && matchStatus
  })

  const postedCount    = posts.filter(p => p.status === 'Posted').length
  const scheduledCount = posts.filter(p => p.status === 'Scheduled').length
  const dueTodayCount  = posts.filter(p => p.scheduled_date === today && p.status !== 'Posted').length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Content Calendar
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {postedCount} posted · {scheduledCount} scheduled
            {dueTodayCount > 0 && (
              <span className="ml-3 font-semibold" style={{ color: '#f87171' }}>
                ⚡ {dueTodayCount} due today
              </span>
            )}
          </p>
        </div>
        <button onClick={openAdd}
          className="px-4 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 transition">
          + Add Post
        </button>
      </div>

      {err && (
        <div className="card p-3 text-sm" style={{ borderLeft: '3px solid #f87171', color: '#f87171' }}>
          {err} <button className="underline ml-2" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Posted',    val: postedCount,    color: '#4ade80' },
          { label: 'Scheduled', val: scheduledCount, color: '#fbbf24' },
          { label: 'Total',     val: posts.length,   color: '#5254CC' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card p-4 text-center" style={{ borderTop: `3px solid ${color}` }}>
            <div className="text-2xl font-bold" style={{ color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{val}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5">
          {PLATFORMS.map(p => (
            <button key={p} onClick={() => setFilter(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={filter === p
                ? { background: '#5254CC', color: 'white' }
                : { background: 'var(--surface2)', color: 'var(--muted)' }}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {['All', ...STATUSES].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={filterStatus === s
                ? { background: '#5254CC', color: 'white' }
                : { background: 'var(--surface2)', color: 'var(--muted)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Posts list */}
      {loading && <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
          No posts found. Hit + Add Post to plan your first piece of content.
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {filtered.map(p => {
            const isExpanded = expanded === p.id
            const isCopied   = copied === p.id
            const isToday    = p.scheduled_date === today
            const isOverdue  = p.scheduled_date && p.scheduled_date < today && p.status !== 'Posted'
            const accentColor = isOverdue ? '#f87171' : isToday ? '#fbbf24' : 'var(--border)'

            return (
              <div key={p.id} className="card p-5" style={{ borderLeft: `3px solid ${accentColor}` }}>

                {/* Top row */}
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      {isOverdue && <span className="text-xs font-bold" style={{ color: '#f87171' }}>⚠ OVERDUE</span>}
                      {isToday && p.status !== 'Posted' && <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>⚡ POST TODAY</span>}
                      <PlatformBadge platform={p.platform} />
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text)' }}>{p.title}</div>
                    {p.target_audience && (
                      <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>📍 {p.target_audience}</div>
                    )}
                    {p.scheduled_date && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        📅 {new Date(p.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    {p.notes && (
                      <div className="text-xs mt-1.5 italic" style={{ color: 'var(--muted)' }}>{p.notes}</div>
                    )}
                    {p.status === 'Posted' && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {[
                          { label: 'Views',    val: p.views,           icon: '👁' },
                          { label: 'Comments', val: p.comments,        icon: '💬' },
                          { label: 'DMs',      val: p.dms_received,    icon: '📩' },
                          { label: 'Leads',    val: p.leads_generated, icon: '🎯' },
                        ].map(({ label, val, icon }) => (
                          <div key={label} className="flex items-center gap-1">
                            <span className="text-xs">{icon}</span>
                            <span className="text-xs font-semibold" style={{ color: val ? '#4ade80' : 'var(--muted)' }}>
                              {val ?? '—'}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
                    <button onClick={() => setExpanded(isExpanded ? null : p.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                      {isExpanded ? 'Hide' : 'View'}
                    </button>
                    <button onClick={() => copy(p)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={isCopied
                        ? { background: 'rgba(74,222,128,0.2)', color: '#4ade80' }
                        : { background: 'rgba(82,84,204,0.2)', color: '#5254CC' }}>
                      {isCopied ? '✓ Copied!' : '📋 Copy'}
                    </button>
                    {p.status !== 'Posted' && (
                      <button onClick={() => markPosted(p)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                        style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
                        ✓ Mark Posted
                      </button>
                    )}
                    <button onClick={() => openEdit(p)}
                      className="px-2.5 py-1 rounded-lg text-xs"
                      style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>Edit</button>
                    <button onClick={() => del(p.id)}
                      className="px-2.5 py-1 rounded-lg text-xs"
                      style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>Del</button>
                  </div>
                </div>

                {/* Full content */}
                {isExpanded && (
                  <pre className="mt-4 text-xs leading-relaxed whitespace-pre-wrap rounded-xl p-4"
                    style={{ background: 'var(--surface2)', color: '#CBD5E1', fontFamily: 'inherit' }}>
                    {p.content}
                  </pre>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="rounded-2xl w-full max-w-2xl my-8 shadow-xl" style={{ background: 'var(--surface)' }}>
            <div className="hdr rounded-t-2xl px-6 py-4">
              <h2 className="font-semibold text-white">{form.id ? 'Edit Post' : 'New Post'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Title *</label>
                <input value={form.title} onChange={e => setF('title', e.target.value)}
                  placeholder="e.g. Photo Booth — Case Study Post"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Platform</label>
                  <select value={form.platform} onChange={e => setF('platform', e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                    {PLATFORMS.slice(1).map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Status</label>
                  <select value={form.status} onChange={e => setF('status', e.target.value)}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Scheduled Date</label>
                  <input type="date" value={form.scheduled_date ?? ''} onChange={e => setF('scheduled_date', e.target.value || null)}
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Target Audience / Groups</label>
                  <input value={form.target_audience ?? ''} onChange={e => setF('target_audience', e.target.value)}
                    placeholder="e.g. Photo Booth groups"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
                    style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Post Content *</label>
                <textarea value={form.content} onChange={e => setF('content', e.target.value)} rows={10}
                  placeholder="Write the full post here..."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30 resize-none"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Notes / Strategy</label>
                <textarea value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)} rows={2}
                  placeholder="Why this post, what to do after it goes live, etc."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30 resize-none"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
              {form.status === 'Posted' && (
                <div>
                  <label className="block text-xs mb-2 font-semibold" style={{ color: 'var(--muted)' }}>Engagement Results</label>
                  <div className="grid grid-cols-4 gap-3">
                    {([['views','👁 Views'],['comments','💬 Comments'],['dms_received','📩 DMs'],['leads_generated','🎯 Leads']] as const).map(([key, label]) => (
                      <div key={key}>
                        <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
                        <input type="number" min="0"
                          value={form[key] ?? ''}
                          onChange={e => setF(key, e.target.value ? Number(e.target.value) : null)}
                          className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
                          style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end px-6 pb-6">
              <button onClick={closeForm} className="px-4 py-2 rounded-xl text-sm"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-4 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
