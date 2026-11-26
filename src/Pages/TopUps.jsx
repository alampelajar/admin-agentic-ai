import { useCallback, useEffect, useState } from "react"
import { ImageOff, Loader2, RotateCw, Wallet } from "lucide-react"

import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card.jsx"
import { Checkbox } from "../components/ui/checkbox.jsx"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog.jsx"
import { Input } from "../components/ui/input.jsx"
import { Label } from "../components/ui/label.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"
import { Textarea } from "../components/ui/textarea.jsx"
import { useConfirm } from "../components/ui/confirm-dialog.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, SuccessNotice } from "../components/page.jsx"

const STATUS = {
  pending: { label: "Waiting", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Proof of payment</DialogTitle>
          <DialogDescription>
            Top up #{request.id}: {request.credits} credits, {rupiah(request.price)}
          </DialogDescription>
        </DialogHeader>
        {failed ? (
          <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <ImageOff className="size-4" aria-hidden="true" />
            The screenshot could not be opened.
          </p>
        ) : url ? (
          <img src={url} alt={`Proof of payment for top up #${request.id}`} className="max-h-96 w-full rounded-md border object-contain" />
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Opening the screenshot...
          </p>
        )}
      </DialogContent>
    </Dialog>
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
    <Page>
      {confirmDialog}
      <PageHeader
        title="Top-ups"
        description="People pay by hand and send a screenshot. Check that the money arrived, then approve: the credits are added."
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RotateCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        }
      />

      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      {error && <ErrorState message={error} onRetry={load} busy={loading} />}

      <Card aria-labelledby="requests-title">
        <CardHeader>
          <CardTitle id="requests-title" className="text-base">
            Requests <span className="font-normal text-muted-foreground">({pending} waiting)</span>
          </CardTitle>
          <CardAction className="col-span-2 col-start-1 row-start-3 justify-self-start sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-self-end">
            <div role="group" aria-label="Show" className="flex flex-wrap gap-1">
              {FILTERS.map((item) => (
                <Button
                  key={item.key}
                  size="sm"
                  variant={filter === item.key ? "secondary" : "ghost"}
                  aria-pressed={filter === item.key}
                  onClick={() => setFilter(item.key)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          {loading && requests.length === 0 ? (
            <LoadingRows label="Loading requests" />
          ) : requests.length === 0 ? (
            <EmptyState icon={Wallet} title="No requests here">
              New requests appear when someone sends a proof of payment.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {requests.map((item) => {
                const status = STATUS[item.request.status] || STATUS.pending
                const busy = busyId === item.request.id
                return (
                  <li key={item.request.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        #{item.request.id} · {item.request.credits} credits · {rupiah(item.request.price)}
                        {item.request.discount_percent > 0 && (
                          <span className="font-normal text-muted-foreground"> ({item.request.discount_percent}% new-account discount)</span>
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
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <Button variant="outline" size="sm" onClick={() => setViewing(item.request)}>
                        See proof
                      </Button>
                      {item.request.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => {
                              setRejecting(item)
                              setRejectNote("")
                            }}
                          >
                            Reject
                          </Button>
                          <Button size="sm" disabled={busy} onClick={() => approve(item)}>
                            {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
                            {busy ? "Saving..." : "Approve"}
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card aria-labelledby="settings-title">
        <form onSubmit={saveSettings} className="flex flex-col gap-6">
          <CardHeader>
            <CardTitle id="settings-title" className="text-base">How people pay</CardTitle>
            <CardAction>
              <Badge variant={available ? "success" : "warning"}>{available ? "Open for top-up" : "Not available"}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox
                id="topup-enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked === true })}
              />
              <Label htmlFor="topup-enabled">Offer top-up to people</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price-per-credit">Price per credit (Rupiah)</Label>
              <Input
                id="price-per-credit"
                type="number"
                min="0"
                step="1"
                value={settings.price_per_credit}
                onChange={(event) => setSettings({ ...settings, price_per_credit: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="packages">Packages (credits, comma separated)</Label>
              <Input
                id="packages"
                value={settings.packages}
                placeholder="10, 25, 50"
                onChange={(event) => setSettings({ ...settings, packages: event.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="payment-info">Where to pay (one per line)</Label>
              <Textarea
                id="payment-info"
                rows={4}
                maxLength={2000}
                value={settings.payment_info}
                placeholder={"Bank name, account number, account holder\nE-wallet, number, name"}
                onChange={(event) => setSettings({ ...settings, payment_info: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">People see this exactly as written, with the amount to pay.</p>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={savingSettings}>
              {savingSettings && <Loader2 className="animate-spin" aria-hidden="true" />}
              {savingSettings ? "Saving..." : "Save"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card aria-labelledby="usage-title">
        <CardHeader>
          <CardTitle id="usage-title" className="text-base">Usage per month</CardTitle>
          <CardDescription>
            To see what one credit costs: divide the AI provider&apos;s bill for a month by its credits used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && usage.length === 0 ? (
            <LoadingRows rows={2} label="Loading usage" />
          ) : usage.length === 0 ? (
            <EmptyState title="No usage yet">Each month&apos;s numbers appear here once websites are made.</EmptyState>
          ) : (
            <Table className="min-w-180">
              <TableHeader>
                <TableRow>
                  {["Month", "AI tokens", "Websites", "Changes", "Credits used", "Credits sold", "Money in", "New accounts", "No promo"].map((label) => (
                    <TableHead key={label}>{label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((month) => (
                  <TableRow key={month.month} className="tabular-nums">
                    <TableCell className="font-medium">{month.month}</TableCell>
                    <TableCell>{month.tokens.toLocaleString("id-ID")}</TableCell>
                    <TableCell>{month.websites}</TableCell>
                    <TableCell>{month.changes}</TableCell>
                    <TableCell>{month.credits_used}</TableCell>
                    <TableCell>{month.credits_bought}</TableCell>
                    <TableCell>{rupiah(month.revenue)}</TableCell>
                    <TableCell>{month.new_accounts}</TableCell>
                    <TableCell>{month.no_promo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {viewing && <ProofDialog request={viewing} onClose={() => setViewing(null)} />}

      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          {rejecting && (
            <form onSubmit={reject} className="grid gap-4">
              <DialogHeader>
                <DialogTitle>Reject top up #{rejecting.request.id}?</DialogTitle>
                <DialogDescription>No credits are added. The person reads your reason.</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="reject-note">Reason</Label>
                <Input
                  id="reject-note"
                  autoFocus
                  maxLength={300}
                  value={rejectNote}
                  placeholder="The amount does not match"
                  onChange={(event) => setRejectNote(event.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
                <Button type="submit" variant="destructive" disabled={busyId === rejecting.request.id}>
                  {busyId === rejecting.request.id ? "Saving..." : "Reject"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  )
}
