import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { Check, Globe, Loader2, Plus, RotateCw } from "lucide-react"

import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { ActiveRuns } from "../components/ActiveRuns.jsx"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card, CardContent } from "../components/ui/card.jsx"
import { Label } from "../components/ui/label.jsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatusDot, SuccessNotice } from "../components/page.jsx"
import { FormDialog, RowMenu } from "../components/dialogs.jsx"
import { Input } from "../components/ui/input.jsx"
import { useConfirm } from "../components/ui/confirm-dialog.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"

const SITE_STATUS = {
  draft: { label: "Draft", variant: "secondary" },
  building: { label: "Building", variant: "warning" },
  ready: { label: "Ready", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
}

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/

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

const shortUrl = (url) => String(url || "").replace(/^https?:\/\//, "").replace(/\/$/, "")

function Owner({ user }) {
  if (!user) return <span className="text-muted-foreground">Deleted user</span>
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">{user.name || "-"}</p>
      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
    </div>
  )
}

function slugProblem(slug) {
  if (!slug) return "Enter an address."
  if (!SLUG_PATTERN.test(slug)) return "Use 3 to 40 lowercase letters, digits or hyphens, not starting or ending with a hyphen."
  return ""
}

// Create: put a website that has a version online at an address. Also used to move a
// live website to another address.
function PublishDialog({ sites, initialSite, moving, onClose, onDone }) {
  const candidates = useMemo(() => (moving ? [initialSite] : sites.filter((site) => site.has_version && !site.published)), [sites, initialSite, moving])
  const [siteId, setSiteId] = useState(initialSite?.id ?? candidates[0]?.id ?? "")
  const selected = candidates.find((site) => String(site.id) === String(siteId))
  const [slug, setSlug] = useState(initialSite?.slug || initialSite?.suggested_slug || candidates[0]?.slug || candidates[0]?.suggested_slug || "")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const slugId = useId()
  const siteFieldId = useId()
  const hintId = useId()

  const chooseSite = (id) => {
    setSiteId(id)
    const site = candidates.find((item) => String(item.id) === String(id))
    setSlug(site?.slug || site?.suggested_slug || "")
    setError("")
  }

  const submit = async (event) => {
    event.preventDefault()
    const value = slug.trim().toLowerCase()
    const problem = slugProblem(value)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError("")
    try {
      const data = await readJson(`/api/admin/sites/${selected.id}/publish`, jsonBody("POST", { slug: value }))
      onDone(`${selected.name} is live at ${shortUrl(data.url)}.`)
    } catch (err) {
      setError(err.message || "Could not publish the website.")
      setBusy(false)
    }
  }

  return (
    <FormDialog
      title={moving ? "Change address" : "Publish a website"}
      subtitle={moving ? `${initialSite.name} moves to the new address. The old address stops working.` : "Puts the newest version of a website online."}
      onClose={onClose}
      busy={busy}
    >
      {candidates.length === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            Every website that has a finished version is already live. A website appears here once its owner has
            built it.
          </p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {!moving && (
            <div className="space-y-2">
              <Label htmlFor={siteFieldId}>Website</Label>
              <Select value={String(siteId)} onValueChange={chooseSite} disabled={busy}>
                <SelectTrigger id={siteFieldId} className="w-full">
                  <SelectValue placeholder="Choose a website" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((site) => (
                    <SelectItem key={site.id} value={String(site.id)}>
                      {site.name} · {site.user?.email || "deleted user"} · version {site.current_version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={slugId}>Address</Label>
            <Input
              id={slugId}
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value)
                setError("")
              }}
              disabled={busy}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={hintId}
            />
            <p id={hintId} className="text-xs text-muted-foreground">
              The first part of the web address. Lowercase letters, digits and hyphens.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {selected && !moving && (
            <p className="text-xs text-muted-foreground">
              Publishes version {selected.current_version} of {selected.name}.
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !selected}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {busy ? "Publishing..." : moving ? "Move" : "Publish"}
            </Button>
          </div>
        </form>
      )}
    </FormDialog>
  )
}

// Update: rename a website.
function RenameDialog({ site, onClose, onDone }) {
  const [name, setName] = useState(site.name)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const nameId = useId()

  const submit = async (event) => {
    event.preventDefault()
    const value = name.trim()
    if (!value || value.length > 100) {
      setError("Enter a name of at most 100 characters.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await readJson(`/api/admin/sites/${site.id}`, jsonBody("PATCH", { name: value }))
      onDone(`Renamed to ${value}.`)
    } catch (err) {
      setError(err.message || "Could not rename the website.")
      setBusy(false)
    }
  }

  return (
    <FormDialog title="Rename website" subtitle={`Owner: ${site.user?.email || "deleted user"}`} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor={nameId}>Name</Label>
          <Input
            id={nameId}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError("")
            }}
            maxLength={100}
            disabled={busy}
            aria-invalid={error ? true : undefined}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
            {busy ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}

function Websites() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [search, setSearch] = useState("")
  const [view, setView] = useState("live")
  const [busyId, setBusyId] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [askToConfirm, confirmDialog] = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await readJson("/api/admin/sites")
      setSites(Array.isArray(data.sites) ? data.sites : [])
      setError("")
    } catch (err) {
      setError(err.message || "Could not load the websites.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const liveCount = sites.filter((site) => site.published).length
  const outdatedCount = sites.filter((site) => site.published && site.current_version > site.published_version).length

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sites
      .filter((site) => view === "all" || site.published)
      .filter((site) =>
        !term ||
        [site.name, site.description, site.user?.name, site.user?.email, site.live_url, site.slug]
          .some((value) => String(value || "").toLowerCase().includes(term))
      )
  }, [sites, search, view])

  const finish = (message) => {
    setDialog(null)
    setNotice(message)
    setError("")
    load()
  }

  // Runs one action on a row, with the row's buttons disabled until it finishes.
  const act = async (site, work, message) => {
    setBusyId(site.id)
    setNotice("")
    try {
      await work()
      finish(message)
    } catch (err) {
      setError(err.message || "The change was not saved.")
    } finally {
      setBusyId(null)
    }
  }

  const openPreview = async (site) => {
    // Open the tab now, while the click still counts, so the browser does not block it.
    const tab = window.open("", "_blank")
    setBusyId(site.id)
    try {
      const data = await readJson(`/api/admin/sites/${site.id}/preview`, { method: "POST" })
      if (tab) {
        tab.opener = null
        tab.location.href = data.url
      }
    } catch (err) {
      tab?.close()
      setError(err.message || "Could not open the preview.")
    } finally {
      setBusyId(null)
    }
  }

  const publishNewest = (site) =>
    act(
      site,
      () => readJson(`/api/admin/sites/${site.id}/publish`, jsonBody("POST", {})),
      `${site.name} now shows version ${site.current_version}.`
    )

  const takeOffline = async (site) => {
    const ok = await askToConfirm({
      title: "Take website offline?",
      description: `${shortUrl(site.live_url)} stops working for visitors and leaves the gallery. The website and its address are kept, so it can be published again.`,
      confirmLabel: "Take offline",
    })
    if (!ok) return
    act(site, () => readJson(`/api/admin/sites/${site.id}/unpublish`, { method: "POST" }), `${site.name} is offline.`)
  }

  const remove = async (site) => {
    const ok = await askToConfirm({
      title: "Delete website?",
      description: `${site.name} by ${site.user?.email || "a deleted user"} is deleted with every version, its address and the answers visitors sent. This cannot be undone.`,
      confirmLabel: "Delete",
    })
    if (!ok) return
    act(site, () => readJson(`/api/admin/sites/${site.id}`, { method: "DELETE" }), `${site.name} was deleted.`)
  }

  const toggleShowcase = (site) =>
    act(
      site,
      () => readJson(`/api/admin/sites/${site.id}/showcase`, jsonBody("PATCH", { showcased: !site.showcased })),
      site.showcased ? `${site.name} left the gallery.` : `${site.name} is shown in the gallery.`
    )

  const viewButton = (value, label, count) => (
    <Button size="sm" variant={view === value ? "secondary" : "ghost"} onClick={() => setView(value)} aria-pressed={view === value}>
      {label}
      <span className="tabular-nums text-muted-foreground">{count}</span>
    </Button>
  )

  return (
    <Page>
      <PageHeader
        title="Websites"
        description="Websites that are live for visitors. Publish, rename, move, take offline or delete them."
        actions={
          <>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RotateCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
              {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button onClick={() => setDialog({ type: "publish" })} disabled={loading}>
              <Plus aria-hidden="true" />
              Publish a website
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Live", value: liveCount },
          { label: "Live with a newer version", value: outdatedCount },
          { label: "All websites", value: sites.length },
        ].map((stat) => (
          <Card key={stat.label} className="gap-2 py-5">
            <CardContent className="px-5">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{loading && sites.length === 0 ? "..." : stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      {error && <ErrorState message={error} onRetry={load} busy={loading} />}

      <Card className="py-5" aria-labelledby="websites-title">
        <CardContent className="px-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1">
            <h2 id="websites-title" className="sr-only">
              Website list
            </h2>
            {viewButton("live", "Live", liveCount)}
            {viewButton("all", "All websites", sites.length)}
          </div>
          <div>
            <label htmlFor="website-search" className="sr-only">
              Search websites
            </label>
            <Input
              id="website-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search website, owner or address"
              className="lg:w-72"
            />
          </div>
        </div>

        {loading && sites.length === 0 ? (
          <LoadingRows label="Loading websites" />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Globe} title={search.trim() ? "No matches" : "No websites here"}>
            {search.trim()
              ? "No website matches your search."
              : view === "live"
                ? "No website is live yet. Use Publish a website to put one online."
                : "No websites have been made yet."}
          </EmptyState>
        ) : (
          <Table className="min-w-240">
            <TableHeader>
              <TableRow>
                <TableHead>Website</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Gallery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((site) => {
                const busy = busyId === site.id
                const status = SITE_STATUS[site.status] || SITE_STATUS.draft
                const outdated = site.published && site.current_version > site.published_version
                return (
                  <TableRow key={site.id}>
                    <TableCell className="max-w-48">
                      <p className="truncate font-medium text-foreground" title={site.name}>
                        {site.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {site.published && site.published_at
                          ? `Published ${formatWib(site.published_at)}`
                          : `Changed ${formatWib(site.updated_at)}`}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-44">
                      <Owner user={site.user} />
                    </TableCell>
                    <TableCell className="max-w-52">
                      {site.published ? (
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="success">
                            <StatusDot tone="success" running />
                            Live
                          </Badge>
                          <a
                            href={site.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={shortUrl(site.live_url)}
                            className="block max-w-full truncate rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            {shortUrl(site.live_url)}
                          </a>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant={site.has_version ? "outline" : status.variant}>{site.has_version ? "Offline" : status.label}</Badge>
                          {site.slug && <span className="text-xs text-muted-foreground">Kept: {site.slug}</span>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {!site.has_version ? (
                        <span className="text-muted-foreground">Not built yet</span>
                      ) : site.published ? (
                        <div>
                          <p className="tabular-nums">Version {site.published_version}</p>
                          {outdated ? (
                            <p className="text-xs text-amber-700 dark:text-amber-400">Newer: version {site.current_version}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Up to date</p>
                          )}
                        </div>
                      ) : (
                        <p className="tabular-nums">Version {site.current_version}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      {site.published ? (
                        <Button
                          variant={site.showcased ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => toggleShowcase(site)}
                          disabled={busy}
                          aria-pressed={site.showcased}
                          aria-label={site.showcased ? `Remove ${site.name} from the gallery` : `Show ${site.name} in the gallery`}
                        >
                          {site.showcased && <Check aria-hidden="true" />}
                          {site.showcased ? "Shown" : "Show"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Publish first</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                        {busy && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground" role="status">
                            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                            Working...
                          </span>
                        )}
                        {site.has_version && (
                          <Button variant="ghost" size="sm" onClick={() => openPreview(site)} disabled={busy} aria-label={`Preview ${site.name}`}>
                            Preview
                          </Button>
                        )}
                        {outdated && (
                          <Button variant="secondary" size="sm" onClick={() => publishNewest(site)} disabled={busy} aria-label={`Publish version ${site.current_version} of ${site.name}`}>
                            Publish v{site.current_version}
                          </Button>
                        )}
                        {site.has_version && !site.published && (
                          <Button variant="secondary" size="sm" onClick={() => setDialog({ type: "publish", site })} disabled={busy} aria-label={`Publish ${site.name}`}>
                            Publish
                          </Button>
                        )}
                        <RowMenu
                          label={`More actions for ${site.name}`}
                          disabled={busy}
                          items={[
                            { label: "Rename", onSelect: () => setDialog({ type: "rename", site }) },
                            ...(site.published
                              ? [
                                  { label: "Change address", onSelect: () => setDialog({ type: "move", site }) },
                                  { label: "Take offline", onSelect: () => takeOffline(site) },
                                ]
                              : []),
                            { label: "Delete", destructive: true, separatorBefore: true, onSelect: () => remove(site) },
                          ]}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        </CardContent>
      </Card>

      <ActiveRuns />

      {dialog?.type === "publish" && (
        <PublishDialog sites={sites} initialSite={dialog.site} onClose={() => setDialog(null)} onDone={finish} />
      )}
      {dialog?.type === "move" && (
        <PublishDialog sites={sites} initialSite={dialog.site} moving onClose={() => setDialog(null)} onDone={finish} />
      )}
      {dialog?.type === "rename" && <RenameDialog site={dialog.site} onClose={() => setDialog(null)} onDone={finish} />}
      {confirmDialog}
    </Page>
  )
}

export default Websites
