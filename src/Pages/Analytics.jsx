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
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-3)",
  "var(--destructive)",
  "var(--muted-foreground)",
  "var(--tertiary)",
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


  const chartTextColor = "var(--muted-foreground)"

  const chartGridColor = "var(--border)"

  const chartTooltipBg = "var(--popover)"

  const chartTooltipBorder = "var(--border)"

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
        bg-muted
        p-6
        text-foreground
        transition-colors
        duration-200
       
       
      "
    >

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="mb-6 flex items-start justify-between gap-4">

        <div>

          <h1 className="text-2xl font-normal text-foreground">
            Analytics
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Monitor system performance and task analytics
          </p>

        </div>

        {!loading && !pageError && (
          <span
            className="
              inline-flex
              items-center
              gap-2
              rounded-chip
              bg-green-100
              px-3
              h-8
              text-sm
              font-medium
              text-green-700
              dark:bg-green-950/50
              dark:text-green-300
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
            rounded-card
            border
            border-transparent
            bg-error-container
            px-4
            py-3
           
           
          "
        >

          <p className="text-sm font-medium text-destructive">
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
            rounded-dialog
            border
            border-border
            bg-surface-high
            p-5
           
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-m3-2
           
           
            dark:shadow-none
           
          "
        >

          <p className="text-sm font-medium text-muted-foreground">
            Total Tasks
          </p>

          <p className="mt-2 text-3xl font-normal text-foreground">
            {loading
              ? "..."
              : tasks.length.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            From all users
          </p>

        </div>

        {/* Success Rate */}

        <div
          className="
            rounded-dialog
            border
            border-border
            bg-surface-high
            p-5
           
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-m3-2
           
           
            dark:shadow-none
           
          "
        >

          <p className="text-sm font-medium text-muted-foreground">
            Success Rate
          </p>

          <p className="mt-2 text-3xl font-normal text-foreground">
            {loading
              ? "..."
              : formatPercent(
                  overallSuccessRate
                )}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Completed vs failed
          </p>

        </div>

        {/* Failed Tasks */}

        <div
          className="
            rounded-dialog
            border
            border-border
            bg-surface-high
            p-5
           
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-m3-2
           
           
            dark:shadow-none
           
          "
        >

          <p className="text-sm font-medium text-muted-foreground">
            Failed Tasks
          </p>

          <p className="mt-2 text-3xl font-normal text-destructive">
            {loading
              ? "..."
              : failedTasks.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Need attention
          </p>

        </div>

        {/* Active Agents */}

        <div
          className="
            rounded-dialog
            border
            border-border
            bg-surface-high
            p-5
           
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:shadow-m3-2
           
           
            dark:shadow-none
           
          "
        >

          <p className="text-sm font-medium text-muted-foreground">
            Active Agents
          </p>

          <p className="mt-2 text-3xl font-normal text-foreground">
            {loading
              ? "..."
              : activeAgents.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
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
            rounded-card
            border
            border-border
            bg-card
            p-5
           
           
           
            dark:shadow-none
            xl:col-span-2
          "
        >

          <div className="mb-5">

            <h2 className="text-lg font-semibold text-foreground">
              Task Performance
            </h2>

            <p className="text-sm text-muted-foreground">
              Completed and failed tasks over the last 7 days
            </p>

          </div>

          <div className="h-80 w-full">

            {taskData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
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
                      color: "var(--popover-foreground)",
                    }}
                    labelStyle={{
                      color: "var(--popover-foreground)",
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
                    fill="var(--chart-4)"
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
                    fill="var(--destructive)"
                  />

                </BarChart>

              </ResponsiveContainer>
            )}

          </div>

        </div>

        {/* Agent Distribution */}

        <div
          className="
            rounded-card
            border
            border-border
            bg-card
            p-5
           
           
           
            dark:shadow-none
          "
        >

          <div className="mb-3">

            <h2 className="text-lg font-semibold text-foreground">
              Agent Usage
            </h2>

            <p className="text-sm text-muted-foreground">
              Task distribution by agent
            </p>

          </div>

          <div className="h-80 w-full">

            {agentData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
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
                      color: "var(--popover-foreground)",
                    }}
                    labelStyle={{
                      color: "var(--popover-foreground)",
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
          rounded-card
          border
          border-border
          bg-card
          p-5
         
         
         
          dark:shadow-none
        "
      >

        <div className="mb-5">

          <h2 className="text-lg font-semibold text-foreground">
            Success Rate
          </h2>

          <p className="text-sm text-muted-foreground">
            Completed vs failed task rate over the last 7 days
          </p>

        </div>

        <div className="h-75 w-full">

          {performanceData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
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
                    color: "var(--popover-foreground)",
                  }}
                  labelStyle={{
                    color: "var(--popover-foreground)",
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
                  stroke="var(--chart-1)"
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
            rounded-card
            border
            border-border
            bg-card
            p-5
           
           
           
            dark:shadow-none
          "
        >

          <p className="text-sm font-medium text-muted-foreground">
            Top Success Rate
          </p>

          <h3 className="mt-2 text-xl font-medium text-foreground">
            {topSuccessAgent?.name ||
              "No data"}
          </h3>

          <p className="mt-2 text-sm text-green-700 dark:text-green-300">
            {topSuccessAgent
              ? `${topSuccessAgent.successRate}% success rate`
              : "No completed or failed tasks yet"}
          </p>

        </div>

        {/* Most Active Agent */}

        <div
          className="
            rounded-card
            border
            border-border
            bg-card
            p-5
           
           
           
            dark:shadow-none
          "
        >

          <p className="text-sm font-medium text-muted-foreground">
            Most Active Agent
          </p>

          <h3 className="mt-2 text-xl font-medium text-foreground">
            {mostActiveAgent?.name ||
              "No data"}
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            {mostActiveAgent
              ? `${mostActiveAgent.total.toLocaleString()} tasks`
              : "No task usage yet"}
          </p>

        </div>

        {/* Agent Coverage */}

        <div
          className="
            rounded-card
            border
            border-border
            bg-card
            p-5
           
           
           
            dark:shadow-none
          "
        >

          <p className="text-sm font-medium text-muted-foreground">
            Agent Coverage
          </p>

          <h3 className="mt-2 text-xl font-medium text-foreground">
            {agents.length > 0
              ? `${agentData.length}/${agents.length}`
              : "0"}
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
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
          rounded-card
          border
          border-border
          bg-card
          p-5
         
         
         
          dark:shadow-none
        "
      >

        <p className="text-xs leading-5 text-muted-foreground">
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