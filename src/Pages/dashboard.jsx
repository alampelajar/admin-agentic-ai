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
      value: completedTasks.toLocaleString(),
      note: `${weekTotal.toLocaleString()} in the last 7 days`,
    },
    {
      label: "Success rate",
      value: `${successRate}%`,
      note: `${completedTasks.toLocaleString()} of ${processedTasks.toLocaleString()} finished tasks`,
    },
    {
      label: "Active agents",
      value: activeAgents.toLocaleString(),
      note: `${runningAgents.toLocaleString()} running now`,
    },
    {
      label: "Users",
      value: totalUsers.toLocaleString(),
      note: "Registered accounts",
    },
  ]

  const panel = "rounded-xl bg-card p-5 text-card-foreground"

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

      <section aria-label="Key figures" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-border xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card p-5">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
              {loading ? "–" : kpi.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{loading ? "" : kpi.note}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className={panel}>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-base font-semibold">Tasks completed per day</h2>
            <span className="text-sm text-muted-foreground">Last 7 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                <Tooltip cursor={{ fill: "var(--surface-subtle)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13 }} />
                <Bar dataKey="tasks" name="Completed" fill="var(--accent)" radius={0} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={panel}>
          <h2 className="mb-4 text-base font-semibold">Agents</h2>
          {loading ? (
            <p className="py-4 text-sm text-muted-foreground">Loading agents...</p>
          ) : agents.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No agents yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {agents.slice(0, 6).map((agent) => (
                <li key={agent.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate font-medium">{agent.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {agent.isActive ? (agent.status === "Running" ? "Running" : "Idle") : "Off"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!loading && agents.length > 6 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {agents.length - 6} more on the Agents page
            </p>
          )}
        </section>
      </div>

      <section className={`${panel} mt-6`}>
        <h2 className="mb-4 text-base font-semibold">Recent activity</h2>
        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading recent activity...</p>
        ) : recentActivity.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recentActivity.map((item, index) => (
              <li key={`${item.type}-${item.date}-${index}`} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{item.description}</p>
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

export default Dashboard
