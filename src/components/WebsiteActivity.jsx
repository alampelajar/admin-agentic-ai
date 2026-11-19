import { useCallback, useEffect, useMemo, useState } from "react"

import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { Button } from "./ui/button.jsx"
import { Input } from "./ui/input.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table.jsx"

// How often the list of builds in progress is refreshed while the page is visible.
const ACTIVE_REFRESH_MS = 5000

const SITE_STATUS = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  building: { label: "Building", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300" },
  ready: { label: "Ready", className: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300" },
}

const chip = "inline-flex h-8 items-center gap-2 rounded-chip px-3 text-sm font-medium"

async function readJson(path, options) {
  const response = await apiFetch(path, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Request failed.")
  }
  return data
}

function Owner({ user }) {
  if (!user) return <span className="text-muted-foreground">Deleted user</span>
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">{user.name || "-"}</p>
      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
    </div>
  )
}

function ActiveRuns() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await readJson("/api/admin/site-runs/active")
      setRuns(Array.isArray(data.runs) ? data.runs : [])
      setError("")
    } catch (err) {
      setError(err.message || "Could not load the builds in progress.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load()
    }, ACTIVE_REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  return (
    <section className="rounded-card border border-border bg-card p-5" aria-labelledby="active-builds-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="active-builds-title" className="text-base font-medium text-foreground">
            Building now
          </h2>
          <p className="text-xs text-muted-foreground">
            People building a website and what the agent is doing. Refreshes every 5 seconds.
          </p>
        </div>
        <span className={`${chip} bg-secondary text-secondary-foreground tabular-nums`}>
          {runs.length} active
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-field bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading builds in progress">
          <div className="skeleton h-24 rounded-card" />
        </div>
      ) : runs.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nobody is building a website right now.
        </p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {runs.map((run) => (
            <li key={run.id} className="rounded-card border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <Owner user={run.user} />
                <span
                  className={`${chip} shrink-0 ${
                    run.status === "running"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                  }`}
                >
                  <span className={`status-dot ${run.status === "running" ? "is-running" : ""}`} aria-hidden="true" />
                  {run.status === "running" ? "Agent running" : "Queued"}
                </span>
              </div>

              <p className="mt-3 text-sm text-foreground">
                <span className="font-medium">{run.site?.name || "Untitled website"}</span>
                <span className="text-muted-foreground"> · {run.kind === "revise" ? "Revision" : "New website"}</span>
              </p>
              {run.request && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">“{run.request}”</p>
              )}

              <ol className="mt-3 space-y-2 border-l border-border pl-4">
                {(run.steps || []).length === 0 ? (
                  <li className="text-xs text-muted-foreground">Waiting for the agent to start.</li>
                ) : (
                  run.steps.map((step, index) => (
                    <li key={`${run.id}-${index}`} className="text-sm">
                      <span className={index === 0 ? "text-foreground" : "text-muted-foreground"}>{step.summary}</span>
                      {step.status === "failed" && <span className="ml-2 text-xs text-destructive">failed</span>}
                    </li>
                  ))
                )}
              </ol>

              <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                {run.step_count} steps · {run.model_calls} model calls · started {formatWib(run.started_at || run.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function SiteHistory() {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [opening, setOpening] = useState(null)
  const [toggling, setToggling] = useState(null)

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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return sites
    return sites.filter((site) =>
      [site.name, site.description, site.user?.name, site.user?.email, site.live_url]
        .some((value) => String(value || "").toLowerCase().includes(term))
    )
  }, [sites, search])

  const openPreview = async (site) => {
    // Open the tab now, while the click still counts, so the browser does not block it.
    const tab = window.open("", "_blank")
    setOpening(site.id)
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
      setOpening(null)
    }
  }

  // Puts a published website in the gallery every person sees in the builder, or takes it out.
  const toggleShowcase = async (site) => {
    setToggling(site.id)
    try {
      const data = await readJson(`/api/admin/sites/${site.id}/showcase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showcased: !site.showcased }),
      })
      setSites((list) => list.map((item) => (item.id === site.id ? { ...item, showcased: data.showcased } : item)))
      setError("")
    } catch (err) {
      setError(err.message || "Could not change the gallery.")
    } finally {
      setToggling(null)
    }
  }

  return (
    <section className="rounded-card border border-border bg-card p-5" aria-labelledby="site-history-title">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="site-history-title" className="text-base font-medium text-foreground">
            Website history
          </h2>
          <p className="text-xs text-muted-foreground">
            Every website people have made, newest change first. Published websites can be shown in
            the gallery that every person sees in the builder, where they can copy the look and pages.
          </p>
        </div>
        <div className="flex gap-2">
          <label htmlFor="site-search" className="sr-only">
            Search websites
          </label>
          <Input
            id="site-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search website or owner"
            className="sm:w-64"
          />
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-field bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      )}

      {loading && sites.length === 0 ? (
        <div className="space-y-2" aria-label="Loading websites">
          <div className="skeleton h-13 rounded-field" />
          <div className="skeleton h-13 rounded-field" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {sites.length === 0 ? "No websites have been made yet." : "No website matches your search."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Website</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Versions</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Link</TableHead>
              <TableHead>Gallery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((site) => {
              const status = SITE_STATUS[site.status] || SITE_STATUS.draft
              return (
                <TableRow key={site.id}>
                  <TableCell className="max-w-64">
                    <p className="truncate font-medium text-foreground">{site.name}</p>
                    {site.description && (
                      <p className="truncate text-xs text-muted-foreground">{site.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-56">
                    <Owner user={site.user} />
                  </TableCell>
                  <TableCell>
                    <span className={`${chip} ${status.className}`}>{status.label}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{site.versions}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatWib(site.updated_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {site.live_url && (
                        <a
                          href={site.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-56 truncate text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-field"
                        >
                          {site.live_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                      {site.has_version ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPreview(site)}
                          disabled={opening === site.id}
                          aria-label={`Open the preview of ${site.name}`}
                        >
                          {opening === site.id ? "Opening..." : "Preview"}
                        </Button>
                      ) : (
                        !site.live_url && <span className="text-xs text-muted-foreground">Not built yet</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {site.published ? (
                      <div className="flex items-center gap-2">
                        {site.showcased && (
                          <span className={`${chip} bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300`}>
                            Shown
                          </span>
                        )}
                        <Button
                          variant={site.showcased ? "ghost" : "outline"}
                          size="sm"
                          onClick={() => toggleShowcase(site)}
                          disabled={toggling === site.id}
                          aria-label={site.showcased ? `Remove ${site.name} from the gallery` : `Show ${site.name} in the gallery`}
                        >
                          {toggling === site.id ? "Saving..." : site.showcased ? "Remove" : "Show in gallery"}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Publish first</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

// The website builder part of the Logs page: builds in progress and every website made.
export default function WebsiteActivity() {
  return (
    <div className="mb-6 space-y-6">
      <ActiveRuns />
      <SiteHistory />
    </div>
  )
}
