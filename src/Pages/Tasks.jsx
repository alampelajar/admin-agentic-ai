import { useEffect, useMemo, useState } from "react"
import { ClipboardCheck, Search } from "lucide-react"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card, CardContent } from "../components/ui/card.jsx"
import { DialogFooter } from "../components/ui/dialog.jsx"
import { Input } from "../components/ui/input.jsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatusDot } from "../components/page.jsx"
import { FormDialog, RowMenu } from "../components/dialogs.jsx"

import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"

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

const normalizePriority = (priority) => {
  const value = String(priority || "").toLowerCase()

  if (value === "high") {
    return "High"
  }

  if (value === "medium") {
    return "Medium"
  }

  if (value === "low") {
    return "Low"
  }

  return (
    String(priority || "Unknown")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  )
}

const formatDateTime = (value) => {
  if (!value) {
    return "-"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return formatWib(date)
}

const normalizeTask = (task) => {
  return {
    id: task.id,
    title: task.title || "Untitled Task",
    description: task.description || "",
    status: normalizeStatus(task.status),
    label: task.label || "-",
    priority: normalizePriority(task.priority),
    createdAt: task.created_at || null,
    updatedAt: task.updated_at || null,

    user: task.user
      ? {
          id: task.user.id,
          name: task.user.name || "Unknown User",
          email: task.user.email || "-",
        }
      : null,

    agent: task.agent
      ? {
          id: task.agent.id,
          name: task.agent.name || "Unknown Agent",
          slug: task.agent.slug || "-",
        }
      : null,
  }
}

function Tasks() {
  const [tasks, setTasks] = useState([])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [priorityFilter, setPriorityFilter] = useState("All")

  const [selectedTask, setSelectedTask] = useState(null)

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")

  // ============================================================
  // LOAD TASKS
  // ============================================================

  const loadTasks = async () => {
    setLoading(true)
    setPageError("")

    try {
      const response = await apiFetch("/api/admin/tasks")

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Gagal mengambil data tasks."
        )
      }

      const tasksData = Array.isArray(data?.tasks)
        ? data.tasks
        : []

      setTasks(tasksData.map(normalizeTask))
    } catch (error) {
      console.error(
        "Gagal mengambil tasks:",
        error
      )

      setPageError(
        error.message ||
          "Gagal mengambil data tasks dari server."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  // ============================================================
  // FILTER
  // ============================================================

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchValue =
        search.toLowerCase().trim()

      const matchesSearch =
        task.title
          .toLowerCase()
          .includes(searchValue) ||
        String(task.id)
          .toLowerCase()
          .includes(searchValue) ||
        (task.agent?.name || "")
          .toLowerCase()
          .includes(searchValue) ||
        (task.user?.name || "")
          .toLowerCase()
          .includes(searchValue) ||
        (task.user?.email || "")
          .toLowerCase()
          .includes(searchValue)

      const matchesStatus =
        statusFilter === "All" ||
        task.status === statusFilter

      const matchesPriority =
        priorityFilter === "All" ||
        task.priority === priorityFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      )
    })
  }, [
    tasks,
    search,
    statusFilter,
    priorityFilter,
  ])

  // ============================================================
  // SUMMARY
  // ============================================================

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length

  const runningTasks = tasks.filter(
    (task) => task.status === "Running"
  ).length

  const pendingTasks = tasks.filter(
    (task) => task.status === "Pending"
  ).length

  const failedTasks = tasks.filter(
    (task) => task.status === "Failed"
  ).length

  // ============================================================
  // STATUS
  // ============================================================

  const statusVariant = (status) =>
    ({ Completed: "success", Running: "secondary", Pending: "warning", Failed: "destructive" })[status] || "outline"

  const priorityVariant = (priority) =>
    ({ High: "destructive", Medium: "warning" })[priority] || "outline"

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("All")
    setPriorityFilter("All")
  }

  // ============================================================
  // RETURN
  // ============================================================

  const summary = [
    { label: "Completed", value: completedTasks, hint: "Successfully completed", className: "text-emerald-600 dark:text-emerald-400" },
    { label: "Running", value: runningTasks, hint: "Currently processing", className: "text-primary" },
    { label: "Pending", value: pendingTasks, hint: "Waiting to run", className: "text-amber-700 dark:text-amber-400" },
    { label: "Failed", value: failedTasks, hint: "Need attention", className: "text-destructive" },
  ]

  return (
    <Page>
      <PageHeader title="Tasks" description="Monitor tasks from all users" />

      {pageError && <ErrorState message={pageError} onRetry={loadTasks} busy={loading} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="gap-1 py-5">
            <CardContent className="px-5">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className={`mt-2 text-3xl font-semibold tabular-nums ${item.className}`}>{loading ? "..." : item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search tasks"
              placeholder="Search tasks, users, agents..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filter by status" className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Running">Running</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger aria-label="Filter by priority" className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Priority</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredTasks.length}</span> of{" "}
            <span className="font-semibold text-foreground">{tasks.length}</span> tasks
          </p>
          {(search || statusFilter !== "All" || priorityFilter !== "All") && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {loading ? (
          <LoadingRows rows={5} label="Loading tasks" className="p-4" />
        ) : filteredTasks.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="No tasks found" className="m-4">
            {tasks.length === 0 ? "Tasks that agents run appear here." : "Try changing your search or filters."}
          </EmptyState>
        ) : (
          <Table className="min-w-240">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Task</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="max-w-72 pl-4">
                    <p className="truncate font-medium" title={task.title}>{task.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">TASK #{task.id}</p>
                  </TableCell>
                  <TableCell>
                    {task.user ? (
                      <div>
                        <p className="font-medium">{task.user.name}</p>
                        <p className="text-xs text-muted-foreground">{task.user.email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unknown User</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {task.agent ? (
                      <div>
                        <p className="font-medium">{task.agent.name}</p>
                        <p className="text-xs text-muted-foreground">{task.agent.slug}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No Agent</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(task.status)}>
                      <StatusDot tone={{ Completed: "success", Running: "primary", Pending: "warning", Failed: "danger" }[task.status] || "muted"} running={task.status === "Running"} />
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(task.createdAt)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <RowMenu icon label={`Actions for ${task.title}`} items={[{ label: "View Details", onSelect: () => setSelectedTask(task) }]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {selectedTask && (
        <FormDialog title="Task Details" subtitle="Information from the database" onClose={() => setSelectedTask(null)} className="sm:max-w-lg">
          <div>
            <h3 className="font-semibold">{selectedTask.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">TASK #{selectedTask.id}</p>
          </div>

          {selectedTask.description && (
            <p className="rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">{selectedTask.description}</p>
          )}

          <dl className="divide-y rounded-lg border text-sm">
            {[
              ["User", <div key="user" className="text-right"><p className="font-semibold">{selectedTask.user?.name || "Unknown User"}</p><p className="text-xs text-muted-foreground">{selectedTask.user?.email || "-"}</p></div>],
              ["Agent", <div key="agent" className="text-right"><p className="font-semibold">{selectedTask.agent?.name || "No Agent"}</p><p className="text-xs text-muted-foreground">{selectedTask.agent?.slug || "-"}</p></div>],
              ["Status", <Badge key="status" variant={statusVariant(selectedTask.status)}>{selectedTask.status}</Badge>],
              ["Priority", <Badge key="priority" variant={priorityVariant(selectedTask.priority)}>{selectedTask.priority}</Badge>],
              ["Label", <span key="label" className="font-medium">{selectedTask.label}</span>],
              ["Created", <span key="created" className="font-medium">{formatDateTime(selectedTask.createdAt)}</span>],
              ["Updated", <span key="updated" className="font-medium">{formatDateTime(selectedTask.updatedAt)}</span>],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTask(null)}>
              Close
            </Button>
          </DialogFooter>
        </FormDialog>
      )}
    </Page>
  )
}

export default Tasks
