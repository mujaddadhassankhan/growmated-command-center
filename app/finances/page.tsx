'use client'

import { useCallback, useEffect, useState } from 'react'
import Section from '@/components/Section'
import { requireSupabase } from '@/lib/supabase'

const EXPENSE_CATEGORIES = ['Software/Tools', 'Freelancer Help', 'Marketing', 'Misc']
const INCOME_STATUSES = ['Paid', 'Outstanding']

type Income = {
  id: string
  date: string
  client: string | null
  invoice_number: string | null
  description: string | null
  amount: number
  status: string | null
}

type Expense = {
  id: string
  date: string
  category: string | null
  description: string | null
  amount: number
  notes: string | null
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function startOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function endOfMonth() {
  const d = new Date()
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return last.toISOString().slice(0, 10)
}

export default function FinancesPage() {
  const [income, setIncome] = useState<Income[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [incForm, setIncForm] = useState({
    date: todayStr(), client: '', invoice_number: '', description: '', amount: '', status: 'Paid',
  })
  const [expForm, setExpForm] = useState({
    date: todayStr(), category: 'Software/Tools', description: '', amount: '', notes: '',
  })
  const [savingInc, setSavingInc] = useState(false)
  const [savingExp, setSavingExp] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = requireSupabase()
      const [incRes, expRes] = await Promise.all([
        sb.from('income').select('*').order('date', { ascending: false }).limit(100),
        sb.from('expenses').select('*').order('date', { ascending: false }).limit(100),
      ])
      if (incRes.error) throw incRes.error
      if (expRes.error) throw expRes.error
      setIncome((incRes.data ?? []) as Income[])
      setExpenses((expRes.data ?? []) as Expense[])
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function addIncome() {
    if (!incForm.amount || !incForm.date) return
    setSavingInc(true)
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('income').insert({
        date: incForm.date,
        client: incForm.client || null,
        invoice_number: incForm.invoice_number || null,
        description: incForm.description || null,
        amount: Number(incForm.amount),
        status: incForm.status,
      })
      if (error) throw error
      setIncForm({ date: todayStr(), client: '', invoice_number: '', description: '', amount: '', status: 'Paid' })
      await load()
    } catch (e: any) { setErr(e.message) } finally { setSavingInc(false) }
  }

  async function addExpense() {
    if (!expForm.amount || !expForm.date) return
    setSavingExp(true)
    try {
      const sb = requireSupabase()
      const { error } = await sb.from('expenses').insert({
        date: expForm.date,
        category: expForm.category,
        description: expForm.description || null,
        amount: Number(expForm.amount),
        notes: expForm.notes || null,
      })
      if (error) throw error
      setExpForm({ date: todayStr(), category: 'Software/Tools', description: '', amount: '', notes: '' })
      await load()
    } catch (e: any) { setErr(e.message) } finally { setSavingExp(false) }
  }

  async function delIncome(id: string) {
    if (!confirm('Delete this entry?')) return
    try {
      const sb = requireSupabase()
      await sb.from('income').delete().eq('id', id)
      setIncome(prev => prev.filter(i => i.id !== id))
    } catch (e: any) { setErr(e.message) }
  }

  async function delExpense(id: string) {
    if (!confirm('Delete this expense?')) return
    try {
      const sb = requireSupabase()
      await sb.from('expenses').delete().eq('id', id)
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (e: any) { setErr(e.message) }
  }

  const sm = startOfMonth()
  const em = endOfMonth()
  const monthInc = income.filter(i => i.date >= sm && i.date <= em)
  const monthExp = expenses.filter(e => e.date >= sm && e.date <= em)
  const invoiced = monthInc.reduce((s, i) => s + Number(i.amount), 0)
  const received = monthInc.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.amount), 0)
  const outstanding = monthInc.filter(i => i.status === 'Outstanding').reduce((s, i) => s + Number(i.amount), 0)
  const totalExp = monthExp.reduce((s, e) => s + Number(e.amount), 0)
  const net = received - totalExp

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Finances</h1>
        <p className="text-sm text-gray-600">Income, expenses, and monthly summary</p>
      </div>

      {err && (
        <div className="card p-3 bg-red-50 border-red-200 text-red-800 text-sm">
          {err} <button className="underline ml-2" onClick={() => setErr(null)}>Dismiss</button>
        </div>
      )}

      {/* Monthly summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Invoiced', value: invoiced, color: 'text-gray-900' },
          { label: 'Received', value: received, color: 'text-green-700' },
          { label: 'Outstanding', value: outstanding, color: 'text-amber-700' },
          { label: 'Expenses', value: totalExp, color: 'text-red-700' },
          { label: 'Net Profit', value: net, color: net >= 0 ? 'text-green-700' : 'text-red-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <div className="text-xs text-gray-500 mb-1">{label} (this month)</div>
            <div className={`text-xl font-semibold ${color}`}>${Number(value).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Income */}
      <Section title="INCOME">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-5 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" value={incForm.date} onChange={e => setIncForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Client</label>
            <input value={incForm.client} onChange={e => setIncForm(f => ({ ...f, client: e.target.value }))} placeholder="Client"
              className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Invoice #</label>
            <input value={incForm.invoice_number} onChange={e => setIncForm(f => ({ ...f, invoice_number: e.target.value }))} placeholder="INV-001"
              className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input value={incForm.description} onChange={e => setIncForm(f => ({ ...f, description: e.target.value }))} placeholder="What for?"
              className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount (USD) *</label>
            <input type="number" value={incForm.amount} onChange={e => setIncForm(f => ({ ...f, amount: e.target.value }))} placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <div className="flex gap-1">
              <select value={incForm.status} onChange={e => setIncForm(f => ({ ...f, status: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30">
                {INCOME_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <button onClick={addIncome} disabled={savingInc}
                className="px-3 py-1.5 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 disabled:opacity-50">
                +
              </button>
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2 pr-3">Client</th>
              <th className="pb-2 pr-3">Invoice</th>
              <th className="pb-2 pr-3">Description</th>
              <th className="pb-2 pr-3 text-right">Amount</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="py-4 text-center text-gray-400 text-sm">Loading...</td></tr>}
            {!loading && income.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-gray-400 text-sm">No income logged yet.</td></tr>}
            {income.map(i => (
              <tr key={i.id} className="border-t border-gray-100">
                <td className="py-2 pr-3">{i.date}</td>
                <td className="py-2 pr-3">{i.client ?? ''}</td>
                <td className="py-2 pr-3 text-xs text-gray-500">{i.invoice_number ?? ''}</td>
                <td className="py-2 pr-3 text-gray-600">{i.description ?? ''}</td>
                <td className="py-2 pr-3 text-right font-medium">${Number(i.amount).toLocaleString()}</td>
                <td className="py-2 pr-3">
                  <span className={i.status === 'Paid' ? 'badge badge-green' : 'badge badge-yellow'}>{i.status}</span>
                </td>
                <td className="py-2">
                  <button onClick={() => delIncome(i.id)} className="text-red-500 text-xs hover:underline">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Expenses */}
      <Section title="EXPENSES">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30">
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Description</label>
            <input value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))} placeholder="What for?"
              className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount (USD) *</label>
            <input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <div className="flex gap-1">
              <input value={expForm.notes} onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional"
                className="flex-1 border border-gray-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-navy/30" />
              <button onClick={addExpense} disabled={savingExp}
                className="px-3 py-1.5 rounded-xl bg-navy text-white text-sm font-medium hover:bg-navy/90 disabled:opacity-50">
                +
              </button>
            </div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2 pr-3">Category</th>
              <th className="pb-2 pr-3">Description</th>
              <th className="pb-2 pr-3 text-right">Amount</th>
              <th className="pb-2 pr-3">Notes</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="py-4 text-center text-gray-400 text-sm">Loading...</td></tr>}
            {!loading && expenses.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-gray-400 text-sm">No expenses logged yet.</td></tr>}
            {expenses.map(e => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="py-2 pr-3">{e.date}</td>
                <td className="py-2 pr-3">
                  <span className="badge bg-gray-100 text-gray-700">{e.category}</span>
                </td>
                <td className="py-2 pr-3 text-gray-600">{e.description ?? ''}</td>
                <td className="py-2 pr-3 text-right font-medium text-red-700">${Number(e.amount).toLocaleString()}</td>
                <td className="py-2 pr-3 text-gray-500 text-xs">{e.notes ?? ''}</td>
                <td className="py-2">
                  <button onClick={() => delExpense(e.id)} className="text-red-500 text-xs hover:underline">Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  )
}
