import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.jsx"
import { BarChart3, ClipboardCheck, Download, Loader2 } from "lucide-react"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card } from "../components/ui/card.jsx"
import { Skeleton } from "../components/ui/skeleton.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatusDot } from "../components/page.jsx"
import { apiFetch } from "../lib/api"

const LOCALE = "en-US"
const DAYS_PER_WEEK = 7
const LATEST_TASK_COUNT = 5


const STATUS_VARIANTS = {
  completed: "success",
  failed: "destructive",
  running: "secondary",
  other: "outline",
}

const STATUS_ALIASES = {
  completed: "completed",
  complete: "completed",
  done: "completed",
  success: "completed",
  failed: "failed",
  error: "failed",
  running: "running",
  in_progress: "running",
  processing: "running",
}

const STATUS_LABELS = {
  completed: "Completed",
  failed: "Failed",
  running: "Running",
}

const statusKey = (status) =>
  STATUS_ALIASES[String(status || "").toLowerCase()] || "other"

// Tasks that are neither finished nor running (such as "todo") keep their own name.
const statusLabel = (status) =>
  STATUS_LABELS[statusKey(status)] ||
  String(status || "Unknown")
    .replace(/_/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase())

// The API sends "2006-01-02 15:04:05", which not every browser parses as is.
const parseDate = (value) => {
  if (!value) return null
  const date = new Date(String(value).replace(" ", "T"))
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (date) =>
  date
    ? date.toLocaleDateString(LOCALE, { month: "short", day: "numeric", year: "numeric" })
    : "-"

const isInMonth = (date, monthStart) =>
  date !== null &&
  date.getFullYear() === monthStart.getFullYear() &&
  date.getMonth() === monthStart.getMonth()

// Weeks count from the 1st of the month: 1-7, 8-14, and so on. Weeks that have not
// started yet are left out, so they do not read as weeks with no tasks.
const buildWeeks = (tasks, monthStart, now) => {
  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthName = monthStart.toLocaleDateString(LOCALE, { month: "short" })
  const weeks = []

  for (let firstDay = 1; firstDay <= lastDay; firstDay += DAYS_PER_WEEK) {
    if (new Date(year, month, firstDay) > now) break
    const endDay = Math.min(firstDay + DAYS_PER_WEEK - 1, lastDay)
    const range = firstDay === endDay ? `${firstDay}` : `${firstDay}-${endDay}`
    weeks.push({ name: `${monthName} ${range}`, tasks: 0 })
  }

  for (const task of tasks) {
    const week = weeks[Math.floor((task.createdAt.getDate() - 1) / DAYS_PER_WEEK)]
    if (week) week.tasks += 1
  }

  return weeks
}

// A leading = + - or @ would make a spreadsheet run a task title as a formula.
const csvCell = (value) => {
  const text = String(value ?? "")
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replace(/"/g, '""')}"`
}

const downloadReport = ({ period, fileMonth, summary, weeks, tasks }) => {
  const rows = [
    ["Monthly report", period],
    ...summary.map((item) => [item.label, item.value]),
    [],
    ["Week", "Tasks"],
    ...weeks.map((week) => [week.name, week.tasks]),
    [],
    ["Task", "User", "Status", "Created", "Updated"],
    ...tasks.map((task) => [
      task.title,
      task.userName,
      statusLabel(task.status),
      formatDate(task.createdAt),
      formatDate(task.updatedAt),
    ]),
  ]
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n")

  // The byte order mark lets Excel read names with accents correctly.
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }))
  const link = document.createElement("a")
  link.href = url
  link.download = `monthly-report-${fileMonth}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const readList = async (response, key, fallbackError) => {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data?.error || data?.message || fallbackError)
  return Array.isArray(data?.[key]) ? data[key] : []
}

function StatusBadge({ status }) {
  const key = statusKey(status)

  return (
    <Badge variant={STATUS_VARIANTS[key]}>
      {key === "running" && <StatusDot tone="primary" running />}
      {statusLabel(status)}
    </Badge>
  )
}

function Reports() {
  const [now] = useState(() => new Date())
  const [rawTasks, setRawTasks] = useState([])
  const [rawUsers, setRawUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [tasksResponse, usersResponse] = await Promise.all([
          apiFetch("/api/admin/tasks"),
          apiFetch("/api/admin/users"),
        ])
        const [tasks, users] = await Promise.all([
          readList(tasksResponse, "tasks", "Could not load tasks."),
          readList(usersResponse, "users", "Could not load users."),
        ])

        if (cancelled) return
        setRawTasks(tasks)
        setRawUsers(users)
      } catch (error) {
        if (!cancelled) setPageError(error.message || "Could not load the report.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const monthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now])
  const period = monthStart.toLocaleDateString(LOCALE, { month: "long", year: "numeric" })
  const fileMonth = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`

  const tasks = useMemo(
    () =>
      rawTasks
        .map((task) => ({
          id: task.id,
          title: task.title || "Untitled task",
          status: task.status,
          userName: task.user?.name || "-",
          createdAt: parseDate(task.created_at),
          updatedAt: parseDate(task.updated_at),
        }))
        .filter((task) => isInMonth(task.createdAt, monthStart))
        .sort((a, b) => b.createdAt - a.createdAt),
    [rawTasks, monthStart]
  )

  const newUsers = useMemo(
    () => rawUsers.filter((user) => isInMonth(parseDate(user.created_at), monthStart)).length,
    [rawUsers, monthStart]
  )

  const weeks = useMemo(() => buildWeeks(tasks, monthStart, now), [tasks, monthStart, now])

  const successfulTasks = tasks.filter((task) => statusKey(task.status) === "completed").length
  const latestTasks = tasks.slice(0, LATEST_TASK_COUNT)
  const monthName = monthStart.toLocaleDateString(LOCALE, { month: "long" })

  const summary = [
    { label: "Total tasks", value: tasks.length, note: `Created in ${monthName}` },
    {
      label: "Successful tasks",
      value: successfulTasks,
      note: tasks.length > 0
        ? `${Math.round((successfulTasks / tasks.length) * 100)}% of this month's tasks`
        : "No tasks yet this month",
    },
    { label: "New users", value: newUsers, note: `Joined in ${monthName}` },
  ]

  // Recharts animates from JavaScript, so the global CSS rule does not reach it.
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

  return (
    <Page>
      <PageHeader
        title="Monthly report"
        description={`Tasks and new users for ${period}.`}
        actions={
          <Button disabled={loading || Boolean(pageError)} onClick={() => downloadReport({ period, fileMonth, summary, weeks, tasks })}>
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
            {loading ? "Loading data..." : "Download report"}
          </Button>
        }
      />

      {pageError ? (
        <ErrorState title="Could not load the report" message={pageError} />
      ) : (
        <>
          <section aria-label="Key figures" aria-busy={loading} className="grid gap-4 md:grid-cols-3">
            {summary.map((item) => (
              <Card key={item.label} className="gap-1 px-5 py-5">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {loading ? <Skeleton className="inline-block h-8 w-16" /> : item.value.toLocaleString(LOCALE)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {loading ? <Skeleton className="inline-block h-3 w-32" /> : item.note}
                </p>
              </Card>
            ))}
          </section>

          <Card aria-busy={loading} className="gap-0 px-5 py-5">
            <h2 className="text-base font-semibold">Tasks per week</h2>
            <p className="mt-1 text-xs text-muted-foreground">By the date each task was created.</p>

            <div className="mt-4 h-64">
              {loading ? (
                <div className="flex h-full items-end gap-4 px-2 pb-6">
                  {[45, 70, 35, 85].map((height) => (
                    <Skeleton key={height} className="flex-1 rounded-b-none" style={{ height: `${height}%` }} />
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <EmptyState icon={BarChart3} title="No tasks this month" className="h-full justify-center">
                  Weekly counts will appear here once tasks are created this month.
                </EmptyState>
              ) : (
                <>
                  <p className="sr-only">
                    {weeks.map((week) => `${week.name}: ${week.tasks} tasks`).join(", ")}
                  </p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeks} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: "var(--muted)" }}
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "var(--popover-foreground)" }}
                        itemStyle={{ color: "var(--popover-foreground)" }}
                      />
                      <Bar
                        dataKey="tasks"
                        name="Tasks"
                        fill="var(--primary)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={56}
                        isAnimationActive={!reduceMotion}
                        animationDuration={600}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </Card>

          <Card aria-busy={loading} className="gap-0 px-5 py-5">
            <h2 className="text-base font-semibold">Latest tasks</h2>
            <p className="mt-1 text-xs text-muted-foreground">The last {LATEST_TASK_COUNT} tasks created this month.</p>

            <div className="mt-4">
              {loading ? (
                <LoadingRows rows={5} label="Loading the latest tasks" />
              ) : latestTasks.length === 0 ? (
                <EmptyState icon={ClipboardCheck} title="No tasks yet">
                  This month&apos;s latest tasks will appear here.
                </EmptyState>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="min-w-40 font-medium">{task.title}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{task.userName}</TableCell>
                        <TableCell><StatusBadge status={task.status} /></TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{formatDate(task.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Card>
        </>
      )}
    </Page>
  )
}

export default Reports
