import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "../lib/api"

const statusOptions = [
  { value: "new", label: "New" },
  { value: "processing", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
]

const statusClass = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  processing: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
}

function Feedback() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")

  const loadFeedback = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await apiFetch("/api/admin/feedback")
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.message || "Failed to load feedback.")
      setItems(Array.isArray(data.feedback) ? data.feedback : [])
      setSelected((current) => current ? (data.feedback || []).find((item) => item.id === current.id) || null : null)
    } catch (err) {
      setError(err.message || "Failed to load feedback.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFeedback() }, [])

  const filtered = useMemo(() => items.filter((item) => {
    const q = search.toLowerCase().trim()
    const matches = !q || [item.subject, item.description, item.user_name, item.user_email, item.id].some((value) => String(value || "").toLowerCase().includes(q))
    return matches && (filter === "all" || item.status === filter)
  }), [items, search, filter])

  const updateStatus = async (item, status) => {
    setSaving(true)
    setNotice("")
    try {
      const response = await apiFetch(`/api/admin/feedback/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.message || "Failed to update status.")
      await loadFeedback()
      setNotice("Feedback status updated.")
    } catch (err) {
      setNotice(err.message || "Failed to update status.")
    } finally { setSaving(false) }
  }

  const sendReply = async (event) => {
    event.preventDefault()
    if (!selected || !reply.trim()) return
    setSaving(true)
    setNotice("")
    try {
      const response = await apiFetch(`/api/admin/feedback/${selected.id}/replies`, { method: "POST", body: JSON.stringify({ message: reply.trim() }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.message || "Failed to send reply.")
      setReply("")
      await loadFeedback()
      setNotice("Reply sent successfully.")
    } catch (err) {
      setNotice(err.message || "Failed to send reply.")
    } finally { setSaving(false) }
  }

  const formatDate = (value) => value ? new Date(value).toLocaleString("id-ID") : "-"

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-500">Support center</p><h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">User Feedback</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review user reports and respond to feedback.</p></div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"><span className="text-slate-500">Total feedback</span><p className="text-2xl font-semibold">{items.length}</p></div>
      </div>

      {notice && <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">{notice}</div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search feedback..." className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900" />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="all">All statuses</option>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading feedback...</p> : filtered.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No feedback found.</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((item) => <button key={item.id} type="button" onClick={() => { setSelected(item); setNotice(""); }} className={`block w-full p-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${selected?.id === item.id ? "bg-indigo-50/70 dark:bg-indigo-950/20" : ""}`}>
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.subject || "(No subject)"}</p><p className="mt-1 truncate text-xs text-slate-500">{item.user_name} · {item.user_email}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass[item.status] || statusClass.new}`}>{item.status}</span></div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500"><span>{item.category}</span><span>·</span><span>{formatDate(item.created_at)}</span><span>·</span><span>{(item.replies || []).length} replies</span></div>
              </button>)}
            </div>}
          </div>
        </div>

        <div className="min-w-0">
          {!selected ? <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Select a feedback report to view details and reply.</div> : <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-slate-500">Feedback #{selected.id}</p><h2 className="mt-1 text-lg font-semibold">{selected.subject || "(No subject)"}</h2></div><select disabled={saving} value={selected.status} onChange={(e) => updateStatus(selected,e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-950">{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800/60"><div><p className="text-slate-500">From</p><p className="mt-1 font-medium">{selected.user_name}</p><p className="text-slate-500">{selected.user_email}</p></div><div><p className="text-slate-500">Related page</p><p className="mt-1 font-medium">{selected.related_page}</p><p className="mt-1 text-slate-500">{formatDate(selected.created_at)}</p></div></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.description}</p></div>
            {selected.attachment && <p className="text-xs text-slate-500">Attachment filename: {selected.attachment}</p>}
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800"><h3 className="text-sm font-semibold">Conversation</h3><div className="mt-3 space-y-3">{(selected.replies || []).length === 0 ? <p className="text-xs text-slate-500">No replies yet.</p> : selected.replies.map((entry) => <div key={entry.id} className="rounded-lg bg-indigo-50 p-3 text-sm dark:bg-indigo-950/30"><p className="whitespace-pre-wrap">{entry.message}</p><p className="mt-2 text-[11px] text-slate-500">{formatDate(entry.created_at)}</p></div>)}</div></div>
            <form onSubmit={sendReply} className="space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800"><label className="block text-sm font-semibold" htmlFor="feedback-reply">Write a reply</label><textarea id="feedback-reply" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} rows={5} placeholder="Type your response to the user..." className="w-full rounded-lg border border-slate-200 bg-white p-3 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" /><button disabled={saving || !reply.trim()} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Sending..." : "Send reply"}</button></form>
          </div>}
        </div>
      </div>
    </section>
  )
}

export default Feedback
