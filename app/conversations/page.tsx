'use client'

import { useCallback, useEffect, useState } from 'react'
import Section from '@/components/Section'
import { requireSupabase } from '@/lib/supabase'

const CHANNELS   = ['Facebook', 'LinkedIn', 'Email', 'WhatsApp', 'Instagram', 'Other']
const DIRECTIONS = ['sent', 'received']
const OUTCOMES   = ['no-reply', 'replied', 'interested', 'not-interested', 'booked-call', 'won', 'lost']

type Log = {
  id: string
  date: string
  contact_name: string
  channel: string
  direction: string
  content: string | null
  outcome: string | null
  next_step: string | null
  pipeline_id: string | null
  client_id: string | null
}

type FBPost = {
  id: string
  posted_date: string
  content: string | null
  post_type: string | null
  comments_count: number
  dms_received: number
  leads_generated: number
  notes: string | null
}

function todayStr() { return new Date().toISOString().slice(0, 10) }

function outcomeColor(o: string | null) {
  switch (o) {
    case 'won':           return { bg: 'rgba(74,222,128,0.12)',  text: '#4ade80' }
    case 'interested':
    case 'booked-call':   return { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' }
    case 'replied':       return { bg: 'rgba(96,165,250,0.12)', text: '#60a5fa' }
    case 'not-interested':
    case 'lost':          return { bg: 'rgba(248,113,113,0.12)', text: '#f87171' }
    default:              return { bg: 'rgba(255,255,255,0.06)', text: '#8B95A6' }
  }
}

function channelIcon(ch: string) {
  switch (ch) {
    case 'Facebook':  return '📘'
    case 'LinkedIn':  return '💼'
    case 'Email':     return '✉️'
    case 'WhatsApp':  return '💬'
    case 'Instagram': return '📸'
    default:          return '💡'
  }
}

// Group logs by contact name
function groupByContact(logs: Log[]): Record<string, Log[]> {
  return logs.reduce((acc, l) => {
    if (!acc[l.contact_name]) acc[l.contact_name] = []
    acc[l.contact_name].push(l)
    return acc
  }, {} as Record<string, Log[]>)
}

export default function ConversationsPage() {
  const [logs, setLogs]       = useState<Log[]>([])
  const [fbPosts, setFbPosts] = useState<FBPost[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'conversations' | 'facebook'>('conversations')
  const [expandedContact, setExpandedContact] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    date: todayStr(), contact_name: '', channel: 'Facebook', direction: 'received',
    content: '', outcome: 'no-reply', next_step: '',
  })
  const [fbForm, setFbForm] = useState({
    posted_date: todayStr(), content: '', post_type: 'content',
    comments_count: 0, dms_received: 0, leads_generated: 0, notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [savingFb, setSavingFb] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = requireSupabase()
      const [logsRes, fbRes] = await Promise.all([
        sb.from('outreach_log').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(200),
        sb.from('facebook_posts').select('*').order('posted_date', { ascending: false }).limit(50),
      ])
      if (logsRes.error) throw logsRes.error
      if (fbRes.error)   throw fbRes.error
      setLogs((logsRes.data ?? []) as Log[])
      setFbPosts((fbRes.data ?? []) as FBPost[])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function addLog() {
    if (!form.contact_name.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('outreach_log').insert({
        date: form.date,
        contact_name: form.contact_name.trim(),
        channel: form.channel,
        direction: form.direction,
        content: form.content,
        outcome: form.outcome,
        next_step: form.next_step || null,
      })
      if (error) throw error
      setForm({ date: todayStr(), contact_name: '', channel: 'Facebook', direction: 'received', content: '', outcome: 'no-reply', next_step: '' })
      await load()
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function addFbPost() {
    if (!fbForm.content.trim()) return
    setSavingFb(true)
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('facebook_posts').insert(fbForm)
      if (error) throw error
      setFbForm({ posted_date: todayStr(), content: '', post_type: 'content', comments_count: 0, dms_received: 0, leads_generated: 0, notes: '' })
      await load()
    } catch (e: any) { setErr(e.message) } finally { setSavingFb(false) }
  }

  async function delLog(id: string) {
    if (!confirm('Delete this entry?')) return
    try {
      await requireSupabase().from('outreach_log').delete().eq('id', id)
      setLogs(prev => prev.filter(l => l.id !== id))
    } catch (e: any) { setErr(e.message) }
  }

  async function delFbPost(id: string) {
    if (!confirm('Delete this post?')) return
    try {
      await requireSupabase().from('facebook_posts').delete().eq('id', id)
      setFbPosts(prev => prev.filter(p => p.id !== id))
    } catch (e: any) { setErr(e.message) }
  }

  // Filter + group
  const filtered = logs.filter(l =>
    !search || l.contact_name.toLowerCase().includes(search.toLowerCase())
  )
  const grouped = groupByContact(filtered)
  const contacts = Object.keys(grouped).sort((a, b) => {
    // Sort by most recent interaction
    const aDate = grouped[a][0]?.date ?? ''
    const bDate = grouped[b][0]?.date ?? ''
    return bDate.localeCompare(aDate)
  })

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none'

  // Totals for FB posts
  const totalDMs    = fbPosts.reduce((s, p) => s + p.dms_received, 0)
  const totalLeads  = fbPosts.reduce((s, p) => s + p.leads_generated, 0)
  const totalComments = fbPosts.reduce((s, p) => s + p.comments_count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Conversations
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Every message, every lead, every touchpoint — tracked here
          </p>
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--surface2)' }}>
          {(['conversations', 'facebook'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize"
              style={activeTab === tab
                ? { background: '#5254CC', color: 'white' }
                : { color: 'var(--muted)' }
              }
            >
              {tab === 'facebook' ? '📘 Facebook' : '💬 Conversations'}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="card p-3 text-sm" style={{ borderLeft: '3px solid #f87171', color: '#f87171' }}>
          {err} <button className="underline ml-2" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      {/* ── CONVERSATIONS TAB ───────────────────────────── */}
      {activeTab === 'conversations' && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'People tracked', val: contacts.length, color: '#5254CC' },
              { label: 'Messages logged', val: logs.length,    color: '#60a5fa' },
              { label: 'Awaiting reply',  val: logs.filter(l => l.outcome === 'no-reply' && l.direction === 'sent').length, color: '#fbbf24' },
            ].map(({ label, val, color }) => (
              <div key={label} className="card p-4">
                <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</div>
                <div className="text-2xl font-bold" style={{ color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Log a message */}
          <Section title="LOG A MESSAGE OR PASTE A CONVERSATION">
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Contact Name *</label>
                  <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
                    placeholder="Karen Duroseau" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Channel</label>
                  <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} className={inputCls}>
                    {CHANNELS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Direction</label>
                  <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))} className={inputCls}>
                    {DIRECTIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>
                  Message / Conversation (paste here) *
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Paste the message or conversation here... You can paste the full thread. I'll read it and update the pipeline."
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Outcome</label>
                  <select value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} className={inputCls}>
                    {OUTCOMES.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Next Step</label>
                  <input value={form.next_step} onChange={e => setForm(f => ({ ...f, next_step: e.target.value }))}
                    placeholder="What happens next?" className={inputCls} />
                </div>
              </div>

              <button onClick={addLog} disabled={saving}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: '#5254CC' }}>
                {saving ? 'Logging…' : 'Log Conversation'}
              </button>
            </div>
          </Section>

          {/* Contact threads */}
          <Section title="ALL CONVERSATIONS" right={
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contact..."
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
            />
          }>
            {loading && <div className="py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading...</div>}
            {!loading && contacts.length === 0 && (
              <div className="py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
                No conversations logged yet. Paste your first message above.
              </div>
            )}
            <div className="space-y-2">
              {contacts.map(contact => {
                const thread = grouped[contact]
                const latest = thread[0]
                const { bg, text: tcol } = outcomeColor(latest.outcome)
                const isExpanded = expandedContact === contact
                const awaitingReply = thread.some(l => l.outcome === 'no-reply' && l.direction === 'sent')

                return (
                  <div key={contact} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                    {/* Contact header */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/3"
                      onClick={() => setExpandedContact(isExpanded ? null : contact)}
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: 'rgba(82,84,204,0.2)', color: '#5254CC' }}>
                        {contact.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{contact}</span>
                          {awaitingReply && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                              awaiting reply
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                          {channelIcon(latest.channel)} {latest.channel} · {latest.date} · {thread.length} message{thread.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                        style={{ background: bg, color: tcol }}>
                        {latest.outcome ?? '—'}
                      </span>
                      <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                    </button>

                    {/* Thread */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        {thread.map(l => (
                          <div key={l.id} className="mt-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs" style={{ color: 'var(--muted)' }}>{l.date}</span>
                              <span className="text-xs font-medium" style={{ color: l.direction === 'sent' ? '#5254CC' : '#4ade80' }}>
                                {l.direction === 'sent' ? '↑ You sent' : '↓ They replied'}
                              </span>
                              <span className="text-xs">{channelIcon(l.channel)}</span>
                              {l.outcome && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full"
                                  style={{ background: outcomeColor(l.outcome).bg, color: outcomeColor(l.outcome).text }}>
                                  {l.outcome}
                                </span>
                              )}
                              <button onClick={() => delLog(l.id)} className="ml-auto text-xs hover:underline" style={{ color: '#f87171' }}>del</button>
                            </div>
                            {l.content && (
                              <div className="text-sm rounded-xl px-3 py-2.5 whitespace-pre-wrap leading-relaxed"
                                style={{ background: l.direction === 'sent' ? 'rgba(82,84,204,0.1)' : 'rgba(255,255,255,0.04)', color: '#CBD5E1' }}>
                                {l.content}
                              </div>
                            )}
                            {l.next_step && (
                              <div className="mt-1.5 text-xs font-medium" style={{ color: '#fbbf24' }}>
                                → Next: {l.next_step}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>
        </>
      )}

      {/* ── FACEBOOK TAB ────────────────────────────────── */}
      {activeTab === 'facebook' && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Posts tracked', val: fbPosts.length, color: '#5254CC' },
              { label: 'Total comments', val: totalComments, color: '#60a5fa' },
              { label: 'DMs received',   val: totalDMs,      color: '#fbbf24' },
              { label: 'Leads from FB',  val: totalLeads,    color: '#4ade80' },
            ].map(({ label, val, color }) => (
              <div key={label} className="card p-4">
                <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</div>
                <div className="text-2xl font-bold" style={{ color, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Log a post */}
          <Section title="LOG A FACEBOOK POST">
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Date Posted</label>
                  <input type="date" value={fbForm.posted_date} onChange={e => setFbForm(f => ({ ...f, posted_date: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Post Type</label>
                  <select value={fbForm.post_type ?? 'content'} onChange={e => setFbForm(f => ({ ...f, post_type: e.target.value }))} className={inputCls}>
                    {['content', 'offer', 'story', 'case-study', 'question', 'tip'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'comments_count', label: 'Comments' },
                    { key: 'dms_received',   label: 'DMs' },
                    { key: 'leads_generated',label: 'Leads' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</label>
                      <input type="number" min="0"
                        value={(fbForm as any)[key]}
                        onChange={e => setFbForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                        className={inputCls} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Post Content / Summary *</label>
                <textarea value={fbForm.content ?? ''} onChange={e => setFbForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Paste your post or summarise what it was about..."
                  rows={3} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>Notes (who commented, what happened)</label>
                <input value={fbForm.notes ?? ''} onChange={e => setFbForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Karen DM'd after seeing this post" className={inputCls} />
              </div>
              <button onClick={addFbPost} disabled={savingFb}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: '#5254CC' }}>
                {savingFb ? 'Saving…' : 'Log Post'}
              </button>
            </div>
          </Section>

          {/* Posts list */}
          <Section title="FACEBOOK POSTS">
            {loading && <div className="py-4 text-center text-sm" style={{ color: 'var(--muted)' }}>Loading...</div>}
            {!loading && fbPosts.length === 0 && (
              <div className="py-4 text-center text-sm" style={{ color: 'var(--muted)' }}>No posts logged yet.</div>
            )}
            <div className="space-y-3">
              {fbPosts.map(p => (
                <div key={p.id} className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(82,84,204,0.2)', color: '#5254CC' }}>
                          {p.post_type}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{p.posted_date}</span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>
                        {p.content ?? 'No content logged'}
                      </p>
                      {p.notes && <p className="text-xs mt-2" style={{ color: '#fbbf24' }}>↳ {p.notes}</p>}
                    </div>
                    <div className="flex gap-3 flex-shrink-0 text-center">
                      {[
                        { val: p.comments_count, label: 'comments', color: '#60a5fa' },
                        { val: p.dms_received,   label: 'DMs',      color: '#fbbf24' },
                        { val: p.leads_generated,label: 'leads',    color: '#4ade80' },
                      ].map(({ val, label, color }) => (
                        <div key={label}>
                          <div className="text-lg font-bold" style={{ color: val > 0 ? color : 'var(--muted)' }}>{val}</div>
                          <div className="text-xs" style={{ color: 'var(--muted)' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => delFbPost(p.id)} className="text-xs mt-3 hover:underline" style={{ color: 'var(--muted)' }}>delete</button>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
