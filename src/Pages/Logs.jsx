import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { Globe, Plus, RotateCw, Trash2 } from "lucide-react"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card, CardContent } from "../components/ui/card.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatCard } from "../components/page.jsx"
import { Input } from "../components/ui/input.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"

// The Logs page lists when websites were made, published and deleted. Managing the
// websites themselves is on the Websites page.

const EVENTS = {
  "site.create": { label: "Made", variant: "secondary", icon: "plus" },
  "site.publish": { label: "Published", variant: "success", icon: "globe" },
  "site.delete": { label: "Deleted", variant: "destructive", icon: "trash" },
}

function EventIcon({ name }) {
  const Icon = { plus: Plus, globe: Globe, trash: Trash2 }[name] || Plus
  return <Icon className="size-4" aria-hidden="true" />
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
    <Button
      key={value}
      size="sm"
      variant={eventFilter === value ? "secondary" : "ghost"}
      onClick={() => setEventFilter(value)}
      aria-pressed={eventFilter === value}
    >
      {label}
      <span className="tabular-nums text-muted-foreground">{count}</span>
    </Button>
  )

  return (
    <Page>
      <PageHeader
        title="Logs"
        description={
          <>
            When websites were made, published and deleted, and by whom. Manage websites on the{" "}
            <Link to="/websites" className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
              Websites
            </Link>{" "}
            page.
          </>
        }
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RotateCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Object.entries(EVENTS).map(([action, event]) => (
          <StatCard key={action} label={event.label} icon={<EventIcon name={event.icon} />} value={counts[action]} loading={loading && logs.length === 0} />
        ))}
      </div>

      {error && <ErrorState title="Could not load the logs" message={error} onRetry={load} busy={loading} />}

      <Card className="py-5" aria-labelledby="site-logs-title">
        <CardContent className="px-5">
        <h2 id="site-logs-title" className="sr-only">
          Website events
        </h2>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
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
          <LoadingRows label="Loading website logs" />
        ) : filtered.length === 0 ? (
          <EmptyState title={logs.length === 0 ? "No events yet" : "No matches"}>
            {logs.length === 0 ? "Websites that are made, published or deleted will appear here." : "No event matches your search."}
          </EmptyState>
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
                const event = EVENTS[log.action] || { label: log.action, variant: "outline", icon: "plus" }
                return (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-sm text-foreground">{relativeTime(log.time)}</p>
                      <p className="text-xs text-muted-foreground">{formatWib(log.time)}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.variant}>
                        <EventIcon name={event.icon} />
                        {event.label}
                      </Badge>
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
                    <TableCell className="max-w-56">
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
        </CardContent>
      </Card>
    </Page>
  )
}

export default Logs
