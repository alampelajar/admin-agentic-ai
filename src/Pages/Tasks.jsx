import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

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

  return date.toLocaleString("id-ID")
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

  const [openMenu, setOpenMenu] = useState(null)

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  })

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

  const getStatusClass = (status) => {
    if (status === "Completed") {
      return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
    }

    if (status === "Running") {
      return "bg-secondary text-primary"
    }

    if (status === "Pending") {
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
    }

    if (status === "Failed") {
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
    }

    return "bg-muted text-muted-foreground"
  }

  const getPriorityClass = (priority) => {
    if (priority === "High") {
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
    }

    if (priority === "Medium") {
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
    }

    if (priority === "Low") {
      return "bg-muted text-muted-foreground"
    }

    return "bg-muted text-muted-foreground"
  }

  // ============================================================
  // ACTION MENU
  // ============================================================

  const toggleActionMenu = (
    event,
    taskId
  ) => {
    if (openMenu === taskId) {
      setOpenMenu(null)
      return
    }

    const buttonRect =
      event.currentTarget.getBoundingClientRect()

    const menuWidth = 160
    const menuHeight = 48
    const gap = 8
    const viewportPadding = 12

    let left =
      buttonRect.right - menuWidth

    if (left < viewportPadding) {
      left = viewportPadding
    }

    if (
      left + menuWidth >
      window.innerWidth - viewportPadding
    ) {
      left =
        window.innerWidth -
        menuWidth -
        viewportPadding
    }

    const spaceBelow =
      window.innerHeight -
      buttonRect.bottom

    const spaceAbove =
      buttonRect.top

    let top

    if (
      spaceBelow >=
      menuHeight + gap
    ) {
      top =
        buttonRect.bottom + gap
    } else if (
      spaceAbove >=
      menuHeight + gap
    ) {
      top =
        buttonRect.top -
        menuHeight -
        gap
    } else {
      top = Math.max(
        viewportPadding,
        Math.min(
          buttonRect.bottom + gap,
          window.innerHeight -
            menuHeight -
            viewportPadding
        )
      )
    }

    setMenuPosition({
      top,
      left,
    })

    setOpenMenu(taskId)
  }

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

  return (
    <div className="min-h-screen bg-muted p-6 text-foreground transition-colors duration-200">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="mb-6">
        <h1 className="text-2xl font-normal text-foreground">
          Tasks
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Monitor tasks from all users
        </p>
      </div>

      {/* ====================================================== */}
      {/* ERROR */}
      {/* ====================================================== */}

      {pageError && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-card border border-transparent bg-error-container px-4 py-3">

          <p className="text-sm font-medium text-destructive">
            {pageError}
          </p>

          <button
            onClick={loadTasks}
            className="
              shrink-0
              state-layer rounded-full transition-colors duration-200 ease-m3
              bg-destructive
              px-6
              h-10
              text-sm
              font-medium
              text-destructive-foreground
             
             
            "
          >
            Retry
          </button>

        </div>
      )}

      {/* ====================================================== */}
      {/* SUMMARY */}
      {/* ====================================================== */}

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* Completed */}

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
            Completed
          </p>

          <p className="mt-2 text-3xl font-normal text-green-700 dark:text-green-300">
            {completedTasks}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Successfully completed
          </p>
        </div>

        {/* Running */}

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
            Running
          </p>

          <p className="mt-2 text-3xl font-normal text-primary">
            {runningTasks}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Currently processing
          </p>
        </div>

        {/* Pending */}

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
            Pending
          </p>

          <p className="mt-2 text-3xl font-normal text-amber-700 dark:text-amber-300">
            {pendingTasks}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Waiting to run
          </p>
        </div>

        {/* Failed */}

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
            Failed
          </p>

          <p className="mt-2 text-3xl font-normal text-destructive">
            {failedTasks}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Need attention
          </p>
        </div>

      </div>

      {/* ====================================================== */}
      {/* MAIN CARD */}
      {/* ====================================================== */}

      <div className="overflow-hidden rounded-card border border-border bg-card dark:shadow-none">

        {/* ================================================== */}
        {/* TOOLBAR */}
        {/* ================================================== */}

        <div className="flex flex-col gap-4 border-b border-border p-5 xl:flex-row xl:items-center xl:justify-between">

          {/* Search */}

          <div className="relative w-full xl:max-w-md">

            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search tasks, users, agents..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              className="
                w-full
                rounded-field hover:border-foreground transition-colors duration-200 ease-m3
                border
                border-input
                bg-transparent
                h-14
                pl-9
                pr-4
                text-base
                text-foreground
                outline-none
               
                placeholder:text-muted-foreground
                focus:border-input
                focus:bg-card
                focus:ring-2
                focus:ring-primary
               
               
               
               
               
               
               
              "
            />

          </div>

          {/* Filters */}

          <div className="flex flex-col gap-3 sm:flex-row">

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="
                rounded-field hover:border-foreground transition-colors duration-200 ease-m3
                border
                border-input
                bg-transparent
                px-4
                h-14
                text-base
                text-foreground
                outline-none
                focus:border-input
               
               
               
               
              "
            >
              <option value="All">
                All Status
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Running">
                Running
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Failed">
                Failed
              </option>
            </select>

            <select
              value={priorityFilter}
              onChange={(event) =>
                setPriorityFilter(
                  event.target.value
                )
              }
              className="
                rounded-field hover:border-foreground transition-colors duration-200 ease-m3
                border
                border-input
                bg-transparent
                px-4
                h-14
                text-base
                text-foreground
                outline-none
                focus:border-input
               
               
               
               
              "
            >
              <option value="All">
                All Priority
              </option>

              <option value="High">
                High
              </option>

              <option value="Medium">
                Medium
              </option>

              <option value="Low">
                Low
              </option>
            </select>

          </div>

        </div>

        {/* ================================================== */}
        {/* RESULT INFO */}
        {/* ================================================== */}

        <div className="flex items-center justify-between border-b border-border px-5 py-3">

          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filteredTasks.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {tasks.length}
            </span>{" "}
            tasks
          </p>

          {(search ||
            statusFilter !== "All" ||
            priorityFilter !== "All") && (
            <button
              onClick={clearFilters}
              className="
                text-sm
                font-medium
                text-muted-foreground
                transition
                hover:text-foreground
               
               
              "
            >
              Clear filters
            </button>
          )}

        </div>

        {/* ================================================== */}
        {/* LOADING */}
        {/* ================================================== */}

        {loading ? (
          <div className="px-5 py-16 text-center">

            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />

            <p className="mt-4 text-sm text-muted-foreground">
              Loading tasks...
            </p>

          </div>
        ) : (
          <>
            {/* ================================================== */}
            {/* TABLE */}
            {/* ================================================== */}

            <div className="overflow-x-auto">

              <table className="w-full min-w-312">

                <thead>

                  <tr className="border-b border-border bg-muted">

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Task
                    </th>

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      User
                    </th>

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Agent
                    </th>

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Priority
                    </th>

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Created
                    </th>

                    <th className="px-5 py-0 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredTasks.map(
                    (task) => (
                      <tr
                        key={task.id}
                        className="
                          border-b
                          border-border
                          transition
                          hover:bg-accent
                         
                         
                        "
                      >

                        {/* Task */}

                        <td className="px-5 py-2">

                          <div>

                            <p className="font-medium text-foreground">
                              {task.title}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              TASK #{task.id}
                            </p>

                          </div>

                        </td>

                        {/* User */}

                        <td className="px-5 py-2">

                          {task.user ? (
                            <div>

                              <p className="text-sm font-medium text-foreground">
                                {task.user.name}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {task.user.email}
                              </p>

                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Unknown User
                            </span>
                          )}

                        </td>

                        {/* Agent */}

                        <td className="px-5 py-2">

                          {task.agent ? (
                            <div>

                              <p className="text-sm font-medium text-foreground">
                                {task.agent.name}
                              </p>

                              <p className="text-xs text-muted-foreground">
                                {task.agent.slug}
                              </p>

                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No Agent
                            </span>
                          )}

                        </td>

                        {/* Status */}

                        <td className="px-5 py-2">

                          <span
                            className={`
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-chip
                              px-3
                              h-8
                              text-sm
                              font-medium
                              ${getStatusClass(
                                task.status
                              )}
                            `}
                          >

                            <span className="h-1.5 w-1.5 rounded-full bg-current" />

                            {task.status}

                          </span>

                        </td>

                        {/* Priority */}

                        <td className="px-5 py-2">

                          <span
                            className={`
                              inline-flex
                              inline-flex items-center rounded-chip
                              px-3
                              h-8
                              text-sm
                              font-medium
                              ${getPriorityClass(
                                task.priority
                              )}
                            `}
                          >
                            {task.priority}
                          </span>

                        </td>

                        {/* Created */}

                        <td className="px-5 py-2 text-sm text-muted-foreground">
                          {formatDateTime(
                            task.createdAt
                          )}
                        </td>

                        {/* Action */}

                        <td className="relative px-5 py-2 text-right">

                          <button
                            onClick={(event) =>
                              toggleActionMenu(
                                event,
                                task.id
                              )
                            }
                            className="
                              inline-flex
                              h-10
                              w-10
                              items-center
                              justify-center
                              state-layer rounded-full transition-colors duration-200 ease-m3
                              text-lg
                              text-muted-foreground
                             
                             
                              hover:text-foreground
                             
                             
                             
                            "
                            aria-label={`Actions for ${task.title}`}
                          >
                            ⋮
                          </button>

                          {openMenu === task.id &&
                            createPortal(
                              <div
                                className="
                                  fixed
                                  z-[100]
                                  w-40
                                  overflow-hidden
                                  rounded-field
                                 
                                 
                                  bg-popover
                                  py-2
                                  text-left
                                  shadow-m3-2
                                 
                                 
                                "
                                style={{
                                  top: `${menuPosition.top}px`,
                                  left: `${menuPosition.left}px`,
                                }}
                              >

                                <button
                                  onClick={() => {
                                    setSelectedTask(
                                      task
                                    )
                                    setOpenMenu(null)
                                  }}
                                  className="
                                    block
                                    w-full
                                    px-4
                                    py-2.5
                                    text-left
                                    text-sm
                                    text-foreground
                                    transition
                                    hover:bg-accent
                                   
                                   
                                  "
                                >
                                  View Details
                                </button>

                              </div>,
                              document.body
                            )}

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

              {/* ================================================= */}
              {/* EMPTY STATE */}
              {/* ================================================= */}

              {filteredTasks.length === 0 && (
                <div className="px-5 py-16 text-center">

                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xl text-muted-foreground">
                    ?
                  </div>

                  <h3 className="font-semibold text-foreground">
                    No tasks found
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Try changing your search or filters.
                  </p>

                </div>
              )}

            </div>
          </>
        )}

      </div>

      {/* ====================================================== */}
      {/* TASK DETAILS MODAL */}
      {/* ====================================================== */}

      {selectedTask && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            m3-scrim
            p-4
           
          "
          onClick={() =>
            setSelectedTask(null)
          }
        >

          <div
            className="
              w-full
              max-w-lg
              rounded-dialog
              bg-surface-high
              shadow-m3-3
              dark:border
             
             
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* Header */}

            <div className="flex items-start justify-between border-b border-border p-6">

              <div>

                <h2 className="text-2xl font-normal text-foreground">
                  Task Details
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Information from the database
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedTask(null)
                }
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  state-layer rounded-full transition-colors duration-200 ease-m3
                  text-muted-foreground
                 
                 
                  hover:text-foreground
                 
                 
                 
                "
              >
                ×
              </button>

            </div>

            {/* Content */}

            <div className="max-h-full overflow-y-auto p-6">

              <h3 className="font-semibold text-foreground">
                {selectedTask.title}
              </h3>

              <p className="mt-1 text-xs text-muted-foreground">
                TASK #{selectedTask.id}
              </p>

              {selectedTask.description && (
                <div className="mt-5 rounded-card bg-muted p-4">

                  <p className="text-sm leading-6 text-muted-foreground">
                    {selectedTask.description}
                  </p>

                </div>
              )}

              <div className="mt-6 rounded-card border border-border">

                {/* User */}

                <div className="flex items-center justify-between border-b border-border px-4 py-3">

                  <span className="text-sm text-muted-foreground">
                    User
                  </span>

                  <div className="text-right">

                    <p className="text-sm font-semibold text-foreground">
                      {selectedTask.user?.name ||
                        "Unknown User"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {selectedTask.user?.email ||
                        "-"}
                    </p>

                  </div>

                </div>

                {/* Agent */}

                <div className="flex items-center justify-between border-b border-border px-4 py-3">

                  <span className="text-sm text-muted-foreground">
                    Agent
                  </span>

                  <div className="text-right">

                    <p className="text-sm font-semibold text-foreground">
                      {selectedTask.agent?.name ||
                        "No Agent"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {selectedTask.agent?.slug ||
                        "-"}
                    </p>

                  </div>

                </div>

                {/* Status */}

                <div className="flex items-center justify-between border-b border-border px-4 py-3">

                  <span className="text-sm text-muted-foreground">
                    Status
                  </span>

                  <span
                    className={`
                      inline-flex items-center rounded-chip
                      px-3
                      h-8
                      text-sm
                      font-medium
                      ${getStatusClass(
                        selectedTask.status
                      )}
                    `}
                  >
                    {selectedTask.status}
                  </span>

                </div>

                {/* Priority */}

                <div className="flex items-center justify-between border-b border-border px-4 py-3">

                  <span className="text-sm text-muted-foreground">
                    Priority
                  </span>

                  <span
                    className={`
                      inline-flex items-center rounded-chip
                      px-3
                      h-8
                      text-sm
                      font-medium
                      ${getPriorityClass(
                        selectedTask.priority
                      )}
                    `}
                  >
                    {selectedTask.priority}
                  </span>

                </div>

                {/* Label */}

                <div className="flex items-center justify-between border-b border-border px-4 py-3">

                  <span className="text-sm text-muted-foreground">
                    Label
                  </span>

                  <span className="text-sm font-medium text-foreground">
                    {selectedTask.label}
                  </span>

                </div>

                {/* Created */}

                <div className="flex items-center justify-between border-b border-border px-4 py-3">

                  <span className="text-sm text-muted-foreground">
                    Created
                  </span>

                  <span className="text-sm font-medium text-foreground">
                    {formatDateTime(
                      selectedTask.createdAt
                    )}
                  </span>

                </div>

                {/* Updated */}

                <div className="flex items-center justify-between px-4 py-3">

                  <span className="text-sm text-muted-foreground">
                    Updated
                  </span>

                  <span className="text-sm font-medium text-foreground">
                    {formatDateTime(
                      selectedTask.updatedAt
                    )}
                  </span>

                </div>

              </div>

              {/* Close */}

              <button
                onClick={() =>
                  setSelectedTask(null)
                }
                className="
                  mt-6
                  w-full
                  state-layer rounded-full transition-colors duration-200 ease-m3
                  bg-primary
                  px-6
                  h-10
                  text-sm
                  font-medium
                  text-primary-foreground
                 
                 
                 
                 
                 
                "
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default Tasks