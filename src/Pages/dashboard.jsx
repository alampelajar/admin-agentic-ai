import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Activity, ArrowRight, Globe, Hammer, Layers, RotateCw, Users as UsersIcon } from "lucide-react"

import {
  axisTick,
  chartTooltip,
  DAY_MS,
  EVENTS,
  listOf,
  parseDate,
  perDay,
  readJson,
  reduceMotion,
  relativeTime,
} from "../lib/websites"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.jsx"
import { Skeleton } from "../components/ui/skeleton.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatCard, StatusDot } from "../components/page.jsx"

const RECENT_EVENTS = 8
const RUNS_SHOWN = 4

// The first page after signing in: how the website builder is doing today.
function Dashboard() {
  const [sites, setSites] = useState([])
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([])
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [siteData, logData, userData, runData] = await Promise.all([
        readJson("/api/admin/sites"),
        readJson("/api/admin/site-logs"),
        readJson("/api/admin/users"),
        readJson("/api/admin/site-runs/active"),
      ])
      setSites(listOf(siteData, "sites"))
      setLogs(listOf(logData, "logs"))
      setUsers(listOf(userData, "users"))
      setRuns(listOf(runData, "runs"))
      setError("")
    } catch (err) {
      setError(err.message || "Could not load the dashboard.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const weekAgo = Date.now() - 7 * DAY_MS
  const live = sites.filter((site) => site.published).length
  const madeThisWeek = sites.filter((site) => new Date(site.created_at).getTime() >= weekAgo).length
  const newUsers = users.filter((user) => parseDate(user.created_at).getTime() >= weekAgo).length
  const running = runs.filter((run) => run.status === "running").length
  const outdated = sites.filter((site) => site.published && site.current_version > site.published_version).length

  const daily = useMemo(() => perDay(sites, logs, 7), [sites, logs])
  const recent = logs.slice(0, RECENT_EVENTS)

  const finding = loading
    ? "Loading the latest numbers..."
    : error
      ? "The latest numbers could not be loaded."
      : [
          runs.length > 0 ? `${runs.length} website${runs.length > 1 ? "s" : ""} being made now` : "Nothing being made right now",
          `${madeThisWeek} made this week`,
          outdated > 0 ? `${outdated} live website${outdated > 1 ? "s have" : " has"} a newer version to publish` : null,
        ]
          .filter(Boolean)
          .join(". ") + "."

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        description={finding}
        actions={
          <Button variant="outline" onClick={load} disabled={loading}>
            <RotateCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
            {loading ? "Loading..." : "Refresh"}
          </Button>
        }
      />

      {error && <ErrorState title="Could not load the dashboard" message={error} onRetry={load} busy={loading} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All websites" icon={<Layers className="size-4" aria-hidden="true" />} value={sites.length} note={`${madeThisWeek} made in the last 7 days`} loading={loading} />
        <StatCard
          label="Live"
          icon={<Globe className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
          value={live}
          note={sites.length ? `${Math.round((live / sites.length) * 100)}% of all websites` : "None yet"}
          loading={loading}
        />
        <StatCard
          label="Being made now"
          icon={<Hammer className="size-4" aria-hidden="true" />}
          value={runs.length}
          note={`${running} running, ${runs.length - running} waiting`}
          loading={loading}
        />
        <StatCard label="People" icon={<UsersIcon className="size-4" aria-hidden="true" />} value={users.length} note={`${newUsers} joined in the last 7 days`} loading={loading} />
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Websites made and published</CardTitle>
            <CardDescription>Each day of the last 7 days.</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/analytics">
                  More
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="flex h-full items-end gap-3 pb-6" role="status" aria-label="Loading the chart">
                {[45, 70, 35, 85, 60, 75, 50].map((height, index) => (
                  <Skeleton key={index} className="flex-1 rounded-b-none" style={{ height: `${height}%` }} />
                ))}
              </div>
            ) : (
              <>
                <p className="sr-only">{daily.map((row) => `${row.name}: ${row.made} made, ${row.published} published`).join("; ")}</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={axisTick} />
                    <Tooltip {...chartTooltip} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
                    <Bar dataKey="made" name="Made" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={!reduceMotion()} />
                    <Bar dataKey="published" name="Published" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={32} isAnimationActive={!reduceMotion()} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Being made now</CardTitle>
            <CardDescription>Websites the AI is making or will make next.</CardDescription>
            <CardAction>
              <Badge variant="secondary" className="tabular-nums">
                {loading ? "..." : runs.length}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {loading ? (
              <LoadingRows rows={3} label="Loading the websites being made" />
            ) : runs.length === 0 ? (
              <EmptyState icon={Hammer} title="Nothing in progress" className="flex-1 justify-center">
                Nobody is making a website right now.
              </EmptyState>
            ) : (
              <ul className="divide-y">
                {runs.slice(0, RUNS_SHOWN).map((run) => (
                  <li key={run.id} className="space-y-1 py-3 first:pt-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{run.site?.name || "Untitled website"}</p>
                      <Badge variant={run.status === "running" ? "success" : "warning"}>
                        <StatusDot tone={run.status === "running" ? "success" : "warning"} running={run.status === "running"} />
                        {run.status === "running" ? "Making" : "Waiting"}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {run.user?.name || run.user?.email || "Deleted user"} · {run.kind === "revise" ? "Change" : "New website"}
                    </p>
                    {run.steps?.[0]?.summary && <p className="truncate text-xs text-muted-foreground">{run.steps[0].summary}</p>}
                  </li>
                ))}
              </ul>
            )}
            {!loading && runs.length > RUNS_SHOWN && (
              <Button variant="link" size="sm" className="mt-2 self-start px-0" asChild>
                <Link to="/websites">{runs.length - RUNS_SHOWN} more on the Websites page</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 pb-0">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Websites made, published and deleted.</CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/logs">
                All logs
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
        {loading ? (
          <LoadingRows rows={3} label="Loading recent activity" className="px-6 pb-6" />
        ) : recent.length === 0 ? (
          <EmptyState icon={Activity} title="No activity yet" className="mx-6 mb-6">
            Websites that are made, published or deleted appear here.
          </EmptyState>
        ) : (
          <ul className="divide-y border-t">
            {recent.map((log) => {
              const event = EVENTS[log.action] || { label: log.action, variant: "outline" }
              return (
                <li key={log.id} className="flex items-center justify-between gap-4 px-6 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Badge variant={event.variant} className="w-20 justify-center">
                      {event.label}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{log.site_name || `Website #${log.site_id}`}</p>
                      <p className="truncate text-xs text-muted-foreground">{log.actor?.name || log.actor?.email || "Unknown"}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(log.time)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </Page>
  )
}

export default Dashboard
