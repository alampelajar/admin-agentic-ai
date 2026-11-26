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

import { BarChart3 } from "lucide-react"
import { apiFetch } from "../lib/api"
import { Badge } from "../components/ui/badge.jsx"
import { Card } from "../components/ui/card.jsx"
import { EmptyState, ErrorState, LoadingText, Page, PageHeader, StatusDot } from "../components/page.jsx"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-3)",
  "var(--destructive)",
  "var(--muted-foreground)",
  "var(--primary)",
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
    <Page>

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <PageHeader
        title="Analytics"
        description="Monitor system performance and task analytics"
        actions={
          !loading &&
          !pageError && (
            <Badge variant="success">
              <StatusDot tone="success" running />
              Live data
            </Badge>
          )
        }
      />

      {/* ====================================================== */}
      {/* ERROR */}
      {/* ====================================================== */}

      {pageError && <ErrorState title="Could not load analytics" message={pageError} />}

      {/* ====================================================== */}
      {/* SUMMARY CARDS */}
      {/* ====================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total Tasks */}

        <Card className="gap-1 px-5 py-5">

          <p className="text-sm font-medium text-muted-foreground">
            Total Tasks
          </p>

          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {loading
              ? "..."
              : tasks.length.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            From all users
          </p>

        </Card>

        {/* Success Rate */}

        <Card className="gap-1 px-5 py-5">

          <p className="text-sm font-medium text-muted-foreground">
            Success Rate
          </p>

          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {loading
              ? "..."
              : formatPercent(
                  overallSuccessRate
                )}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Completed vs failed
          </p>

        </Card>

        {/* Failed Tasks */}

        <Card className="gap-1 px-5 py-5">

          <p className="text-sm font-medium text-muted-foreground">
            Failed Tasks
          </p>

          <p className="mt-2 text-3xl font-semibold tabular-nums text-destructive">
            {loading
              ? "..."
              : failedTasks.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Need attention
          </p>

        </Card>

        {/* Active Agents */}

        <Card className="gap-1 px-5 py-5">

          <p className="text-sm font-medium text-muted-foreground">
            Active Agents
          </p>

          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
            {loading
              ? "..."
              : activeAgents.toLocaleString()}
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Currently active
          </p>

        </Card>

      </div>

      {/* ====================================================== */}
      {/* TASK PERFORMANCE + AGENT USAGE */}
      {/* ====================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Task Performance */}

        <Card className="gap-0 px-5 py-5 xl:col-span-2">

          <div className="mb-5">

            <h2 className="text-base font-semibold">
              Task Performance
            </h2>

            <p className="text-sm text-muted-foreground">
              Completed and failed tasks over the last 7 days
            </p>

          </div>

          <div className="h-80 w-full">

            {taskData.length === 0 ? (
              loading ? (
                <LoadingText className="h-full justify-center">Loading the chart...</LoadingText>
              ) : (
                <EmptyState icon={BarChart3} title="No task data available" className="h-full justify-center">
                  Numbers appear here once agents have run tasks.
                </EmptyState>
              )
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

        </Card>

        {/* Agent Distribution */}

        <Card className="gap-0 px-5 py-5">

          <div className="mb-3">

            <h2 className="text-base font-semibold">
              Agent Usage
            </h2>

            <p className="text-sm text-muted-foreground">
              Task distribution by agent
            </p>

          </div>

          <div className="h-80 w-full">

            {agentData.length === 0 ? (
              loading ? (
                <LoadingText className="h-full justify-center">Loading the chart...</LoadingText>
              ) : (
                <EmptyState icon={BarChart3} title="No agent usage data available" className="h-full justify-center">
                  Numbers appear here once agents have run tasks.
                </EmptyState>
              )
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

        </Card>

      </div>

      {/* ====================================================== */}
      {/* SUCCESS RATE */}
      {/* ====================================================== */}

      <Card className="gap-0 px-5 py-5">

        <div className="mb-5">

          <h2 className="text-base font-semibold">
            Success Rate
          </h2>

          <p className="text-sm text-muted-foreground">
            Completed vs failed task rate over the last 7 days
          </p>

        </div>

        <div className="h-75 w-full">

          {performanceData.length === 0 ? (
            loading ? (
                <LoadingText className="h-full justify-center">Loading the chart...</LoadingText>
              ) : (
                <EmptyState icon={BarChart3} title="No performance data available" className="h-full justify-center">
                  Numbers appear here once agents have run tasks.
                </EmptyState>
              )
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

      </Card>

      {/* ====================================================== */}
      {/* PERFORMANCE OVERVIEW */}
      {/* ====================================================== */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Top Success Agent */}

        <Card className="gap-0 px-5 py-5">

          <p className="text-sm font-medium text-muted-foreground">
            Top Success Rate
          </p>

          <h3 className="mt-2 text-xl font-semibold">
            {topSuccessAgent?.name ||
              "No data"}
          </h3>

          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
            {topSuccessAgent
              ? `${topSuccessAgent.successRate}% success rate`
              : "No completed or failed tasks yet"}
          </p>

        </Card>

        {/* Most Active Agent */}

        <Card className="gap-0 px-5 py-5">

          <p className="text-sm font-medium text-muted-foreground">
            Most Active Agent
          </p>

          <h3 className="mt-2 text-xl font-semibold">
            {mostActiveAgent?.name ||
              "No data"}
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            {mostActiveAgent
              ? `${mostActiveAgent.total.toLocaleString()} tasks`
              : "No task usage yet"}
          </p>

        </Card>

        {/* Agent Coverage */}

        <Card className="gap-0 px-5 py-5">

          <p className="text-sm font-medium text-muted-foreground">
            Agent Coverage
          </p>

          <h3 className="mt-2 text-xl font-semibold">
            {agents.length > 0
              ? `${agentData.length}/${agents.length}`
              : "0"}
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Agents used by at least one task
          </p>

        </Card>

      </div>

      {/* ====================================================== */}
      {/* DATA LIMITATION NOTE */}
      {/* ====================================================== */}

      <Card className="gap-0 px-5 py-5">

        <p className="text-xs leading-5 text-muted-foreground">
          Analytics are calculated from the task and agent data available
          through the admin API. Completion-time and response-time metrics
          are not shown because the current task data does not expose a
          dedicated completion-duration or response-time field.
        </p>

      </Card>

    </Page>
  )
}

export default Analytics