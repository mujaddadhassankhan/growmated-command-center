'use client'

import { useCallback, useEffect, useState } from 'react'
import { requireSupabase } from '@/lib/supabase'

const CATEGORIES = ['All', 'LinkedIn', 'Facebook DM', 'Email', 'Follow-up', 'General']

type Template = {
  id: string
  title: string
  category: string
  content: string
  created_at: string
}

const BLANK: Omit<Template, 'id' | 'created_at'> = {
  title: '',
  category: 'Facebook DM',
  content: '',
}

type FormData = Omit<Template, 'id' | 'created_at'> & { id?: string }

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'LinkedIn':    { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },
  'Facebook DM': { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa' },
  'Email':       { bg: 'rgba(16,185,129,0.15)',  text: '#34d399' },
  'Follow-up':   { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24' },
  'General':     { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
}

function CategoryBadge({ cat }: { cat: string }) {
  const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['General']
  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-lg text-xs font-semibold"
      style={{ background: colors.bg, color: colors.text }}
    >
      {cat}
    </span>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState<FormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = requireSupabase()
      const { data, error } = await sb.from('templates').select('*').order('category').order('title')
      if (error) throw error
      setTemplates((data ?? []) as Template[])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function copy(t: Template) {
    await navigator.clipboard.writeText(t.content)
    setCopied(t.id)
    setTimeout(() => setCopied(null), 2000)
  }

  const openAdd  = () => setForm({ ...BLANK })
  const openEdit = (t: Template) => setForm({ id: t.id, title: t.title, category: t.category, content: t.content })
  const closeForm = () => setForm(null)

  function setF(key: keyof FormData, val: string) {
    setForm(f => f ? { ...f, [key]: val } : f)
  }

  async function save() {
    if (!form || !form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const sb = requireSupabase()
      const { id, ...rest } = form
      if (id) {
        const { error } = await sb.from('templates').update(rest).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await sb.from('templates').insert(rest)
        if (error) throw error
      }
      closeForm()
      await load()
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function del(id: string) {
    if (!confirm('Delete this template?')) return
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('templates').delete().eq('id', id)
      if (error) throw error
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (e: any) { setErr(e.message) }
  }

  const filtered = templates.filter(t => {
    const matchCat = filter === 'All' || t.category === filter
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  // Group by category
  const grouped = CATEGORIES.slice(1).reduce((acc, cat) => {
    const items = filtered.filter(t => t.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {} as Record<string, Template[]>)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Message Templates
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {templates.length} templates — click any to copy
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 transition"
        >
          + New Template
        </button>
      </div>

      {err && (
        <div className="card p-3 text-sm" style={{ borderLeft: '3px solid #f87171', color: '#f87171' }}>
          {err} <button className="underline ml-2" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={filter === cat
              ? { background: '#5254CC', color: 'white' }
              : { background: 'var(--surface2)', color: 'var(--muted)' }
            }
          >
            {cat}
          </button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="ml-auto rounded-xl border text-xs px-3 py-1.5 outline-none w-36"
          style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>Loading templates...</div>
      )}

      {/* Grouped Cards */}
      {!loading && Object.keys(grouped).length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
          No templates found. Hit + New Template to add one.
        </div>
      )}

      {!loading && Object.entries(grouped).map(([cat, items]) => {
        const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['General']
        return (
          <div key={cat}>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: colors.text }}>{cat}</div>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{items.length} templates</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(t => {
                const isExpanded = expanded === t.id
                const isCopied = copied === t.id
                return (
                  <div
                    key={t.id}
                    className="card p-4 flex flex-col gap-3 transition-all"
                    style={{ borderLeft: `3px solid ${colors.text}` }}
                  >
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{t.title}</div>
                        <CategoryBadge cat={t.category} />
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 mt-0.5">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : t.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                          style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                        <button
                          onClick={() => copy(t)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                          style={isCopied
                            ? { background: 'rgba(74,222,128,0.2)', color: '#4ade80' }
                            : { background: colors.bg, color: colors.text }
                          }
                        >
                          {isCopied ? '✓ Copied!' : '📋 Copy'}
                        </button>
                        <button onClick={() => openEdit(t)} className="px-2.5 py-1 rounded-lg text-xs transition-all" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>Edit</button>
                        <button onClick={() => del(t.id)} className="px-2.5 py-1 rounded-lg text-xs transition-all" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>Del</button>
                      </div>
                    </div>

                    {/* Preview or full content */}
                    {isExpanded ? (
                      <pre
                        className="text-xs leading-relaxed whitespace-pre-wrap rounded-xl p-3"
                        style={{ background: 'var(--surface2)', color: '#CBD5E1', fontFamily: 'inherit' }}
                      >
                        {t.content}
                      </pre>
                    ) : (
                      <p
                        className="text-xs leading-relaxed line-clamp-2 cursor-pointer"
                        style={{ color: 'var(--muted)' }}
                        onClick={() => setExpanded(t.id)}
                      >
                        {t.content}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Form Modal */}
      {form && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="rounded-2xl w-full max-w-2xl my-8 shadow-xl" style={{ background: 'var(--surface)' }}>
            <div className="hdr rounded-t-2xl px-6 py-4">
              <h2 className="font-semibold text-white">{form.id ? 'Edit Template' : 'New Template'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Title *</label>
                <input
                  value={form.title}
                  onChange={e => setF('title', e.target.value)}
                  placeholder="e.g. Photo Booth — Cold Email"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Category</label>
                <select
                  value={form.category}
                  onChange={e => setF('category', e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  {CATEGORIES.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Message Content *</label>
                <textarea
                  value={form.content}
                  onChange={e => setF('content', e.target.value)}
                  rows={10}
                  placeholder="Write your template here. Use [Name], [Business Name] etc. as placeholders."
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-navy/30 resize-none"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)', fontFamily: 'monospace' }}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end px-6 pb-6">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-xl text-sm"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
