import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "../lib/api"

const statusOptions = [
  { value: "new", label: "New" },
  { value: "processing", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
]

const ratingReasonLabels = {
  admin_ramah: "Admin ramah",
  pengerjaan_cepat: "Pengerjaan cepat",
  solusi_tepat: "Solusi tepat",
  komunikasi_jelas: "Komunikasi jelas",
  responsif: "Responsif",
  masalah_terselesaikan: "Masalah terselesaikan",
}

const statusDot = {
  new: "bg-foreground",
  processing: "bg-amber-500",
  completed: "bg-green-600",
  rejected: "bg-muted-foreground",
}

// The ticket's screenshot. It is only served to signed-in admins, so it is fetched
// with the admin's login and shown from memory instead of from a public address.
// The caller keys it by ticket, so each ticket starts from a fresh state.
function AttachmentImage({ feedbackId }) {
  const [url, setUrl] = useState("")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let objectUrl = ""
    let cancelled = false
    apiFetch(`/api/admin/feedback/${feedbackId}/attachment`)
      .then((response) => {
        if (!response.ok) throw new Error(`Attachment request failed with status ${response.status}`)
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [feedbackId])

  if (failed) {
    return (
      <p role="alert" className="mt-2 text-sm text-destructive">
        The image could not be loaded.
      </p>
    )
  }
  if (!url) return <p className="mt-2 text-sm text-muted-foreground">Loading image…</p>
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex flex-col gap-2 text-sm underline-offset-4 hover:underline"
    >
      <img src={url} alt="Feedback attachment" className="max-h-72 max-w-full rounded-lg object-contain" />
      Open image in a new tab
    </a>
  )
}

function Ticket() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState(null)
  const [reply, setReply] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)

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
      setNotice("Ticket status updated.")
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

  const deleteTicket = async (item) => {
    setSaving(true)
    setNotice("")
    try {
      const response = await apiFetch(`/api/admin/feedback/${item.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.message || "Failed to delete ticket.")
      setConfirmDelete(false)
      setSelected(null)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      setNotice(`Ticket #${item.id} deleted.`)
    } catch (err) {
      setNotice(err.message || "Failed to delete ticket.")
    } finally { setSaving(false) }
  }

  const formatDate = (value) => value ? new Date(value).toLocaleString("id-ID") : "-"

  const statusLabel = (value) =>
    statusOptions.find((option) => option.value === value)?.label || value

  const counts = items.reduce((result, item) => {
    result[item.status] = (result[item.status] || 0) + 1
    return result
  }, {})

  const openCount = (counts.new || 0) + (counts.processing || 0)

  const tabs = [{ value: "all", label: "All" }, ...statusOptions].map((tab) => ({
    ...tab,
    count: tab.value === "all" ? items.length : counts[tab.value] || 0,
  }))

  const controlClass =
    "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? "Loading tickets..."
            : items.length === 0
              ? "No tickets yet."
              : `${items.length} ${items.length === 1 ? "ticket" : "tickets"}, ${openCount} still open (${counts.new || 0} new, ${counts.processing || 0} in progress).`}
        </p>
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-muted px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]">
        <section className="min-w-0 rounded-xl bg-card text-card-foreground">
          <div className="space-y-3 p-4">
            <input
              type="search"
              aria-label="Search tickets"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject, name, email or ID"
              className={`${controlClass} w-full`}
            />
            <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`h-8 rounded-lg px-3 text-sm transition-colors ${
                    filter === tab.value
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {tab.label} <span className="tabular-nums text-muted-foreground">{tab.count}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="px-4 pb-10 pt-6 text-center text-sm text-muted-foreground">Loading tickets...</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 pb-10 pt-6 text-center text-sm text-muted-foreground">No tickets found.</p>
          ) : (
            <ul className="px-2 pb-2">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={selected?.id === item.id}
                    onClick={() => {
                      setSelected(item)
                      setNotice("")
                      setConfirmDelete(false)
                    }}
                    className={`block w-full rounded-lg px-3 py-3 text-left transition-colors ${
                      selected?.id === item.id ? "bg-muted" : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.subject || "(No subject)"}</p>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {item.user_name} · {item.user_email}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm">
                        <span aria-hidden="true" className={`size-2 rounded-full ${statusDot[item.status] || statusDot.new}`} />
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {[
                        item.category,
                        formatDate(item.created_at),
                        `${(item.replies || []).length} ${(item.replies || []).length === 1 ? "reply" : "replies"}`,
                        item.rating > 0 ? `Rated ${item.rating}/5` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="min-w-0 xl:sticky xl:top-6" aria-label="Ticket details">
          {!selected ? (
            <div className="flex min-h-72 items-center justify-center rounded-xl bg-card p-8 text-center text-sm text-muted-foreground">
              Select a ticket to read it and reply.
            </div>
          ) : (
            <div className="space-y-6 rounded-xl bg-card p-5 text-card-foreground">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Ticket #{selected.id}</p>
                  <h2 className="mt-1 text-lg font-semibold">{selected.subject || "(No subject)"}</h2>
                </div>
                <select
                  aria-label="Ticket status"
                  disabled={saving}
                  value={selected.status}
                  onChange={(e) => updateStatus(selected, e.target.value)}
                  className={controlClass}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">From</dt>
                <dd className="min-w-0 truncate text-right">{selected.user_name} · {selected.user_email}</dd>
                <dt className="text-muted-foreground">Related page</dt>
                <dd className="text-right">{selected.related_page || "–"}</dd>
                <dt className="text-muted-foreground">Sent</dt>
                <dd className="text-right">{formatDate(selected.created_at)}</dd>
              </dl>

              <div>
                <h3 className="text-sm font-semibold">Description</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.description}</p>
              </div>

              {selected.attachment && (
                <div>
                  <h3 className="text-sm font-semibold">Attachment</h3>
                  {selected.attachment.startsWith("/uploads/feedback/") ? (
                    <AttachmentImage key={selected.id} feedbackId={selected.id} />
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Attachment filename only (legacy report): {selected.attachment}
                    </p>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-semibold">User rating</h3>
                  {selected.rating > 0 ? (
                    <span className="text-sm font-medium tabular-nums" aria-label={`${selected.rating} out of 5`}>
                      {selected.rating} / 5
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not rated yet</span>
                  )}
                </div>
                {selected.rating > 0 ? (
                  <div className="mt-2 space-y-2 text-sm">
                    {Array.isArray(selected.rating_reasons) && selected.rating_reasons.length > 0 && (
                      <p>
                        <span className="text-muted-foreground">Reasons: </span>
                        {selected.rating_reasons.map((reason) => ratingReasonLabels[reason] || reason).join(" · ")}
                      </p>
                    )}
                    {selected.rating_comment && <p className="whitespace-pre-wrap">{selected.rating_comment}</p>}
                    {!selected.rating_reasons?.length && !selected.rating_comment && (
                      <p className="text-muted-foreground">The user rated without adding a reason.</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    The rating and its reasons show up here once the user rates a finished ticket.
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold">Conversation</h3>
                <div className="mt-3 space-y-2">
                  {(selected.replies || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No replies yet.</p>
                  ) : (
                    selected.replies.map((entry) => (
                      <div key={entry.id} className="rounded-lg bg-muted p-3 text-sm">
                        <p className="whitespace-pre-wrap">{entry.message}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{formatDate(entry.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <form onSubmit={sendReply} className="space-y-3">
                <label className="block text-sm font-semibold" htmlFor="feedback-reply">Write a reply</label>
                <textarea
                  id="feedback-reply"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={5000}
                  rows={5}
                  placeholder="Type your response to the user"
                  className="w-full rounded-lg border border-input bg-background p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  disabled={saving || !reply.trim()}
                  className="h-9 w-full rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Sending..." : "Send reply"}
                </button>
              </form>

              <div>
                {selected.status === "completed" || selected.status === "rejected" ? (
                  confirmDelete ? (
                    <div role="alertdialog" aria-label="Confirm delete" className="space-y-3 rounded-lg bg-destructive/10 p-3 text-sm">
                      <p>
                        Delete ticket #{selected.id} permanently? Its replies and attached image are deleted too,
                        and the user no longer sees it.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => deleteTicket(selected)}
                          className="h-9 rounded-lg bg-destructive px-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {saving ? "Deleting..." : "Yes, delete"}
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setConfirmDelete(false)}
                          className="h-9 rounded-lg border border-input bg-card px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setConfirmDelete(true)}
                      className="text-sm font-medium text-destructive underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Delete ticket
                    </button>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">Tickets can be deleted once they are completed or rejected.</p>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default Ticket
