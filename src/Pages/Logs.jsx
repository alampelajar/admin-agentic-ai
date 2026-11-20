import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { Button } from "../components/ui/button.jsx"
import { Input } from "../components/ui/input.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"

// The Logs page lists when websites were made, published and deleted. Managing the
// websites themselves is on the Websites page.

const chip = "inline-flex h-8 items-center gap-2 rounded-chip px-3 text-sm font-medium"

const EVENTS = {
  "site.create": { label: "Made", className: "bg-secondary text-secondary-foreground", icon: "plus" },
  "site.publish": { label: "Published", className: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300", icon: "globe" },
  "site.delete": { label: "Deleted", className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300", icon: "trash" },
}

function EventIcon({ name }) {
  const paths = {
    plus: <path d="M12 5v14M5 12h14" />,
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  }
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function relativeTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`
  return formatWib(date)
}

function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [eventFilter, setEventFilter] = useState("all")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await apiFetch("/api/admin/site-logs")
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || "Could not load the website logs.")
      }
      setLogs(Array.isArray(data.logs) ? data.logs : [])
      setError("")
    } catch (err) {
      setError(err.message || "Could not load the website logs.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const result = { "site.create": 0, "site.publish": 0, "site.delete": 0 }
    logs.forEach((log) => {
      if (log.action in result) result[log.action] += 1
    })
    return result
  }, [logs])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return logs.filter((log) => {
      if (eventFilter !== "all" && log.action !== eventFilter) return false
      if (!term) return true
      return [log.site_name, log.message, log.actor?.name, log.actor?.email]
        .some((value) => String(value || "").toLowerCase().includes(term))
    })
  }, [logs, search, eventFilter])

  const filterButton = (value, label, count) => (
    <button
      key={value}
      type="button"
      onClick={() => setEventFilter(value)}
      aria-pressed={eventFilter === value}
      className={`${chip} state-layer border transition-colors duration-200 ease-m3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        eventFilter === value ? "border-transparent bg-secondary text-secondary-foreground" : "border-input text-muted-foreground"
      }`}
    >
      {label}
      <span className="tabular-nums">{count}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-normal text-foreground">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            When websites were made, published and deleted, and by whom. Manage websites on the{" "}
            <Link to="/websites" className="rounded-field font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Websites
            </Link>{" "}
            page.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.entries(EVENTS).map(([action, event]) => (
          <div key={action} className="rounded-card border border-border bg-card p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <EventIcon name={event.icon} />
              {event.label}
            </p>
            <p className="mt-2 text-3xl font-normal tabular-nums text-foreground">{loading && logs.length === 0 ? "..." : counts[action]}</p>
          </div>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-card bg-error-container px-4 py-3">
          <p className="text-sm text-on-error-container">{error}</p>
          <Button variant="destructive" onClick={load} disabled={loading}>
            Retry
          </Button>
        </div>
      )}

      <section className="rounded-card border border-border bg-card p-5" aria-labelledby="site-logs-title">
        <h2 id="site-logs-title" className="sr-only">
          Website events
        </h2>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filterButton("all", "All", logs.length)}
            {Object.entries(EVENTS).map(([action, event]) => filterButton(action, event.label, counts[action]))}
          </div>
          <div>
            <label htmlFor="log-search" className="sr-only">
              Search logs
            </label>
            <Input
              id="log-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search website or person"
              className="lg:w-72"
            />
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <div className="space-y-2" aria-label="Loading website logs">
            <div className="skeleton h-13 rounded-field" />
            <div className="skeleton h-13 rounded-field" />
            <div className="skeleton h-13 rounded-field" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {logs.length === 0 ? "Websites that are made, published or deleted will appear here." : "No event matches your search."}
          </p>
        ) : (
          <Table className="min-w-200">
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => {
                const event = EVENTS[log.action] || { label: log.action, className: "bg-muted text-muted-foreground", icon: "plus" }
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-sm text-foreground">{relativeTime(log.time)}</p>
                      <p className="text-xs text-muted-foreground">{formatWib(log.time)}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`${chip} ${event.className}`}>
                        <EventIcon name={event.icon} />
                        {event.label}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-56">
                      <p className="truncate font-medium text-foreground" title={log.site_name}>
                        {log.site_name || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">#{log.site_id}</p>
                    </TableCell>
                    <TableCell className="max-w-56">
                      {log.actor ? (
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">
                            {log.actor.name || log.actor.email}
                            {log.actor_role === "admin" && <span className="ml-2 text-xs text-muted-foreground">(admin)</span>}
                          </p>
                          {log.actor.name && log.actor.name !== log.actor.email && (
                            <p className="truncate text-xs text-muted-foreground">{log.actor.email}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-80">
                      <p className="truncate text-sm text-muted-foreground" title={log.message}>
                        {log.message}
                      </p>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}

export default Logs
