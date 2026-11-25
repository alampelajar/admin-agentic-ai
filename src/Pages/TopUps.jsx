import { useCallback, useEffect, useState } from "react"

import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { Button } from "../components/ui/button.jsx"
import { Input } from "../components/ui/input.jsx"
import { useConfirm } from "../components/ui/confirm-dialog.jsx"

const chip = "inline-flex h-8 items-center gap-2 rounded-chip px-3 text-sm font-medium"
const success = "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
const warning = "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
const danger = "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
const fieldLabel = "mb-1 block text-sm font-medium text-foreground"

const STATUS = {
  pending: { label: "Waiting", className: warning },
  approved: { label: "Approved", className: success },
  rejected: { label: "Rejected", className: danger },
}

const FILTERS = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
]

async function readJson(path, options) {
  const response = await apiFetch(path, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Request failed.")
  }
  return data
}

const jsonBody = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
})

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0)

// The proof is not public: it is fetched with the admin's sign-in and shown from memory.
function ProofDialog({ request, onClose }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let current = true
    let objectUrl = null
    apiFetch(`/api/admin/topups/${request.id}/proof`)
      .then((response) => {
        if (!response.ok) throw new Error("proof")
        return response.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (current) setUrl(objectUrl)
      })
      .catch(() => current && setFailed(true))
    return () => {
      current = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [request.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center m3-scrim p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proof-title"
        className="flex max-h-full w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-dialog bg-surface-high p-6 text-card-foreground shadow-m3-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="proof-title" className="text-2xl font-normal">Proof of payment</h2>
            <p className="text-sm text-muted-foreground">
              Top up #{request.id}: {request.credits} credits, {rupiah(request.price)}
            </p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="size-10 shrink-0 state-layer rounded-full text-xl leading-none text-muted-foreground">
            ×
          </button>
        </div>
        {failed ? (
          <p role="alert" className="text-sm text-destructive">The screenshot could not be opened.</p>
        ) : url ? (
          <img src={url} alt={`Proof of payment for top up #${request.id}`} className="max-h-96 w-full rounded-field border border-border object-contain" />
        ) : (
          <p className="text-sm text-muted-foreground">Opening the screenshot...</p>
        )}
      </div>
    </div>
  )
}

export default function TopUps() {
  const [askToConfirm, confirmDialog] = useConfirm()
  const [filter, setFilter] = useState("pending")
  const [requests, setRequests] = useState([])
  const [pending, setPending] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busyId, setBusyId] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [rejectNote, setRejectNote] = useState("")
  const [settings, setSettings] = useState({ enabled: false, price_per_credit: 0, packages: "", payment_info: "" })
  const [available, setAvailable] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [usage, setUsage] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [list, current, months] = await Promise.all([
        readJson(`/api/admin/topups?status=${filter}`),
        readJson("/api/admin/topup-settings"),
        readJson("/api/admin/usage"),
      ])
      setUsage(months.months || [])
      setRequests(list.requests || [])
      setPending(list.pending || 0)
      setSettings(current.settings)
      setAvailable(Boolean(current.available))
    } catch (err) {
      setError(err.message || "Top-ups could not be loaded.")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const approve = async (item) => {
    const confirmed = await askToConfirm({
      title: `Add ${item.request.credits} credits to ${item.name || item.email}?`,
      description: `Approve only after you saw ${rupiah(item.request.price)} arrive. The credits are added at once and cannot be approved twice.`,
      confirmLabel: "Approve",
      destructive: false,
    })
    if (!confirmed) return
    setBusyId(item.request.id)
    setError("")
    try {
      await readJson(`/api/admin/topups/${item.request.id}`, jsonBody("PATCH", { action: "approve" }))
      setNotice(`${item.request.credits} credits added to ${item.name || item.email}.`)
      await load()
    } catch (err) {
      setError(err.message || "The top-up could not be approved.")
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (event) => {
    event.preventDefault()
    if (!rejectNote.trim()) {
      setError("Write the reason; the person reads it.")
      return
    }
    setBusyId(rejecting.request.id)
    setError("")
    try {
      await readJson(`/api/admin/topups/${rejecting.request.id}`, jsonBody("PATCH", { action: "reject", note: rejectNote.trim() }))
      setNotice(`Top up #${rejecting.request.id} rejected.`)
      setRejecting(null)
      await load()
    } catch (err) {
      setError(err.message || "The top-up could not be rejected.")
    } finally {
      setBusyId(null)
    }
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    setSavingSettings(true)
    setError("")
    try {
      const saved = await readJson(
        "/api/admin/topup-settings",
        jsonBody("PUT", { ...settings, price_per_credit: Number(settings.price_per_credit) || 0 })
      )
      setSettings(saved.settings)
      setAvailable(Boolean(saved.available))
      setNotice(saved.available ? "Saved. People can top up now." : "Saved. Top-up stays unavailable until it is on and every field is filled.")
    } catch (err) {
      setError(err.message || "The settings could not be saved.")
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      {confirmDialog}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-normal text-foreground">Top-ups</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            People pay by hand and send a screenshot. Check that the money arrived, then approve: the credits are added.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {notice && (
        <p role="status" className={`mb-4 rounded-field px-4 py-3 text-sm ${success}`}>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-field bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      )}

      <section className="mb-6 rounded-card border border-border bg-card p-5" aria-labelledby="requests-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="requests-title" className="text-base font-semibold">
            Requests <span className="text-muted-foreground">({pending} waiting)</span>
          </h2>
          <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={`h-8 rounded-chip border px-3 text-sm transition-colors ${filter === item.key ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-accent"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading && requests.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="rounded-card border border-dashed border-border p-8 text-center">
            <p className="font-medium">No requests here</p>
            <p className="mt-1 text-sm text-muted-foreground">New requests appear when someone sends a proof of payment.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {requests.map((item) => {
              const status = STATUS[item.request.status] || STATUS.pending
              return (
                <li key={item.request.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">
                      #{item.request.id} · {item.request.credits} credits · {rupiah(item.request.price)}
                      {item.request.discount_percent > 0 && (
                        <span className="text-muted-foreground"> ({item.request.discount_percent}% new-account discount)</span>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {item.name || "-"} · {item.email || "deleted account"} · now {item.credits_now} credits
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sent {formatWib(item.request.created_at)}
                      {item.request.reviewed_at ? ` · checked ${formatWib(item.request.reviewed_at)}` : ""}
                      {item.request.admin_note ? ` · ${item.request.admin_note}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${chip} ${status.className}`}>{status.label}</span>
                    <Button variant="outline" onClick={() => setViewing(item.request)}>
                      See proof
                    </Button>
                    {item.request.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          disabled={busyId === item.request.id}
                          onClick={() => {
                            setRejecting(item)
                            setRejectNote("")
                          }}
                        >
                          Reject
                        </Button>
                        <Button disabled={busyId === item.request.id} onClick={() => approve(item)}>
                          {busyId === item.request.id ? "Saving..." : "Approve"}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <form onSubmit={saveSettings} className="rounded-card border border-border bg-card p-5" aria-labelledby="settings-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="settings-title" className="text-base font-semibold">How people pay</h2>
          <span className={`${chip} ${available ? success : warning}`}>{available ? "Open for top-up" : "Not available"}</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })}
              className="size-4"
            />
            Offer top-up to people
          </label>
          <div>
            <label htmlFor="price-per-credit" className={fieldLabel}>Price per credit (Rupiah)</label>
            <Input
              id="price-per-credit"
              type="number"
              min="0"
              step="1"
              value={settings.price_per_credit}
              onChange={(event) => setSettings({ ...settings, price_per_credit: event.target.value })}
            />
          </div>
          <div>
            <label htmlFor="packages" className={fieldLabel}>Packages (credits, comma separated)</label>
            <Input
              id="packages"
              value={settings.packages}
              placeholder="10, 25, 50"
              onChange={(event) => setSettings({ ...settings, packages: event.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="payment-info" className={fieldLabel}>Where to pay (one per line)</label>
            <textarea
              id="payment-info"
              rows={4}
              maxLength={2000}
              value={settings.payment_info}
              placeholder={"Bank name, account number, account holder\nE-wallet, number, name"}
              onChange={(event) => setSettings({ ...settings, payment_info: event.target.value })}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/60"
            />
            <p className="mt-1 text-xs text-muted-foreground">People see this exactly as written, with the amount to pay.</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>

      <section className="mt-6 rounded-card border border-border bg-card p-5" aria-labelledby="usage-title">
        <h2 id="usage-title" className="text-base font-semibold">Usage per month</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          To see what one credit costs: divide the AI provider's bill for a month by its credits used.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-180 text-left text-sm">
            <thead>
              <tr className="text-muted-foreground">
                {["Month", "AI tokens", "Websites", "Changes", "Credits used", "Credits sold", "Money in", "New accounts", "No promo"].map((label) => (
                  <th key={label} className="whitespace-nowrap px-3 py-2 font-normal">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usage.map((month) => (
                <tr key={month.month} className="border-t border-border tabular-nums">
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{month.month}</td>
                  <td className="px-3 py-2">{month.tokens.toLocaleString("id-ID")}</td>
                  <td className="px-3 py-2">{month.websites}</td>
                  <td className="px-3 py-2">{month.changes}</td>
                  <td className="px-3 py-2">{month.credits_used}</td>
                  <td className="px-3 py-2">{month.credits_bought}</td>
                  <td className="px-3 py-2">{rupiah(month.revenue)}</td>
                  <td className="px-3 py-2">{month.new_accounts}</td>
                  <td className="px-3 py-2">{month.no_promo}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {usage.length === 0 && !loading && (
            <p className="py-6 text-center text-sm text-muted-foreground">No usage yet.</p>
          )}
        </div>
      </section>

      {viewing && <ProofDialog request={viewing} onClose={() => setViewing(null)} />}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center m3-scrim p-4" onClick={() => setRejecting(null)}>
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
            onSubmit={reject}
            className="w-full max-w-md rounded-dialog bg-surface-high p-6 text-card-foreground shadow-m3-3"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="reject-title" className="text-2xl font-normal">Reject top up #{rejecting.request.id}?</h2>
            <p className="mt-1 text-sm text-muted-foreground">No credits are added. The person reads your reason.</p>
            <label htmlFor="reject-note" className={`${fieldLabel} mt-4`}>Reason</label>
            <Input
              id="reject-note"
              autoFocus
              maxLength={300}
              value={rejectNote}
              placeholder="The amount does not match"
              onChange={(event) => setRejectNote(event.target.value)}
            />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejecting(null)}>Cancel</Button>
              <Button type="submit" disabled={busyId === rejecting.request.id}>
                {busyId === rejecting.request.id ? "Saving..." : "Reject"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
