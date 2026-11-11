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

import { apiFetch } from "../lib/api"

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
          apiFetch("/api/agents"),
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

  const panel = "lift rounded-2xl border border-border bg-card p-5 text-card-foreground"

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading the latest numbers..." : pageError ? "The latest numbers could not be loaded." : finding}
          </p>
        </div>
      </div>

      {pageError && (
        <p role="alert" className="mb-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {pageError}
        </p>
      )}

      <section aria-label="Key figures" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))]">
        <div className="hero-card kpi-card flex flex-col justify-between gap-5 rounded-2xl p-5 md:col-span-2 xl:col-span-1" style={{ "--i": 0 }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white/80">Success rate</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
                {loading ? <span className="skeleton inline-block h-9 w-24 opacity-40" /> : <CountUp value={Number(successRate)} decimals={1} suffix="%" />}
              </p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <KpiIcon name="spark" />
            </span>
          </div>
          <div className="space-y-2">
            <div className="progress-track">
              {!loading && <div className="progress-fill" style={{ width: `${Math.min(100, Number(successRate))}%` }} />}
            </div>
            <p className="text-xs text-white/80">
              {loading ? "Loading..." : `${completedTasks.toLocaleString()} of ${processedTasks.toLocaleString()} finished tasks succeeded`}
            </p>
          </div>
        </div>

        {kpis.map((kpi, index) => (
          <div key={kpi.label} className={`${panel} kpi-card`} style={{ "--i": index + 1 }}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                <KpiIcon name={kpi.icon} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
              {loading ? <span className="skeleton inline-block h-8 w-16" /> : <CountUp value={kpi.value} />}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{loading ? <span className="skeleton inline-block h-4 w-32" /> : kpi.note}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid items-stretch gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className={panel}>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-base font-semibold">Tasks completed per day</h2>
            <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-medium text-[var(--brand)]">Last 7 days</span>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="flex h-full items-end gap-3 px-2 pb-6">
                {[45, 70, 35, 85, 60, 75, 50].map((height, index) => (
                  <span key={index} className="skeleton flex-1 rounded-t-lg" style={{ height: `${height}%` }} />
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" style={{ stopColor: "var(--brand)" }} />
                      <stop offset="100%" style={{ stopColor: "var(--brand-strong)" }} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "var(--brand-soft)", radius: 8 }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13 }} />
                  <Bar
                    dataKey="tasks"
                    name="Completed"
                    fill="url(#barFill)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={40}
                    background={{ fill: "var(--surface-subtle)", radius: 8 }}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className={`${panel} flex flex-col`}>
          <div className="mb-2 flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Agents</h2>
            {!loading && (
              <span className="text-xs text-muted-foreground">
                {runningAgents} running · {activeAgents} active
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="orb" aria-hidden="true" />
            <p className="mt-4 text-sm font-medium text-[var(--brand)]">
              {loading ? "Checking agents..." : runningAgents > 0 ? `${runningAgents} agent${runningAgents > 1 ? "s" : ""} at work` : "All agents are idle"}
            </p>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((row) => <span key={row} className="skeleton block h-5" />)}
            </div>
          ) : agents.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No agents yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {agents.slice(0, 5).map((agent, index) => {
                const state = agent.isActive ? (agent.status === "Running" ? "Running" : "Idle") : "Off"
                return (
                  <li key={agent.id} className="activity-item flex items-center justify-between gap-4 py-2.5 text-sm" style={{ "--i": index }}>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={`status-dot ${state === "Running" ? "is-running" : state === "Idle" ? "is-idle" : ""}`} aria-hidden="true" />
                      <span className="truncate font-medium">{agent.name}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">{state}</span>
                  </li>
                )
              })}
            </ul>
          )}
          {!loading && agents.length > 5 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {agents.length - 5} more on the Agents page
            </p>
          )}
        </section>
      </div>

      <section className={`${panel} mt-6`}>
        <h2 className="mb-4 text-base font-semibold">Recent activity</h2>
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="space-y-2">
                <span className="skeleton block h-4 w-40" />
                <span className="skeleton block h-3 w-64" />
              </div>
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentActivity.map((item, index) => (
              <li key={`${item.type}-${item.date}-${index}`} className="activity-item flex items-center justify-between gap-4 py-3" style={{ "--i": index }}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
                    <KpiIcon name={item.type === "user" ? "user" : "check"} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="truncate text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">{formatRelativeTime(item.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

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

function KpiIcon({ name }) {
  const paths = {
    spark: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    agent: <><circle cx="12" cy="12" r="3" /><circle cx="12" cy="4" r="1.5" /><circle cx="5" cy="17" r="1.5" /><circle cx="19" cy="17" r="1.5" /><path d="M12 5.5v3.7M10 14.2l-4 2M14 14.2l4 2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

export default Dashboard
