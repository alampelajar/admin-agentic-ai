import { useEffect, useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

import { Activity, Bot, CheckCircle2, UserRound, Zap } from "lucide-react"
import { apiFetch } from "../lib/api"
import { Badge } from "../components/ui/badge.jsx"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.jsx"
import { Skeleton } from "../components/ui/skeleton.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatusDot } from "../components/page.jsx"

const normalizeStatus = (status) => {
  const value = String(status || "").toLowerCase()

  if (
    value === "completed" ||
    value === "complete" ||
    value === "done" ||
    value === "success"
  ) {
    return "Completed"
  }

  if (
    value === "running" ||
    value === "in_progress" ||
    value === "processing"
  ) {
    return "Running"
  }

  if (
    value === "pending" ||
    value === "todo" ||
    value === "queued"
  ) {
    return "Pending"
  }

  if (
    value === "failed" ||
    value === "error"
  ) {
    return "Failed"
  }

  return (
    String(status || "Unknown")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

const normalizeUser = (user) => ({
  id: user?.id,
  name: user?.name || "Unknown User",
  email: user?.email || "-",
  role: user?.role || "user",
  createdAt: user?.created_at || null,
})

const normalizeAgent = (agent) => ({
  id: agent?.id,
  name: agent?.name || "Unknown Agent",
  status: normalizeStatus(agent?.status),
  isActive: Boolean(agent?.is_active),
})

const normalizeTask = (task) => ({
  id: task?.id,
  title: task?.title || "Untitled Task",
  status: normalizeStatus(task?.status),
  createdAt: task?.created_at || null,
  updatedAt: task?.updated_at || null,
  user: task?.user
    ? {
        id: task.user.id,
        name: task.user.name || "Unknown User",
        email: task.user.email || "-",
      }
    : null,
  agent: task?.agent
    ? {
        id: task.agent.id,
        name: task.agent.name || "Unknown Agent",
      }
    : null,
})

const formatRelativeTime = (value) => {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) {
    return "just now"
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours} hour${
      diffHours > 1 ? "s" : ""
    } ago`
  }

  const diffDays = Math.floor(diffHours / 24)

  return `${diffDays} day${
    diffDays > 1 ? "s" : ""
  } ago`
}

const buildActivityData = (tasks) => {
  const result = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date()

    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - offset)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const completedCount = tasks.filter((task) => {
      if (task.status !== "Completed") {
        return false
      }

      if (!task.updatedAt) {
        return false
      }

      const updatedAt = new Date(task.updatedAt)

      if (Number.isNaN(updatedAt.getTime())) {
        return false
      }

      return (
        updatedAt >= date &&
        updatedAt < nextDate
      )
    }).length

    result.push({
      name: date.toLocaleDateString("en-US", {
        weekday: "short",
      }),
      tasks: completedCount,
    })
  }

  return result
}

function Dashboard() {
  const [users, setUsers] = useState([])
  const [agents, setAgents] = useState([])
  const [tasks, setTasks] = useState([])

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      setPageError("")

      try {
        const [
          usersResponse,
          agentsResponse,
          tasksResponse,
        ] = await Promise.all([
          apiFetch("/api/admin/users"),
          apiFetch("/api/admin/agent-catalog"),
          apiFetch("/api/admin/tasks"),
        ])

        const [
          usersData,
          agentsData,
          tasksData,
        ] = await Promise.all([
          usersResponse.json().catch(() => ({})),
          agentsResponse.json().catch(() => ({})),
          tasksResponse.json().catch(() => ({})),
        ])

        if (!usersResponse.ok) {
          throw new Error(
            usersData?.error ||
              usersData?.message ||
              "Gagal mengambil data users."
          )
        }

        if (!agentsResponse.ok) {
          throw new Error(
            agentsData?.error ||
              agentsData?.message ||
              "Gagal mengambil data agents."
          )
        }

        if (!tasksResponse.ok) {
          throw new Error(
            tasksData?.error ||
              tasksData?.message ||
              "Gagal mengambil data tasks."
          )
        }

        const usersList = Array.isArray(usersData?.users)
          ? usersData.users
          : []

        const agentsList = Array.isArray(agentsData?.agents)
          ? agentsData.agents
          : []

        const tasksList = Array.isArray(tasksData?.tasks)
          ? tasksData.tasks
          : []

        setUsers(usersList.map(normalizeUser))
        setAgents(agentsList.map(normalizeAgent))
        setTasks(tasksList.map(normalizeTask))
      } catch (error) {
        console.error(
          "Gagal mengambil data dashboard:",
          error
        )

        setPageError(
          error.message ||
            "Gagal mengambil data dashboard."
        )
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const totalUsers = users.length

  const activeAgents = agents.filter(
    (agent) => agent.isActive
  ).length

  const runningAgents = agents.filter(
    (agent) => agent.status === "Running"
  ).length

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length

  const failedTasks = tasks.filter(
    (task) => task.status === "Failed"
  ).length

  const pendingTasks = tasks.filter(
    (task) => task.status === "Pending"
  ).length

  const processedTasks =
    completedTasks + failedTasks

  const successRate =
    processedTasks > 0
      ? (
          (completedTasks / processedTasks) *
          100
        ).toFixed(1)
      : "0.0"

  const activityData = useMemo(
    () => buildActivityData(tasks),
    [tasks]
  )

  const recentActivity = useMemo(() => {
    const activity = []

    for (const task of tasks) {
      activity.push({
        type: "task",
        date: task.updatedAt || task.createdAt,
        title:
          task.status === "Completed"
            ? "Task completed"
            : task.status === "Failed"
              ? "Task failed"
              : task.status === "Running"
                ? "Task running"
                : "Task created",
        description:
          task.agent?.name
            ? `${task.title} • ${task.agent.name}`
            : task.title,
      })
    }

    for (const user of users) {
      activity.push({
        type: "user",
        date: user.createdAt,
        title: "New user registered",
        description: user.email,
      })
    }

    return activity
      .filter((item) => item.date)
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(0, 5)
  }, [tasks, users])

  const finding =
    failedTasks > 0
      ? `${failedTasks} failed task${failedTasks > 1 ? "s" : ""} to look at, ${pendingTasks} waiting in the queue.`
      : `No failed tasks. ${pendingTasks} waiting in the queue.`

  const weekTotal = activityData.reduce(
    (sum, day) => sum + day.tasks,
    0
  )

  const kpis = [
    {
      label: "Tasks completed",
      value: completedTasks,
      note: `${weekTotal.toLocaleString()} in the last 7 days`,
      icon: "check",
    },
    {
      label: "Active agents",
      value: activeAgents,
      note: `${runningAgents.toLocaleString()} running now`,
      icon: "agent",
    },
    {
      label: "Users",
      value: totalUsers,
      note: "Registered accounts",
      icon: "user",
    },
  ]

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        description={loading ? "Loading the latest numbers..." : pageError ? "The latest numbers could not be loaded." : finding}
      />

      {pageError && <ErrorState title="Could not load the dashboard" message={pageError} />}

      <section aria-label="Key figures" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
        <Card className="justify-between gap-5 py-5 md:col-span-2 xl:col-span-1">
          <CardContent className="space-y-5 px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Success rate</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
                  {loading ? <Skeleton className="inline-block h-9 w-24" /> : <CountUp value={Number(successRate)} decimals={1} suffix="%" />}
                </p>
              </div>
              <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
                <Zap className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div className="space-y-2">
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Success rate"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={loading ? undefined : Math.min(100, Number(successRate))}
              >
                {!loading && <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(100, Number(successRate))}%` }} />}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? "Loading..." : `${completedTasks.toLocaleString()} of ${processedTasks.toLocaleString()} finished tasks succeeded`}
              </p>
            </div>
          </CardContent>
        </Card>

        {kpis.map((kpi) => {
          const Icon = KPI_ICONS[kpi.icon] || CheckCircle2
          return (
            <Card key={kpi.label} className="gap-0 py-5">
              <CardContent className="px-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
                  {loading ? <Skeleton className="inline-block h-8 w-16" /> : <CountUp value={kpi.value} />}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{loading ? <Skeleton className="inline-block h-4 w-32" /> : kpi.note}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks completed per day</CardTitle>
            <CardAction>
              <Badge variant="secondary">Last 7 days</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="flex h-full items-end gap-3 px-2 pb-6" role="status" aria-label="Loading the chart">
                {[45, 70, 35, 85, 60, 75, 50].map((height, index) => (
                  <Skeleton key={index} className="flex-1 rounded-b-none" style={{ height: `${height}%` }} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", radius: 6 }}
                    contentStyle={{ background: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }}
                  />
                  <Bar dataKey="tasks" name="Completed" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={40} animationDuration={600} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agents</CardTitle>
            {!loading && (
              <CardDescription>
                {runningAgents} running · {activeAgents} active
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <StatusDot tone={runningAgents > 0 ? "success" : "muted"} running={runningAgents > 0} />
              {loading ? "Checking agents..." : runningAgents > 0 ? `${runningAgents} agent${runningAgents > 1 ? "s" : ""} at work` : "All agents are idle"}
            </p>
            {loading ? (
              <LoadingRows rows={3} label="Loading agents" />
            ) : agents.length === 0 ? (
              <EmptyState icon={Bot} title="No agents yet" />
            ) : (
              <ul className="divide-y">
                {agents.slice(0, 5).map((agent) => {
                  const state = agent.isActive ? (agent.status === "Running" ? "Running" : "Idle") : "Off"
                  return (
                    <li key={agent.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <StatusDot tone={state === "Running" ? "success" : state === "Idle" ? "warning" : "muted"} running={state === "Running"} />
                        <span className="truncate font-medium">{agent.name}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">{state}</span>
                    </li>
                  )
                })}
              </ul>
            )}
            {!loading && agents.length > 5 && (
              <p className="mt-3 text-sm text-muted-foreground">{agents.length - 5} more on the Agents page</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingRows rows={3} label="Loading recent activity" />
          ) : recentActivity.length === 0 ? (
            <EmptyState icon={Activity} title="No recent activity">
              New sign-ups and finished tasks appear here.
            </EmptyState>
          ) : (
            <ul className="divide-y">
              {recentActivity.map((item, index) => {
                const Icon = item.type === "user" ? UserRound : CheckCircle2
                return (
                  <li key={`${item.type}-${item.date}-${index}`} className="flex items-center justify-between gap-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted text-muted-foreground">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="truncate text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(item.date)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </Page>
  )
}

const KPI_ICONS = { check: CheckCircle2, agent: Bot, user: UserRound }

// Counts up from 0 to the value once it arrives. Shows the value at once
// when the viewer prefers reduced motion.
function CountUp({ value, decimals = 0, suffix = "", duration = 1100 }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const target = Number(value) || 0
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let frame
    const start = performance.now()
    const step = (now) => {
      const progress = reduce ? 1 : Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setShown(target * eased)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  return (
    <>
      {shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  )
}

export default Dashboard
