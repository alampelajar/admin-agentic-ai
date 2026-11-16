import { useEffect, useMemo, useState } from "react"

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

const formatDateTime = (value) => {
  const date = parseDate(value)

  if (!date) {
    return "-"
  }

  return formatWib(date)
}

const formatRelativeTime = (value) => {
  const date = parseDate(value)

  if (!date) {
    return "-"
  }

  const diffMs =
    Date.now() - date.getTime()

  if (diffMs < 60 * 1000) {
    return "just now"
  }

  const minutes = Math.floor(
    diffMs / (60 * 1000)
  )

  if (minutes < 60) {
    return `${minutes} min ago`
  }

  const hours = Math.floor(
    minutes / 60
  )

  if (hours < 24) {
    return `${hours} hour${
      hours > 1 ? "s" : ""
    } ago`
  }

  const days = Math.floor(
    hours / 24
  )

  if (days < 7) {
    return `${days} day${
      days > 1 ? "s" : ""
    } ago`
  }

  return formatDateTime(value)
}

const getTaskLogLevel = (status) => {
  if (status === "Failed") {
    return "ERROR"
  }

  return "INFO"
}

const getTaskLogAction = (status) => {
  if (status === "Completed") {
    return "Task completed"
  }

  if (status === "Failed") {
    return "Task failed"
  }

  if (status === "Running") {
    return "Task running"
  }

  if (status === "Pending") {
    return "Task pending"
  }

  return "Task updated"
}

const buildLogs = (users, tasks) => {
  const logs = []

  users.forEach((user) => {
    if (!user.created_at) {
      return
    }

    logs.push({
      id: `user-${user.id}`,
      time: user.created_at,
      level: "INFO",
      source: "System",
      action: "User registered",
      message: `${user.name || "Unknown User"} (${user.email || "-"}) registered on the platform.`,
      type: "user",
    })
  })

  tasks.forEach((task) => {
    const status = normalizeStatus(
      task.status
    )

    const agentName =
      task.agent?.name ||
      "No Agent"

    const userName =
      task.user?.name ||
      "Unknown User"

    const timestamp =
      task.updated_at ||
      task.created_at

    if (!timestamp) {
      return
    }

    logs.push({
      id: `task-${task.id}`,
      time: timestamp,
      level: getTaskLogLevel(status),
      source: agentName,
      action: getTaskLogAction(status),
      message: `${task.title || "Untitled Task"} • User: ${userName}`,
      type: "task",
      taskId: task.id,
      userId: task.user?.id || null,
      agentId: task.agent?.id || null,
      status,
    })
  })

  return logs
    .sort((a, b) => {
      const dateA = parseDate(a.time)
      const dateB = parseDate(b.time)

      if (!dateA || !dateB) {
        return 0
      }

      return dateB - dateA
    })
    .slice(0, 200)
}

const mapAuditLog = (entry) => {
  const actionLabels = {
    "model.deleted": "Model deleted",
    "user.account_deleted": "Account deleted",
    "user.deleted_by_admin": "User deleted by admin",
    "user.password_changed": "Password changed",
  }
  const warningActions = new Set([
    "model.deleted",
    "user.account_deleted",
    "user.deleted_by_admin",
  ])
  const action = String(entry.action || "system.event")

  return {
    id: `audit-${entry.id}`,
    time: entry.created_at,
    level: warningActions.has(action) ? "WARNING" : "INFO",
    source: entry.actor_name || entry.actor_email || "System",
    action: actionLabels[action] || action.replace(/[._]/g, " "),
    message: entry.message || `${entry.entity_type || "System"}: ${entry.entity_name || "-"}`,
    type: "audit",
    actionCode: action,
    entityType: entry.entity_type,
    entityId: entry.entity_id,
    entityName: entry.entity_name,
    actorEmail: entry.actor_email,
    actorRole: entry.actor_role,
  }
}

function Logs() {
  const [logs, setLogs] = useState([])

  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState("All")
  const [sourceFilter, setSourceFilter] = useState("All")

  const [selectedLog, setSelectedLog] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [pageError, setPageError] =
    useState("")

  const loadLogs = async () => {
    setLoading(true)
    setPageError("")

    try {
      const [usersResponse, tasksResponse, auditResponse] = await Promise.all([
        apiFetch("/api/admin/users"),
        apiFetch("/api/admin/tasks"),
        apiFetch("/api/admin/logs"),
      ])

      const [usersData, tasksData, auditData] = await Promise.all([
        usersResponse.json().catch(() => ({})),
        tasksResponse.json().catch(() => ({})),
        auditResponse.json().catch(() => ({})),
      ])

      if (!usersResponse.ok) {
        throw new Error(usersData?.error || usersData?.message || "Gagal mengambil data users.")
      }
      if (!tasksResponse.ok) {
        throw new Error(tasksData?.error || tasksData?.message || "Gagal mengambil data tasks.")
      }
      if (!auditResponse.ok || !auditData?.ok) {
        throw new Error(auditData?.error || auditData?.message || "Gagal mengambil audit logs. Pastikan backend sudah diperbarui.")
      }

      const users = Array.isArray(usersData?.users) ? usersData.users : []
      const tasks = Array.isArray(tasksData?.tasks) ? tasksData.tasks : []
      const auditEntries = Array.isArray(auditData?.logs) ? auditData.logs : []
      const combinedLogs = [
        ...auditEntries.map(mapAuditLog),
        ...buildLogs(users, tasks),
      ]

      combinedLogs.sort((a, b) => {
        const dateA = parseDate(a.time)
        const dateB = parseDate(b.time)
        if (!dateA || !dateB) return 0
        return dateB - dateA
      })
      setLogs(combinedLogs.slice(0, 500))
    } catch (error) {
      console.error("Gagal mengambil logs:", error)
      setPageError(error.message || "Gagal mengambil activity logs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const sourceOptions = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          logs.map((log) => log.source)
        )
      ).sort(),
    ]
  }, [logs])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchValue =
        search.toLowerCase().trim()

      const matchesSearch =
        log.source
          .toLowerCase()
          .includes(searchValue) ||
        log.action
          .toLowerCase()
          .includes(searchValue) ||
        log.message
          .toLowerCase()
          .includes(searchValue) ||
        log.time
          .toLowerCase()
          .includes(searchValue)

      const matchesLevel =
        levelFilter === "All" ||
        log.level === levelFilter

      const matchesSource =
        sourceFilter === "All" ||
        log.source === sourceFilter

      return (
        matchesSearch &&
        matchesLevel &&
        matchesSource
      )
    })
  }, [
    logs,
    search,
    levelFilter,
    sourceFilter,
  ])

  const infoCount = logs.filter(
    (log) => log.level === "INFO"
  ).length

  const warningCount = logs.filter(
    (log) => log.level === "WARNING"
  ).length

  const errorCount = logs.filter(
    (log) => log.level === "ERROR"
  ).length

  const getLevelClass = (level) => {
    if (level === "INFO") {
      return "bg-secondary text-primary"
    }

    if (level === "WARNING") {
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
    }

    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
  }

  return (
    <div className="min-h-screen bg-muted p-6 text-foreground transition-colors duration-200">

      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <h1 className="text-2xl font-normal text-foreground">
            Logs
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Pantau aktivitas pengguna, penghapusan model, dan perubahan keamanan akun
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="
            state-layer rounded-full transition-colors duration-200 ease-m3
            border
            border-input
            bg-transparent
            px-6
            h-10
            text-sm
            font-medium
            text-primary
           
           
            disabled:cursor-not-allowed
            disabled:border-foreground/12 disabled:text-foreground/38
           
           
           
           
          "
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </div>

      {/* ERROR */}

      {pageError && (
        <div className="
          mb-6
          flex
          items-center
          justify-between
          gap-4
          rounded-card
          border
          border-transparent
          bg-error-container
          px-4
          py-3
         
         
        ">

          <p className="text-sm font-medium text-destructive">
            {pageError}
          </p>

          <button
            onClick={loadLogs}
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

      {/* SUMMARY */}

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total */}

        <div className="
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
        ">
          <p className="text-sm font-medium text-muted-foreground">
            Total Logs
          </p>

          <p className="mt-2 text-3xl font-normal text-foreground">
            {loading ? "..." : logs.length}
          </p>
        </div>

        {/* Info */}

        <div className="
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
        ">
          <p className="text-sm font-medium text-muted-foreground">
            Info
          </p>

          <p className="mt-2 text-3xl font-normal text-primary">
            {loading ? "..." : infoCount}
          </p>
        </div>

        {/* Warning */}

        <div className="
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
        ">
          <p className="text-sm font-medium text-muted-foreground">
            Warnings
          </p>

          <p className="mt-2 text-3xl font-normal text-amber-700 dark:text-amber-300">
            {loading
              ? "..."
              : warningCount}
          </p>
        </div>

        {/* Errors */}

        <div className="
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
        ">
          <p className="text-sm font-medium text-muted-foreground">
            Errors
          </p>

          <p className="mt-2 text-3xl font-normal text-destructive">
            {loading ? "..." : errorCount}
          </p>
        </div>

      </div>

      {/* LOGS CARD */}

      <div className="
        overflow-hidden
        rounded-card
        border
        border-border
        bg-card
       
       
       
        dark:shadow-none
      ">

        {/* TOOLBAR */}

        <div className="
          flex
          flex-col
          gap-4
          border-b
          border-border
          p-5
          xl:flex-row
          xl:items-center
          xl:justify-between
         
        ">

          {/* Search */}

          <div className="relative w-full xl:max-w-md">

            <span className="
              pointer-events-none
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-muted-foreground
             
            ">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Search logs..."
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
              value={levelFilter}
              onChange={(event) =>
                setLevelFilter(
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
                All Levels
              </option>

              <option value="INFO">
                Info
              </option>

              <option value="WARNING">
                Warning
              </option>

              <option value="ERROR">
                Error
              </option>
            </select>

            <select
              value={sourceFilter}
              onChange={(event) =>
                setSourceFilter(
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
              {sourceOptions.map(
                (source) => (
                  <option
                    key={source}
                    value={source}
                  >
                    {source === "All"
                      ? "All Sources"
                      : source}
                  </option>
                )
              )}
            </select>

          </div>

        </div>

        {/* RESULT INFO */}

        <div className="
          border-b
          border-border
          px-5
          py-3
         
        ">

          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filteredLogs.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">
              {logs.length}
            </span>{" "}
            logs
          </p>

        </div>

        {/* LOADING */}

        {loading ? (
          <div className="px-5 py-16 text-center">

            <div className="
              mx-auto
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-border
              border-t-primary
             
             
            " />

            <p className="mt-4 text-sm text-muted-foreground">
              Loading activity logs...
            </p>

          </div>
        ) : (
          <>
            {/* TABLE */}

            <div className="overflow-x-auto">

              <table className="w-full min-w-262">

                <thead>

                  <tr className="
                    border-b
                    border-border
                    bg-muted
                   
                   
                  ">

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Time
                    </th>

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Level
                    </th>

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Source
                    </th>

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>

                    <th className="px-5 py-0 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Message
                    </th>

                    <th className="px-5 py-0 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Action
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredLogs.map(
                    (log) => (
                      <tr
                        key={log.id}
                        className="
                          border-b
                          border-border
                          transition
                          hover:bg-accent
                         
                         
                        "
                      >

                        {/* Time */}

                        <td className="px-5 py-2">

                          <div>

                            <p className="font-mono text-sm text-muted-foreground">
                              {formatRelativeTime(
                                log.time
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDateTime(
                                log.time
                              )}
                            </p>

                          </div>

                        </td>

                        {/* Level */}

                        <td className="px-5 py-2">

                          <span
                            className={`
                              inline-flex
                              inline-flex items-center rounded-chip
                              px-3
                              h-8
                              text-sm
                              font-medium
                              ${getLevelClass(
                                log.level
                              )}
                            `}
                          >
                            {log.level}
                          </span>

                        </td>

                        {/* Source */}

                        <td className="px-5 py-2 text-sm font-medium text-foreground">
                          {log.source}
                        </td>

                        {/* Action */}

                        <td className="px-5 py-2 text-sm text-foreground">
                          {log.action}
                        </td>

                        {/* Message */}

                        <td className="max-w-xl px-5 py-2 text-sm text-muted-foreground">
                          {log.message}
                        </td>

                        {/* Details */}

                        <td className="px-5 py-2 text-right">

                          <button
                            onClick={() =>
                              setSelectedLog(
                                log
                              )
                            }
                            className="
                              state-layer rounded-full transition-colors duration-200 ease-m3
                              px-3
                              h-10
                              text-sm
                              font-medium
                              text-muted-foreground
                             
                             
                              hover:text-foreground
                             
                             
                             
                            "
                          >
                            Details
                          </button>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

              {/* EMPTY STATE */}

              {filteredLogs.length ===
                0 && (
                <div className="px-5 py-16 text-center">

                  <div className="
                    mx-auto
                    mb-3
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-muted
                    text-xl
                    text-muted-foreground
                   
                   
                  ">
                    ?
                  </div>

                  <h3 className="font-semibold text-foreground">
                    No logs found
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Try changing your search
                    or filters.
                  </p>

                </div>
              )}

            </div>
          </>
        )}

      </div>

      {/* LOG DETAILS MODAL */}

      {selectedLog && (
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
            setSelectedLog(null)
          }
        >

          <div
            className="
              w-full
              max-w-lg
              rounded-dialog
              border
              border-transparent
              bg-surface-high
              p-6
              shadow-m3-3
             
             
            "
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="flex items-start justify-between">

              <div>

                <h2 className="text-2xl font-normal text-foreground">
                  Log Details
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  Detail aktivitas yang tersimpan di database audit
                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedLog(null)
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

            <div className="mt-6 space-y-4">

              <div className="
                flex
                items-center
                justify-between
                border-b
                border-border
                pb-3
               
              ">

                <span className="text-sm text-muted-foreground">
                  Time
                </span>

                <span className="font-mono text-sm text-foreground">
                  {formatDateTime(
                    selectedLog.time
                  )}
                </span>

              </div>

              <div className="
                flex
                items-center
                justify-between
                border-b
                border-border
                pb-3
               
              ">

                <span className="text-sm text-muted-foreground">
                  Level
                </span>

                <span
                  className={`
                    inline-flex items-center rounded-chip
                    px-3
                    h-8
                    text-sm
                    font-medium
                    ${getLevelClass(
                      selectedLog.level
                    )}
                  `}
                >
                  {selectedLog.level}
                </span>

              </div>

              <div className="
                flex
                items-center
                justify-between
                border-b
                border-border
                pb-3
               
              ">

                <span className="text-sm text-muted-foreground">
                  Source
                </span>

                <span className="text-sm font-medium text-foreground">
                  {selectedLog.source}
                </span>

              </div>

              <div className="
                flex
                items-center
                justify-between
                border-b
                border-border
                pb-3
               
              ">

                <span className="text-sm text-muted-foreground">
                  Action
                </span>

                <span className="text-sm font-medium text-foreground">
                  {selectedLog.action}
                </span>

              </div>

              <div>

                <p className="mb-2 text-sm text-muted-foreground">
                  Message
                </p>

                <div className="
                  rounded-card
                  bg-muted
                  p-4
                  text-sm
                  leading-6
                  text-foreground
                 
                 
                ">
                  {selectedLog.message}
                </div>

              </div>

            </div>

            <button
              onClick={() =>
                setSelectedLog(null)
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
      )}

    </div>
  )
}

export default Logs