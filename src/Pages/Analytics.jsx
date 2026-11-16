import { useEffect, useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

import { apiFetch } from "../lib/api"

const CHART_COLORS = [
  "#2563EB",
  "#9333EA",
  "#16A34A",
  "#0891B2",
  "#D97706",
  "#DC2626",
  "#475569",
  "#7C3AED",
]

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

const parseDate = (value) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value
  }

  const normalized = String(value).replace(
    " ",
    "T"
  )

  const date = new Date(normalized)

  return Number.isNaN(date.getTime())
    ? null
    : date
}

const normalizeTask = (task) => {
  return {
    id: task?.id,
    title: task?.title || "Untitled Task",
    status: normalizeStatus(task?.status),
    priority: task?.priority || "-",
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
          slug: task.agent.slug || "-",
        }
      : null,
  }
}

const normalizeAgent = (agent) => {
  return {
    id: agent?.id,
    name: agent?.name || "Unknown Agent",
    slug: agent?.slug || "-",
    status: normalizeStatus(agent?.status),
    isActive: Boolean(agent?.is_active),
  }
}

const buildDailyTaskData = (tasks) => {
  const result = []

  for (let offset = 6; offset >= 0; offset -= 1) {
    const dayStart = new Date()

    dayStart.setHours(0, 0, 0, 0)
    dayStart.setDate(
      dayStart.getDate() - offset
    )

    const dayEnd = new Date(dayStart)

    dayEnd.setDate(
      dayEnd.getDate() + 1
    )

    let completed = 0
    let failed = 0

    for (const task of tasks) {
      const date = parseDate(
        task.updatedAt || task.createdAt
      )

      if (!date) {
        continue
      }

      if (
        date < dayStart ||
        date >= dayEnd
      ) {
        continue
      }

      if (task.status === "Completed") {
        completed += 1
      }

      if (task.status === "Failed") {
        failed += 1
      }
    }

    result.push({
      name: dayStart.toLocaleDateString(
        "en-US",
        {
          weekday: "short",
        }
      ),
      completed,
      failed,
      success:
        completed + failed > 0
          ? Number(
              (
                (completed /
                  (completed + failed)) *
                100
              ).toFixed(1)
            )
          : null,
    })
  }

  return result
}

const buildAgentUsageData = (tasks) => {
  const counts = new Map()

  for (const task of tasks) {
    if (!task.agent) {
      continue
    }

    const key = task.agent.id

    if (!counts.has(key)) {
      counts.set(key, {
        name: task.agent.name,
        value: 0,
      })
    }

    counts.get(key).value += 1
  }

  return Array.from(counts.values())
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      color:
        CHART_COLORS[
          index % CHART_COLORS.length
        ],
    }))
}

const buildAgentPerformance = (tasks) => {
  const stats = new Map()

  for (const task of tasks) {
    if (!task.agent) {
      continue
    }

    const key = task.agent.id

    if (!stats.has(key)) {
      stats.set(key, {
        id: task.agent.id,
        name: task.agent.name,
        completed: 0,
        failed: 0,
        total: 0,
      })
    }

    const item = stats.get(key)

    item.total += 1

    if (task.status === "Completed") {
      item.completed += 1
    }

    if (task.status === "Failed") {
      item.failed += 1
    }
  }

  return Array.from(stats.values()).map(
    (item) => ({
      ...item,
      successRate:
        item.completed + item.failed > 0
          ? Number(
              (
                (item.completed /
                  (item.completed +
                    item.failed)) *
                100
              ).toFixed(1)
            )
          : null,
    })
  )
}

const formatPercent = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "-"
  }

  return `${value}%`
}

function Analytics() {
  const [tasks, setTasks] = useState([])
  const [agents, setAgents] = useState([])

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")

  // ============================================================
  // THEME
  // ============================================================

  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains(
      "dark"
    )
  )

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(
        document.documentElement.classList.contains(
          "dark"
        )
      )
    })

    observer.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: ["class"],
      }
    )

    return () => observer.disconnect()
  }, [])

  const chartTextColor = isDark
    ? "#94A3B8"
    : "#64748B"

  const chartGridColor = isDark
    ? "#334155"
    : "#E2E8F0"

  const chartTooltipBg = isDark
    ? "#0F172A"
    : "#FFFFFF"

  const chartTooltipBorder = isDark
    ? "#334155"
    : "#E2E8F0"

  // ============================================================
  // LOAD ANALYTICS DATA
  // ============================================================

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true)
      setPageError("")

      try {
        const [
          tasksResponse,
          agentsResponse,
        ] = await Promise.all([
          apiFetch("/api/admin/tasks"),
          apiFetch("/api/admin/agent-catalog"),
        ])

        const [
          tasksData,
          agentsData,
        ] = await Promise.all([
          tasksResponse
            .json()
            .catch(() => ({})),
          agentsResponse
            .json()
            .catch(() => ({})),
        ])

        if (!tasksResponse.ok) {
          throw new Error(
            tasksData?.error ||
              tasksData?.message ||
              "Gagal mengambil data tasks."
          )
        }

        if (!agentsResponse.ok) {
          throw new Error(
            agentsData?.error ||
              agentsData?.message ||
              "Gagal mengambil data agents."
          )
        }

        const tasksList = Array.isArray(
          tasksData?.tasks
        )
          ? tasksData.tasks
          : []

        const agentsList = Array.isArray(
          agentsData?.agents
        )
          ? agentsData.agents
          : []

        setTasks(
          tasksList.map(normalizeTask)
        )

        setAgents(
          agentsList.map(normalizeAgent)
        )
      } catch (error) {
        console.error(
          "Gagal mengambil analytics:",
          error
        )

        setPageError(
          error.message ||
            "Gagal mengambil data analytics."
        )
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  // ============================================================
  // SUMMARY
  // ============================================================

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length

  const failedTasks = tasks.filter(
    (task) => task.status === "Failed"
  ).length

  const activeAgents = agents.filter(
    (agent) => agent.isActive
  ).length

  const outcomeTasks =
    completedTasks + failedTasks

  const overallSuccessRate =
    outcomeTasks > 0
      ? Number(
          (
            (completedTasks /
              outcomeTasks) *
            100
          ).toFixed(1)
        )
      : null

  // ============================================================
  // CHART DATA
  // ============================================================

  const taskData = useMemo(
    () => buildDailyTaskData(tasks),
    [tasks]
  )

  const performanceData = taskData.map(
    (item) => ({
      name: item.name,
      success: item.success,
    })
  )

  const agentData = useMemo(
    () => buildAgentUsageData(tasks),
    [tasks]
  )

  const agentPerformance = useMemo(
    () => buildAgentPerformance(tasks),
    [tasks]
  )

  const topSuccessAgent =
    agentPerformance
      .filter(
        (agent) =>
          agent.successRate !== null
      )
      .sort((a, b) => {
        if (
          b.successRate !==
          a.successRate
        ) {
          return (
            b.successRate -
            a.successRate
          )
        }

        return b.total - a.total
      })[0] || null

  const mostActiveAgent =
    [...agentPerformance].sort(
      (a, b) => b.total - a.total
    )[0] || null

  // ============================================================
  // RETURN
  // ============================================================

  return (
    <div
      className="
        min-h-screen
        bg-slate-50
        p-6
        text-slate-900
        transition-colors
        duration-200
        dark:bg-slate-950
        dark:text-slate-100
      "
    >

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="mb-6 flex items-start justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Analytics
          </h1>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitor system performance and task analytics
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
              dark:bg-green-500/15
              dark:text-green-400
            "
          >

            <span className="h-1.5 w-1.5 rounded-full bg-current" />

            Live data

          </span>
        )}

      </div>

      {/* ====================================================== */}
      {/* ERROR */}
      {/* ====================================================== */}

      {pageError && (
        <div
          className="
            mb-6
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            dark:border-red-500/30
            dark:bg-red-500/10
          "
        >

          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            {pageError}
          </p>

        </div>
      )}

      {/* ====================================================== */}
      {/* SUMMARY CARDS */}
      {/* ====================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total Tasks */}

        <div
          className="
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-lg
            dark:border-slate-800
            dark:bg-slate-900
            dark:shadow-none
            dark:hover:bg-slate-900
          "
        >

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Total Tasks
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {loading
              ? "..."
              : tasks.length.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
            From all users
          </p>

        </div>

        {/* Success Rate */}

        <div
          className="
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-lg
            dark:border-slate-800
            dark:bg-slate-900
            dark:shadow-none
            dark:hover:bg-slate-900
          "
        >

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Success Rate
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {loading
              ? "..."
              : formatPercent(
                  overallSuccessRate
                )}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
            Completed vs failed
          </p>

        </div>

        {/* Failed Tasks */}

        <div
          className="
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-lg
            dark:border-slate-800
            dark:bg-slate-900
            dark:shadow-none
            dark:hover:bg-slate-900
          "
        >

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Failed Tasks
          </p>

          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
            {loading
              ? "..."
              : failedTasks.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
            Need attention
          </p>

        </div>

        {/* Active Agents */}

        <div
          className="
            rounded-xl
            border
            border-slate-200
            bg-white
            p-5
            shadow-sm
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-lg
            dark:border-slate-800
            dark:bg-slate-900
            dark:shadow-none
            dark:hover:bg-slate-900
          "
        >

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Active Agents
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
            {loading
              ? "..."
              : activeAgents.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
            Currently active
          </p>

        </div>

      </div>

      {/* ====================================================== */}
      {/* TASK PERFORMANCE + AGENT USAGE */}
      {/* ====================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Task Performance */}

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
            dark:shadow-none
            xl:col-span-2
          "
        >

          <div className="mb-5">

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Task Performance
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Completed and failed tasks over the last 7 days
            </p>

          </div>

          <div className="h-[320px] w-full">

            {taskData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No task data available.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <BarChart data={taskData}>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={chartGridColor}
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: chartTextColor,
                      fontSize: 12,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{
                      fill: chartTextColor,
                      fontSize: 12,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        chartTooltipBg,
                      borderColor:
                        chartTooltipBorder,
                      borderRadius: "8px",
                      color: isDark
                        ? "#E2E8F0"
                        : "#0F172A",
                    }}
                    labelStyle={{
                      color: isDark
                        ? "#E2E8F0"
                        : "#0F172A",
                    }}
                  />

                  <Legend
                    wrapperStyle={{
                      color: chartTextColor,
                    }}
                  />

                  <Bar
                    dataKey="completed"
                    name="Completed"
                    radius={[
                      5,
                      5,
                      0,
                      0,
                    ]}
                    fill="#16A34A"
                  />

                  <Bar
                    dataKey="failed"
                    name="Failed"
                    radius={[
                      5,
                      5,
                      0,
                      0,
                    ]}
                    fill="#DC2626"
                  />

                </BarChart>

              </ResponsiveContainer>
            )}

          </div>

        </div>

        {/* Agent Distribution */}

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
            dark:shadow-none
          "
        >

          <div className="mb-3">

            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Agent Usage
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Task distribution by agent
            </p>

          </div>

          <div className="h-[320px] w-full">

            {agentData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No agent usage data available.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <PieChart>

                  <Pie
                    data={agentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={95}
                    innerRadius={55}
                    paddingAngle={3}
                  >

                    {agentData.map(
                      (entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                        />
                      )
                    )}

                  </Pie>

                  <Tooltip
                    contentStyle={{
                      backgroundColor:
                        chartTooltipBg,
                      borderColor:
                        chartTooltipBorder,
                      borderRadius: "8px",
                      color: isDark
                        ? "#E2E8F0"
                        : "#0F172A",
                    }}
                    labelStyle={{
                      color: isDark
                        ? "#E2E8F0"
                        : "#0F172A",
                    }}
                  />

                  <Legend
                    wrapperStyle={{
                      color: chartTextColor,
                    }}
                  />

                </PieChart>

              </ResponsiveContainer>
            )}

          </div>

        </div>

      </div>

      {/* ====================================================== */}
      {/* SUCCESS RATE */}
      {/* ====================================================== */}

      <div
        className="
          mb-6
          rounded-xl
          border
          border-slate-200
          bg-white
          p-5
          shadow-sm
          dark:border-slate-800
          dark:bg-slate-900
          dark:shadow-none
        "
      >

        <div className="mb-5">

          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Success Rate
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Completed vs failed task rate over the last 7 days
          </p>

        </div>

        <div className="h-[300px] w-full">

          {performanceData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              No performance data available.
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart data={performanceData}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartGridColor}
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: chartTextColor,
                    fontSize: 12,
                  }}
                />

                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: chartTextColor,
                    fontSize: 12,
                  }}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor:
                      chartTooltipBg,
                    borderColor:
                      chartTooltipBorder,
                    borderRadius: "8px",
                    color: isDark
                      ? "#E2E8F0"
                      : "#0F172A",
                  }}
                  labelStyle={{
                    color: isDark
                      ? "#E2E8F0"
                      : "#0F172A",
                  }}
                  formatter={(value) => [
                    value === null ||
                    value === undefined
                      ? "-"
                      : `${value}%`,
                    "Success Rate",
                  ]}
                />

                <Line
                  type="monotone"
                  dataKey="success"
                  name="Success Rate"
                  stroke="#2563EB"
                  strokeWidth={3}
                  connectNulls={false}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />

              </LineChart>

            </ResponsiveContainer>
          )}

        </div>

      </div>

      {/* ====================================================== */}
      {/* PERFORMANCE OVERVIEW */}
      {/* ====================================================== */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Top Success Agent */}

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
            dark:shadow-none
          "
        >

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Top Success Rate
          </p>

          <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {topSuccessAgent?.name ||
              "No data"}
          </h3>

          <p className="mt-2 text-sm text-green-600 dark:text-green-400">
            {topSuccessAgent
              ? `${topSuccessAgent.successRate}% success rate`
              : "No completed or failed tasks yet"}
          </p>

        </div>

        {/* Most Active Agent */}

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
            dark:shadow-none
          "
        >

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Most Active Agent
          </p>

          <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {mostActiveAgent?.name ||
              "No data"}
          </h3>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {mostActiveAgent
              ? `${mostActiveAgent.total.toLocaleString()} tasks`
              : "No task usage yet"}
          </p>

        </div>

        {/* Agent Coverage */}

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
            dark:shadow-none
          "
        >

          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Agent Coverage
          </p>

          <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {agents.length > 0
              ? `${agentData.length}/${agents.length}`
              : "0"}
          </h3>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Agents used by at least one task
          </p>

        </div>

      </div>

      {/* ====================================================== */}
      {/* DATA LIMITATION NOTE */}
      {/* ====================================================== */}

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
          dark:shadow-none
        "
      >

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Analytics are calculated from the task and agent data available
          through the admin API. Completion-time and response-time metrics
          are not shown because the current task data does not expose a
          dedicated completion-duration or response-time field.
        </p>

      </div>

    </div>
  )
}

export default Analytics