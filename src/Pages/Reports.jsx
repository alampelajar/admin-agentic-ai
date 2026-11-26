import { useCallback, useEffect, useMemo, useState } from "react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { BarChart3, ChevronLeft, ChevronRight, Download, Globe, Layers, Loader2, UserPlus } from "lucide-react"

import { axisTick, chartTooltip, listOf, parseDate, readJson, reduceMotion, siteState, words } from "../lib/websites"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.jsx"
import { Skeleton } from "../components/ui/skeleton.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatCard } from "../components/page.jsx"

// The monthly report: websites made and published in one month, and the people who joined.

const LOCALE = "en-US"
const DAYS_PER_WEEK = 7
const LATEST_SITES = 10

const formatDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric" })
}

const inMonth = (value, monthStart) => {
  const date = parseDate(value)
  return !Number.isNaN(date.getTime()) && date.getFullYear() === monthStart.getFullYear() && date.getMonth() === monthStart.getMonth()
}

// Weeks count from the 1st of the month: 1-7, 8-14, and so on. Weeks that have not started
// yet are left out, so they do not read as weeks with nothing made.
function buildWeeks(made, published, monthStart, now) {
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthName = monthStart.toLocaleDateString(LOCALE, { month: "short" })
  const weeks = []
  for (let firstDay = 1; firstDay <= lastDay; firstDay += DAYS_PER_WEEK) {
    if (new Date(year, month, firstDay) > now) break
    const endDay = Math.min(firstDay + DAYS_PER_WEEK - 1, lastDay)
    weeks.push({ name: `${monthName} ${firstDay === endDay ? firstDay : `${firstDay}-${endDay}`}`, made: 0, published: 0 })
  }
  const weekOf = (value) => weeks[Math.floor((new Date(value).getDate() - 1) / DAYS_PER_WEEK)]
  made.forEach((site) => {
    const week = weekOf(site.created_at)
    if (week) week.made += 1
  })
  published.forEach((log) => {
    const week = weekOf(log.time)
    if (week) week.published += 1
  })
  return weeks
}

// A leading = + - or @ would make a spreadsheet run a website name as a formula.
const csvCell = (value) => {
  const text = String(value ?? "")
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

function downloadReport({ period, fileMonth, summary, weeks, sites }) {
  const rows = [
    ["Monthly website report", period],
    ...summary.map((item) => [item.label, item.value]),
    [],
    ["Week", "Websites made", "Websites published"],
    ...weeks.map((week) => [week.name, week.made, week.published]),
    [],
    ["Website", "Owner", "Kind", "State", "Versions", "Made", "Address"],
    ...sites.map((site) => [
      site.name,
      site.user?.email || "deleted user",
      words(site.kind),
      siteState(site).label,
      site.versions,
      formatDate(site.created_at),
      site.live_url || "",
    ]),
  ]
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
  // The byte order mark lets Excel read names with accents correctly.
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `website-report-${fileMonth}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function Reports() {
  const [now] = useState(() => new Date())
  const [offset, setOffset] = useState(0)
  const [sites, setSites] = useState([])
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [siteData, logData, userData] = await Promise.all([
        readJson("/api/admin/sites"),
        readJson("/api/admin/site-logs"),
        readJson("/api/admin/users"),
      ])
      setSites(listOf(siteData, "sites"))
      setLogs(listOf(logData, "logs"))
      setUsers(listOf(userData, "users"))
      setError("")
    } catch (err) {
      setError(err.message || "Could not load the report.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth() - offset, 1), [now, offset])
  const period = monthStart.toLocaleDateString(LOCALE, { month: "long", year: "numeric" })
  const fileMonth = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`

  const made = useMemo(
    () => sites.filter((site) => inMonth(site.created_at, monthStart)).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [sites, monthStart]
  )
  const published = useMemo(() => logs.filter((log) => log.action === "site.publish" && inMonth(log.time, monthStart)), [logs, monthStart])
  const newUsers = useMemo(() => users.filter((user) => inMonth(user.created_at, monthStart)).length, [users, monthStart])
  const weeks = useMemo(() => buildWeeks(made, published, monthStart, now), [made, published, monthStart, now])
  const liveNow = made.filter((site) => site.published).length

  const summary = [
    { label: "Websites made", value: made.length, note: `Started in ${period}` },
    { label: "Published", value: published.length, note: `${liveNow} of this month's websites are live now` },
    { label: "New people", value: newUsers, note: `Joined in ${period}` },
  ]
  const icons = [Layers, Globe, UserPlus]

  return (
    <Page>
      <PageHeader
        title="Monthly report"
        description={`Websites made and published, and the people who joined, in ${period}.`}
        actions={
          <>
            <div className="flex items-center gap-1" role="group" aria-label="Month">
              <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setOffset((value) => value + 1)} disabled={loading}>
                <ChevronLeft />
              </Button>
              <span className="min-w-32 text-center text-sm font-medium tabular-nums">{period}</span>
              <Button variant="outline" size="icon" aria-label="Next month" onClick={() => setOffset((value) => value - 1)} disabled={loading || offset === 0}>
                <ChevronRight />
              </Button>
            </div>
            <Button disabled={loading || Boolean(error)} onClick={() => downloadReport({ period, fileMonth, summary, weeks, sites: made })}>
              {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
              {loading ? "Loading data..." : "Download report"}
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState title="Could not load the report" message={error} onRetry={load} busy={loading} />
      ) : (
        <>
          <section aria-label="Key figures" aria-busy={loading} className="grid gap-4 md:grid-cols-3">
            {summary.map((item, index) => {
              const Icon = icons[index]
              return (
                <StatCard
                  key={item.label}
                  label={item.label}
                  icon={<Icon className="size-4" aria-hidden="true" />}
                  value={item.value}
                  note={loading ? null : item.note}
                  loading={loading}
                />
              )
            })}
          </section>

          <Card aria-busy={loading}>
            <CardHeader>
              <CardTitle className="text-base">Websites per week</CardTitle>
              <CardDescription>Made by the day each website was started, published by the day it went live.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {loading ? (
                <div className="flex h-full items-end gap-4 pb-6" role="status" aria-label="Loading the chart">
                  {[45, 70, 35, 85].map((height) => (
                    <Skeleton key={height} className="flex-1 rounded-b-none" style={{ height: `${height}%` }} />
                  ))}
                </div>
              ) : made.length === 0 && published.length === 0 ? (
                <EmptyState icon={BarChart3} title="No websites this month" className="h-full justify-center">
                  Weekly counts appear here once websites are made in {period}.
                </EmptyState>
              ) : (
                <>
                  <p className="sr-only">{weeks.map((week) => `${week.name}: ${week.made} made, ${week.published} published`).join(", ")}</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeks} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                      <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={axisTick} />
                      <Tooltip {...chartTooltip} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
                      <Bar dataKey="made" name="Made" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={!reduceMotion()} />
                      <Bar dataKey="published" name="Published" fill="var(--chart-2)" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={!reduceMotion()} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </CardContent>
          </Card>

          <Card aria-busy={loading} className="gap-0 pb-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Websites made this month</CardTitle>
              <CardDescription>
                {made.length > LATEST_SITES
                  ? `The last ${LATEST_SITES} started in ${period}. The download has all ${made.length}.`
                  : `Every website started in ${period}.`}
              </CardDescription>
            </CardHeader>
            {loading ? (
              <LoadingRows rows={5} label="Loading the websites" className="px-6 pb-6" />
            ) : made.length === 0 ? (
              <EmptyState icon={Globe} title="No websites yet" className="mx-6 mb-6">
                Websites started in {period} appear here.
              </EmptyState>
            ) : (
              <Table className="min-w-160">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Website</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="pr-6">Made</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {made.slice(0, LATEST_SITES).map((site) => {
                    const state = siteState(site)
                    return (
                      <TableRow key={site.id}>
                        <TableCell className="max-w-56 pl-6">
                          <p className="truncate font-medium" title={site.name}>
                            {site.name}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-48 text-muted-foreground">
                          <span className="block truncate">{site.user?.email || "Deleted user"}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{words(site.kind)}</TableCell>
                        <TableCell>
                          <Badge variant={state.variant}>{state.label}</Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-muted-foreground tabular-nums">{formatDate(site.created_at)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </Page>
  )
}

export default Reports
