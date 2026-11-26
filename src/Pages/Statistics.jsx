import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3, CircleAlert, Globe, Hammer, Layers, RotateCw, Sparkles, Users as UsersIcon } from "lucide-react"

import { apiFetch } from "../lib/api"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.jsx"
import { Skeleton } from "../components/ui/skeleton.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatCard } from "../components/page.jsx"

// Website statistics: how many websites people make, publish and keep, built from the same
// admin data as the Websites and Logs pages (no new backend route).

const DAY_MS = 24 * 60 * 60 * 1000
const LOCALE = "en-GB"
const TOP_OWNERS = 8

async function readJson(path) {
  const response = await apiFetch(path)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Request failed.")
  }
  return data
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const dayKey = (date) => startOfDay(date).getTime()

// Plain words for the stored keys ("tech-precise" becomes "Tech precise").
const words = (value) => {
  const text = String(value || "").replace(/[-_]+/g, " ").trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Not set"
}

function countBy(items, pick) {
  const counts = new Map()
  items.forEach((item) => {
    const key = pick(item)
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

// One row of a breakdown: the name, the count and a bar of its share.
function ShareList({ rows, total, limit = 6, label = (key) => words(key) }) {
  if (rows.length === 0) return <EmptyState icon={BarChart3} title="Nothing to count yet" />
  const shown = rows.slice(0, limit)
  const rest = rows.slice(limit).reduce((sum, row) => sum + row.count, 0)
  return (
    <ul className="space-y-3">
      {[...shown, ...(rest ? [{ key: "__rest", count: rest }] : [])].map((row) => {
        const percent = total ? Math.round((row.count / total) * 100) : 0
        return (
          <li key={row.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate">{row.key === "__rest" ? "Other" : label(row.key)}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {row.count} · {percent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function Statistics() {
  const [sites, setSites] = useState([])
  const [logs, setLogs] = useState([])
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [range, setRange] = useState("14")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [siteData, logData, usageData] = await Promise.all([
        readJson("/api/admin/sites"),
        readJson("/api/admin/site-logs"),
        readJson("/api/admin/usage"),
      ])
      setSites(Array.isArray(siteData.sites) ? siteData.sites : [])
      setLogs(Array.isArray(logData.logs) ? logData.logs : [])
      setMonths(Array.isArray(usageData.months) ? usageData.months : [])
      setError("")
    } catch (err) {
      setError(err.message || "Could not load the website statistics.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totals = useMemo(() => {
    const live = sites.filter((site) => site.published).length
    const built = sites.filter((site) => site.has_version).length
    const versions = sites.reduce((sum, site) => sum + (Number(site.versions) || 0), 0)
    return {
      all: sites.length,
      live,
      notPublished: sites.filter((site) => site.has_version && !site.published).length,
      notBuilt: sites.length - built,
      failed: sites.filter((site) => site.status === "failed").length,
      showcased: sites.filter((site) => site.showcased).length,
      owners: new Set(sites.map((site) => site.user?.id ?? "deleted")).size,
      versionsPerSite: built ? (versions / built).toFixed(1) : "0",
      liveShare: sites.length ? Math.round((live / sites.length) * 100) : 0,
    }
  }, [sites])

  // Websites made (from the website itself) and published (from the log) per day.
  const daily = useMemo(() => {
    const days = Number(range)
    const today = startOfDay(new Date())
    const rows = new Map()
    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date(today.getTime() - index * DAY_MS)
      rows.set(dayKey(date), {
        name: date.toLocaleDateString(LOCALE, { day: "numeric", month: "short" }),
        made: 0,
        published: 0,
      })
    }
    sites.forEach((site) => {
      const row = rows.get(dayKey(new Date(site.created_at)))
      if (row) row.made += 1
    })
    logs
      .filter((log) => log.action === "site.publish")
      .forEach((log) => {
        const row = rows.get(dayKey(new Date(log.time)))
        if (row) row.published += 1
      })
    return [...rows.values()]
  }, [sites, logs, range])

  const madeInRange = daily.reduce((sum, row) => sum + row.made, 0)
  const publishedInRange = daily.reduce((sum, row) => sum + row.published, 0)

  const byKind = useMemo(() => countBy(sites, (site) => site.kind || "general"), [sites])
  const byLook = useMemo(() => countBy(sites, (site) => site.design_direction || ""), [sites])
  const byStatus = useMemo(
    () => countBy(sites, (site) => (site.published ? "live" : site.has_version ? "built" : site.status || "draft")),
    [sites]
  )
  const statusLabel = (key) =>
    ({ live: "Live", built: "Made, not published", failed: "Failed", building: "Being made", draft: "Draft", ready: "Ready" })[key] ||
    words(key)

  const owners = useMemo(() => {
    const map = new Map()
    sites.forEach((site) => {
      const id = site.user?.id ?? "deleted"
      const row = map.get(id) || { id, name: site.user?.name || "Deleted user", email: site.user?.email || "", total: 0, live: 0, versions: 0 }
      row.total += 1
      row.live += site.published ? 1 : 0
      row.versions += Number(site.versions) || 0
      map.set(id, row)
    })
    return [...map.values()].sort((a, b) => b.total - a.total || b.live - a.live).slice(0, TOP_OWNERS)
  }, [sites])

  // Recharts animates from JavaScript, so the global CSS rule does not reach it.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const empty = !loading && sites.length === 0

  return (
    <Page>
      <PageHeader
        title="Website statistics"
        description="How many websites people make, publish and keep. Manage them on the Websites page."
        actions={
          <>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RotateCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
              {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button asChild>
              <Link to="/websites">
                <Globe aria-hidden="true" />
                Websites
              </Link>
            </Button>
          </>
        }
      />

      {error && <ErrorState title="Could not load the statistics" message={error} onRetry={load} busy={loading} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All websites" icon={<Layers className="size-4" aria-hidden="true" />} value={totals.all} note={`Made by ${totals.owners} ${totals.owners === 1 ? "person" : "people"}`} loading={loading} />
        <StatCard
          label="Live"
          icon={<Globe className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />}
          value={totals.live}
          note={`${totals.liveShare}% of all websites`}
          loading={loading}
        />
        <StatCard label="Made, not published" icon={<Hammer className="size-4" aria-hidden="true" />} value={totals.notPublished} note={`${totals.versionsPerSite} versions per website on average`} loading={loading} />
        <StatCard
          label="Not made"
          icon={<CircleAlert className="size-4 text-destructive" aria-hidden="true" />}
          value={totals.notBuilt}
          note={`${totals.failed} failed, the rest still drafts`}
          loading={loading}
        />
      </div>

      {empty ? (
        <EmptyState icon={Globe} title="No websites yet" action={<Button asChild variant="outline"><Link to="/websites">Open Websites</Link></Button>}>
          Statistics appear here once people make websites.
        </EmptyState>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Made and published per day</CardTitle>
              <CardDescription>
                {loading ? "Loading..." : `${madeInRange} made and ${publishedInRange} published in the last ${range} days.`}
              </CardDescription>
              <CardAction>
                <Tabs value={range} onValueChange={setRange}>
                  <TabsList aria-label="Period">
                    <TabsTrigger value="7">7 days</TabsTrigger>
                    <TabsTrigger value="14">14 days</TabsTrigger>
                    <TabsTrigger value="30">30 days</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardAction>
            </CardHeader>
            <CardContent className="h-72">
              {loading ? (
                <div className="flex h-full items-end gap-2 pb-6" role="status" aria-label="Loading the chart">
                  {[40, 65, 30, 80, 55, 70, 45, 60, 35, 75].map((height, index) => (
                    <Skeleton key={index} className="flex-1 rounded-b-none" style={{ height: `${height}%` }} />
                  ))}
                </div>
              ) : (
                <>
                  <p className="sr-only">{daily.map((row) => `${row.name}: ${row.made} made, ${row.published} published`).join("; ")}</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} interval="preserveStartEnd" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", radius: 6 }}
                        contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
                      <Bar dataKey="made" name="Made" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={!reduceMotion} />
                      <Bar dataKey="published" name="Published" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={!reduceMotion} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Where websites are</CardTitle>
                <CardDescription>Live, made but not published, or not made.</CardDescription>
              </CardHeader>
              <CardContent>{loading ? <LoadingRows rows={3} /> : <ShareList rows={byStatus} total={totals.all} label={statusLabel} />}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kinds of website</CardTitle>
                <CardDescription>What people make websites for.</CardDescription>
              </CardHeader>
              <CardContent>{loading ? <LoadingRows rows={3} /> : <ShareList rows={byKind} total={totals.all} />}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Looks chosen</CardTitle>
                <CardDescription>The design people picked.</CardDescription>
                <CardAction>
                  <Badge variant="secondary">
                    <Sparkles aria-hidden="true" />
                    {totals.showcased} in gallery
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent>{loading ? <LoadingRows rows={3} /> : <ShareList rows={byLook} total={totals.all} />}</CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="min-w-0 gap-0 pb-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Most websites per person</CardTitle>
                <CardDescription>The {TOP_OWNERS} people with the most websites.</CardDescription>
              </CardHeader>
              {loading ? (
                <LoadingRows rows={4} className="px-6 pb-6" />
              ) : owners.length === 0 ? (
                <EmptyState icon={UsersIcon} title="Nobody yet" className="mx-6 mb-6" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Person</TableHead>
                      <TableHead className="text-right">Websites</TableHead>
                      <TableHead className="text-right">Live</TableHead>
                      <TableHead className="pr-6 text-right">Versions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {owners.map((owner) => (
                      <TableRow key={owner.id}>
                        <TableCell className="max-w-56 pl-6">
                          <p className="truncate font-medium">{owner.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{owner.email}</p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{owner.total}</TableCell>
                        <TableCell className="text-right tabular-nums">{owner.live}</TableCell>
                        <TableCell className="pr-6 text-right tabular-nums">{owner.versions}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>

            <Card className="min-w-0 gap-0 pb-0">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Per month</CardTitle>
                <CardDescription>New websites and changes asked for, from the usage report.</CardDescription>
              </CardHeader>
              {loading ? (
                <LoadingRows rows={4} className="px-6 pb-6" />
              ) : months.length === 0 ? (
                <EmptyState icon={BarChart3} title="No months yet" className="mx-6 mb-6" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Month</TableHead>
                      <TableHead className="text-right">Websites</TableHead>
                      <TableHead className="text-right">Changes</TableHead>
                      <TableHead className="pr-6 text-right">Credits used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {months.map((month) => (
                      <TableRow key={month.month} className="tabular-nums">
                        <TableCell className="pl-6 font-medium">{month.month}</TableCell>
                        <TableCell className="text-right">{month.websites}</TableCell>
                        <TableCell className="text-right">{month.changes}</TableCell>
                        <TableCell className="pr-6 text-right">{month.credits_used}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
    </Page>
  )
}

export default Statistics
