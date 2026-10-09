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

function MetricIcon({ name }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {name === "users" && (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      )}
      {name === "agent" && (
        <>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M12 8V4M9 4h6M8 13h.01M16 13h.01M9 17h6" />
        </>
      )}
      {name === "check" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.3 2.3 4.7-4.8" />
        </>
      )}
      {name === "trend" && (
        <>
          <path d="M3 3v18h18" />
          <path d="m7 14 4-4 3 3 5-7" />
        </>
      )}
    </svg>
  )
}

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

  const recentAgents = agents.filter(
    (agent) => agent.isActive
  ).length

  return (
    <div
      className="
        min-h-screen
        bg-slate-50
        p-6
        transition-colors
        dark:bg-slate-950
      "
    >
      {/* HEADER */}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1
            className="
              text-2xl
              font-bold
              text-slate-900
              dark:text-white
            "
          >
            Dashboard
          </h1>

          <p
            className="
              mt-1
              text-sm
              text-slate-500
              dark:text-slate-400
            "
          >
            Overview of your Agentic AI system
          </p>
        </div>

        {!loading && !pageError && (
          <span
            className="
              inline-flex
              items-center
              gap-2
              rounded-full
              bg-green-100
              px-3
              py-1.5
              text-xs
              font-semibold
              text-green-700
              dark:bg-green-950
              dark:text-green-400
            "
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            Live data
          </span>
        )}
      </div>

      {/* ERROR */}

      {pageError && (
        <div
          className="
            mb-6
            flex
            items-center
            justify-between
            gap-4
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            dark:border-red-900
            dark:bg-red-950/40
          "
        >
          <p
            className="
              text-sm
              font-medium
              text-red-600
              dark:text-red-400
            "
          >
            {pageError}
          </p>
        </div>
      )}

      {/* STATS */}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* TOTAL USERS */}

        <div
          className="
            dashboard-stat-card
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            transition-all
            duration-300
            ease-out
            hover:-translate-y-1
            hover:border-slate-300
            hover:shadow-xl
            dark:border-slate-800
            dark:bg-slate-900
            dark:hover:border-slate-700
          "
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className="
                  text-sm
                  font-medium
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Total Users
              </p>

              <h2
                className="
                  mt-2
                  text-3xl
                  font-bold
                  tracking-tight
                  text-slate-900
                  dark:text-white
                "
              >
                {loading
                  ? "..."
                  : totalUsers.toLocaleString()}
              </h2>
            </div>

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-lg
                bg-slate-100
                text-slate-600
                transition-all
                duration-300
                group-hover:bg-slate-900
                group-hover:text-white
                dark:bg-slate-800
                dark:text-slate-300
                dark:group-hover:bg-white
                dark:group-hover:text-slate-900
              "
            >
              <MetricIcon name="users" />
            </div>
          </div>

          <div className="mt-4">
            <span
              className="
                text-sm
                text-slate-400
                dark:text-slate-500
              "
            >
              Registered users
            </span>
          </div>
        </div>

        {/* ACTIVE AGENTS */}

        <div
          className="
            dashboard-stat-card
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            transition-all
            duration-300
            ease-out
            hover:-translate-y-1
            hover:border-slate-300
            hover:shadow-xl
            dark:border-slate-800
            dark:bg-slate-900
            dark:hover:border-slate-700
          "
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className="
                  text-sm
                  font-medium
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Active Agents
              </p>

              <h2
                className="
                  mt-2
                  text-3xl
                  font-bold
                  tracking-tight
                  text-slate-900
                  dark:text-white
                "
              >
                {loading
                  ? "..."
                  : activeAgents.toLocaleString()}
              </h2>
            </div>

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-lg
                bg-slate-100
                text-slate-600
                transition-all
                duration-300
                group-hover:bg-slate-900
                group-hover:text-white
                dark:bg-slate-800
                dark:text-slate-300
                dark:group-hover:bg-white
                dark:group-hover:text-slate-900
              "
            >
              <MetricIcon name="agent" />
            </div>
          </div>

          <div className="mt-4">
            <span
              className="
                text-sm
                text-slate-400
                dark:text-slate-500
              "
            >
              {loading
                ? "Loading..."
                : `${runningAgents} currently running`}
            </span>
          </div>
        </div>

        {/* TASKS COMPLETED */}

        <div
          className="
            dashboard-stat-card
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            transition-all
            duration-300
            ease-out
            hover:-translate-y-1
            hover:border-slate-300
            hover:shadow-xl
            dark:border-slate-800
            dark:bg-slate-900
            dark:hover:border-slate-700
          "
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className="
                  text-sm
                  font-medium
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Tasks Completed
              </p>

              <h2
                className="
                  mt-2
                  text-3xl
                  font-bold
                  tracking-tight
                  text-slate-900
                  dark:text-white
                "
              >
                {loading
                  ? "..."
                  : completedTasks.toLocaleString()}
              </h2>
            </div>

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-lg
                bg-slate-100
                text-slate-600
                transition-all
                duration-300
                group-hover:bg-slate-900
                group-hover:text-white
                dark:bg-slate-800
                dark:text-slate-300
                dark:group-hover:bg-white
                dark:group-hover:text-slate-900
              "
            >
              <MetricIcon name="check" />
            </div>
          </div>

          <div className="mt-4">
            <span
              className="
                text-sm
                text-slate-400
                dark:text-slate-500
              "
            >
              From all users
            </span>
          </div>
        </div>

        {/* SUCCESS RATE */}

        <div
          className="
            dashboard-stat-card
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            transition-all
            duration-300
            ease-out
            hover:-translate-y-1
            hover:border-slate-300
            hover:shadow-xl
            dark:border-slate-800
            dark:bg-slate-900
            dark:hover:border-slate-700
          "
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className="
                  text-sm
                  font-medium
                  text-slate-500
                  dark:text-slate-400
                "
              >
                Success Rate
              </p>

              <h2
                className="
                  mt-2
                  text-3xl
                  font-bold
                  tracking-tight
                  text-slate-900
                  dark:text-white
                "
              >
                {loading
                  ? "..."
                  : `${successRate}%`}
              </h2>
            </div>

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-lg
                bg-slate-100
                text-slate-600
                transition-all
                duration-300
                group-hover:bg-slate-900
                group-hover:text-white
                dark:bg-slate-800
                dark:text-slate-300
                dark:group-hover:bg-white
                dark:group-hover:text-slate-900
              "
            >
              <MetricIcon name="trend" />
            </div>
          </div>

          <div className="mt-4">
            <span
              className="
                text-sm
                text-slate-400
                dark:text-slate-500
              "
            >
              Completed vs failed
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ACTIVITY CHART */}

        <div
          className="
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            xl:col-span-2
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                className="
                  text-lg
                  font-semibold
                  text-slate-900
                  dark:text-white
                "
              >
                Task Activity
            </h2>

            <p
              className="
                text-sm
                text-slate-500
                dark:text-slate-400
              "
            >
                Completed tasks over the last 7 days
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {loading
                ? "Loading..."
                : `${activityData.reduce((sum, day) => sum + day.tasks, 0)} completed this week`}
            </span>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={activityData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800"
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "currentColor" }}
                  className="text-slate-500 dark:text-slate-400"
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fill: "currentColor" }}
                  className="text-slate-500 dark:text-slate-400"
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--chart-tooltip-bg)",
                    borderColor: "var(--chart-tooltip-border)",
                    borderRadius: "8px",
                    color: "var(--chart-tooltip-text)",
                  }}
                />

                <Bar
                  dataKey="tasks"
                  fill="#5262cf"
                  radius={[5, 5, 0, 0]}
                  barSize={30}
                  minPointSize={3}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SYSTEM STATUS */}

        <div
          className="
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            dark:border-slate-800
            dark:bg-slate-900
          "
        >
          <div className="mb-5">
            <h2
              className="
                text-lg
                font-semibold
                text-slate-900
                dark:text-white
              "
            >
              System Status
            </h2>

            <p
              className="
                text-sm
                text-slate-500
                dark:text-slate-400
              "
            >
              Current system health
            </p>
          </div>

          <div className="space-y-4">
            {/* API */}

            <div
              className="
                flex
                items-center
                justify-between
                rounded-lg
                bg-slate-50
                p-4
                dark:bg-slate-800
              "
            >
              <div>
                <p
                  className="
                    font-medium
                    text-slate-800
                    dark:text-slate-200
                  "
                >
                  API Server
                </p>

                <p
                  className="
                    text-xs
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  Admin API connected
                </p>
              </div>

              <span
                className={
                  pageError
                    ? "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-400"
                    : "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-400"
                }
              >
                {pageError
                  ? "Error"
                  : loading
                    ? "Checking"
                    : "Operational"}
              </span>
            </div>

            {/* DATABASE */}

            <div
              className="
                flex
                items-center
                justify-between
                rounded-lg
                bg-slate-50
                p-4
                dark:bg-slate-800
              "
            >
              <div>
                <p
                  className="
                    font-medium
                    text-slate-800
                    dark:text-slate-200
                  "
                >
                  Database
                </p>

                <p
                  className="
                    text-xs
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  MySQL queries through the admin API
                </p>
              </div>

              <span
                className={
                  pageError
                    ? "rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-400"
                    : "rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-400"
                }
              >
                {pageError
                  ? "Error"
                  : loading
                    ? "Checking"
                    : "Connected"}
              </span>
            </div>

            {/* AGENTS */}

            <div
              className="
                flex
                items-center
                justify-between
                rounded-lg
                bg-slate-50
                p-4
                dark:bg-slate-800
              "
            >
              <div>
                <p
                  className="
                    font-medium
                    text-slate-800
                    dark:text-slate-200
                  "
                >
                  AI Agents
                </p>

                <p
                  className="
                    text-xs
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  {loading
                    ? "Loading agents..."
                    : `${recentAgents} active agents`}
                </p>
              </div>

              <span
                className="
                  rounded-full
                  bg-green-100
                  px-3
                  py-1
                  text-xs
                  font-semibold
                  text-green-700
                  dark:bg-green-950
                  dark:text-green-400
                "
              >
                {loading
                  ? "Checking"
                  : "Operational"}
              </span>
            </div>

            {/* QUEUE */}

            <div
              className="
                flex
                items-center
                justify-between
                rounded-lg
                bg-slate-50
                p-4
                dark:bg-slate-800
              "
            >
              <div>
                <p
                  className="
                    font-medium
                    text-slate-800
                    dark:text-slate-200
                  "
                >
                  Queue
                </p>

                <p
                  className="
                    text-xs
                    text-slate-500
                    dark:text-slate-400
                  "
                >
                  {loading
                    ? "Loading tasks..."
                    : `${pendingTasks} pending tasks`}
                </p>
              </div>

              <span
                className="
                  rounded-full
                  bg-yellow-100
                  px-3
                  py-1
                  text-xs
                  font-semibold
                  text-yellow-700
                  dark:bg-yellow-950
                  dark:text-yellow-400
                "
              >
                {pendingTasks > 0
                  ? "Normal"
                  : "Clear"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}

      <div
        className="
          mt-6
          rounded-xl
          border
          border-slate-200
          bg-white
          p-5
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
        "
      >
        <div className="mb-5">
          <h2
            className="
              text-lg
              font-semibold
              text-slate-900
              dark:text-white
            "
          >
            Recent Activity
          </h2>

          <p
            className="
              text-sm
              text-slate-500
              dark:text-slate-400
            "
          >
            Latest activity from users and tasks
          </p>
        </div>

        {loading ? (
          <div
            className="
              py-8
              text-center
              text-sm
              text-slate-500
              dark:text-slate-400
            "
          >
            Loading recent activity...
          </div>
        ) : recentActivity.length === 0 ? (
          <div
            className="
              py-8
              text-center
              text-sm
              text-slate-500
              dark:text-slate-400
            "
          >
            No recent activity.
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map(
              (item, index) => (
                <div
                  key={`${item.type}-${item.date}-${index}`}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    border-b
                    border-slate-100
                    pb-4
                    last:border-b-0
                    last:pb-0
                    dark:border-slate-800
                  "
                >
                  <div className="min-w-0">
                    <p
                      className="
                        font-medium
                        text-slate-800
                        dark:text-slate-200
                      "
                    >
                      {item.title}
                    </p>

                    <p
                      className="
                        truncate
                        text-sm
                        text-slate-500
                        dark:text-slate-400
                      "
                    >
                      {item.description}
                    </p>
                  </div>

                  <span
                    className="
                      shrink-0
                      text-xs
                      text-slate-400
                      dark:text-slate-500
                    "
                  >
                    {formatRelativeTime(item.date)}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard