import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { Loader2, MessageSquare, RotateCw, Search, Send, Ticket as TicketIcon, Trash2, TriangleAlert } from "lucide-react"
import { cn } from "../lib/utils.js"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.jsx"
import { Input } from "../components/ui/input.jsx"
import { Label } from "../components/ui/label.jsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.jsx"
import { Separator } from "../components/ui/separator.jsx"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs.jsx"
import { Textarea } from "../components/ui/textarea.jsx"
import { EmptyState, ErrorState, LoadingRows, LoadingText, Page, PageHeader, StatusDot, SuccessNotice } from "../components/page.jsx"

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

const categoryLabels = {
  feature: "Feature suggestion",
  bug: "Bug report",
  service: "Service complaint",
  aiExperience: "AI experience rating",
  help: "Request for help",
  // Sent from the sign-in page by an account waiting to be deleted.
  accountRestore: "Account restore request",
}

const statusTone = {
  new: "primary",
  processing: "warning",
  completed: "success",
  rejected: "muted",
}

const statusBadge = {
  new: "secondary",
  processing: "warning",
  completed: "success",
  rejected: "outline",
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
      <p role="alert" className="mt-2 flex items-center gap-2 text-sm text-destructive">
        The image could not be loaded.
      </p>
    )
  }
  if (!url) return <LoadingText className="mt-2">Loading image…</LoadingText>
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex flex-col gap-2 rounded-md text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <img src={url} alt="Feedback attachment" className="max-h-72 max-w-full rounded-lg border object-contain" />
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

  // Gives back an account waiting to be deleted; its open restore requests are closed.
  const restoreAccount = async (item) => {
    setSaving(true)
    setNotice("")
    try {
      const response = await apiFetch(`/api/admin/users/${item.user_id}/restore`, { method: "PATCH" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.ok) throw new Error(data.message || "Failed to restore the account.")
      await loadFeedback()
      setNotice(`The account of ${item.user_name} was restored. They can sign in again.`)
    } catch (err) {
      setNotice(err.message || "Failed to restore the account.")
    } finally { setSaving(false) }
  }

  const formatDate = (value) => value ? formatWib(value) : "-"

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

  return (
    <Page>
      <PageHeader
        title="Tickets"
        description={
          loading
            ? "Loading tickets..."
            : items.length === 0
              ? "No tickets yet."
              : `${items.length} ${items.length === 1 ? "ticket" : "tickets"}, ${openCount} still open (${counts.new || 0} new, ${counts.processing || 0} in progress).`
        }
        actions={
          <Button variant="outline" onClick={loadFeedback} disabled={loading}>
            <RotateCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        }
      />

      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      {error && <ErrorState message={error} onRetry={loadFeedback} busy={loading} />}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.8fr)]">
        <Card className="min-w-0 gap-0 py-0">
          <div className="space-y-3 border-b p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                type="search"
                aria-label="Search tickets"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by subject, name, email or ID"
                className="pl-9"
              />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList aria-label="Filter by status" className="w-full justify-start">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="flex-none">
                    {tab.label} <span className="tabular-nums text-muted-foreground">{tab.count}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <LoadingRows rows={4} label="Loading tickets" className="p-4" />
          ) : filtered.length === 0 ? (
            <EmptyState icon={TicketIcon} title="No tickets found" className="m-4">
              {items.length === 0 ? "Tickets that people send appear here." : "Try another search or status."}
            </EmptyState>
          ) : (
            <ul className="space-y-1 p-2">
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
                    className={cn(
                      "block w-full rounded-md px-3 py-3 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      selected?.id === item.id ? "bg-accent" : "hover:bg-accent/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.subject || "(No subject)"}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.user_name} · {item.user_email}
                        </p>
                      </div>
                      <Badge variant={statusBadge[item.status] || "outline"} className="shrink-0">
                        <StatusDot tone={statusTone[item.status] || "muted"} />
                        {statusLabel(item.status)}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {[
                        categoryLabels[item.category] || item.category,
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
        </Card>

        <aside className="min-w-0 xl:sticky xl:top-20" aria-label="Ticket details">
          {!selected ? (
            <EmptyState icon={MessageSquare} title="No ticket selected" className="min-h-72 justify-center bg-card">
              Select a ticket to read it and reply.
            </EmptyState>
          ) : (
            <Card>
              <CardHeader>
                <CardDescription>Ticket #{selected.id}</CardDescription>
                <CardTitle className="text-lg">{selected.subject || "(No subject)"}</CardTitle>
                <CardAction>
                  <Select value={selected.status} onValueChange={(value) => updateStatus(selected, value)} disabled={saving}>
                    <SelectTrigger aria-label="Ticket status" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-6">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-muted-foreground">From</dt>
                  <dd className="min-w-0 truncate text-right">{selected.user_name} · {selected.user_email}</dd>
                  <dt className="text-muted-foreground">Related page</dt>
                  <dd className="text-right">{selected.related_page || "–"}</dd>
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="text-right">{categoryLabels[selected.category] || selected.category}</dd>
                  <dt className="text-muted-foreground">Sent</dt>
                  <dd className="text-right">{formatDate(selected.created_at)}</dd>
                </dl>

                {selected.user_deletes_at && (
                  <div className="space-y-3 rounded-lg bg-amber-500/10 p-4">
                    <p className="flex gap-2 text-sm">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">This account is being deleted.</span>{" "}
                        It will be removed for good on {formatDate(selected.user_deletes_at)}. An account can be restored only once.
                      </span>
                    </p>
                    <Button size="sm" disabled={saving} onClick={() => restoreAccount(selected)}>
                      {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
                      {saving ? "Restoring..." : "Restore account"}
                    </Button>
                  </div>
                )}

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
                          <p className="mt-2 text-xs text-muted-foreground">{formatDate(entry.created_at)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <form onSubmit={sendReply} className="space-y-3">
                  <Label htmlFor="feedback-reply">Write a reply</Label>
                  <Textarea
                    id="feedback-reply"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={5000}
                    rows={5}
                    placeholder="Type your response to the user"
                  />
                  <Button type="submit" className="w-full" disabled={saving || !reply.trim()}>
                    {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                    {saving ? "Sending..." : "Send reply"}
                  </Button>
                </form>

                <Separator />
                <div>
                  {selected.status === "completed" || selected.status === "rejected" ? (
                    confirmDelete ? (
                      <div role="alertdialog" aria-label="Confirm delete" className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                        <p>
                          Delete ticket #{selected.id} permanently? Its replies and attached image are deleted too,
                          and the user no longer sees it.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="destructive" size="sm" disabled={saving} onClick={() => deleteTicket(selected)}>
                            {saving ? "Deleting..." : "Yes, delete"}
                          </Button>
                          <Button variant="outline" size="sm" disabled={saving} onClick={() => setConfirmDelete(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={saving} onClick={() => setConfirmDelete(true)}>
                        <Trash2 aria-hidden="true" />
                        Delete ticket
                      </Button>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">Tickets can be deleted once they are completed or rejected.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </Page>
  )
}

export default Ticket
