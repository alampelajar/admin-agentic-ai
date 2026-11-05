import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"

import { apiFetch } from "../lib/api"

const normalizeStatus = (status) => {
  if (!status) {
    return "Unknown"
  }

  const value = String(status).toLowerCase()

  if (value === "running") {
    return "Running"
  }

  if (value === "idle") {
    return "Idle"
  }

  if (value === "stopped") {
    return "Stopped"
  }

  if (value === "active") {
    return "Active"
  }

  if (value === "inactive") {
    return "Inactive"
  }

  return (
    String(status).charAt(0).toUpperCase() +
    String(status).slice(1)
  )
}

const normalizeAgent = (agent) => {
  return {
    id: agent.id,
    slug: agent.slug || "-",
    name: agent.name || "Unnamed Agent",
    description: agent.description || "-",
    status: normalizeStatus(agent.status),
    isActive: Boolean(agent.is_active),
    models: Array.isArray(agent.models)
      ? agent.models
      : [],
  }
}

function Agents() {
  const [agents, setAgents] = useState([])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")

  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState("")

  const [openMenu, setOpenMenu] = useState(null)

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  })

  const [selectedAgent, setSelectedAgent] = useState(null)

  // ============================================================
  // LOAD AGENTS
  // ============================================================

  const loadAgents = async () => {
    setLoading(true)
    setPageError("")

    try {
      const response = await apiFetch("/api/agents")

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Gagal mengambil data agents."
        )
      }

      const agentsData = Array.isArray(data?.agents)
        ? data.agents
        : []

      setAgents(
        agentsData.map(normalizeAgent)
      )
    } catch (error) {
      console.error(
        "Gagal mengambil agents:",
        error
      )

      setPageError(
        error.message ||
          "Gagal mengambil data agents dari server."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
  }, [])

  // ============================================================
  // FILTER
  // ============================================================

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const searchValue =
        search.toLowerCase().trim()

      const matchesSearch =
        agent.name
          .toLowerCase()
          .includes(searchValue) ||
        agent.slug
          .toLowerCase()
          .includes(searchValue) ||
        String(agent.id)
          .toLowerCase()
          .includes(searchValue) ||
        agent.description
          .toLowerCase()
          .includes(searchValue)

      const matchesStatus =
        statusFilter === "All" ||
        agent.status === statusFilter

      return (
        matchesSearch &&
        matchesStatus
      )
    })
  }, [agents, search, statusFilter])

  // ============================================================
  // SUMMARY
  // ============================================================

  const activeAgents = agents.filter(
    (agent) => agent.isActive
  ).length

  const runningAgents = agents.filter(
    (agent) => agent.status === "Running"
  ).length

  const totalModels = agents.reduce(
    (total, agent) =>
      total + agent.models.length,
    0
  )

  // ============================================================
  // ACTION MENU
  // ============================================================

  const toggleActionMenu = (
    event,
    agentId
  ) => {
    if (openMenu === agentId) {
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

    setOpenMenu(agentId)
  }

  // ============================================================
  // CLEAR FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("All")
  }

  // ============================================================
  // RETURN
  // ============================================================

  const statusDot = (status) =>
    status === "Running" || status === "Active"
      ? "bg-green-600"
      : status === "Idle"
        ? "bg-amber-500"
        : "bg-muted-foreground"

  const controlClass =
    "h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading
            ? "Loading agents..."
            : `${agents.length} ${agents.length === 1 ? "agent" : "agents"}, ${activeAgents} active, ${runningAgents} running now, ${totalModels} ${totalModels === 1 ? "model" : "models"} connected.`}
        </p>
      </div>

      {pageError && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-lg bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">{pageError}</p>
          <button type="button" onClick={loadAgents} className="text-sm font-medium underline-offset-4 hover:underline">
            Retry
          </button>
        </div>
      )}

      <section className="rounded-xl bg-card text-card-foreground">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <input
            type="search"
            aria-label="Search agents"
            placeholder="Search by name, slug, ID or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={`${controlClass} min-w-0 flex-1 basis-64`}
          />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={controlClass}
          >
            <option value="All">All statuses</option>
            <option value="Running">Running</option>
            <option value="Idle">Idle</option>
            <option value="Stopped">Stopped</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <p className="ml-auto text-sm text-muted-foreground">
            {filteredAgents.length} of {agents.length}
            {(search || statusFilter !== "All") && (
              <button type="button" onClick={clearFilters} className="ml-3 font-medium text-foreground underline-offset-4 hover:underline">
                Clear filters
              </button>
            )}
          </p>
        </div>

        {loading ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">Loading agents...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-4 py-2.5 text-sm font-normal normal-case tracking-normal">Agent</th>
                  <th className="px-4 py-2.5 text-sm font-normal normal-case tracking-normal">Status</th>
                  <th className="px-4 py-2.5 text-sm font-normal normal-case tracking-normal">Active</th>
                  <th className="px-4 py-2.5 text-sm font-normal normal-case tracking-normal">Models</th>
                  <th className="w-12 px-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="transition-colors hover:bg-muted/60">
                    <td className="max-w-md px-4 py-3">
                      <p className="truncate font-medium">{agent.name}</p>
                      <p className="truncate text-muted-foreground">
                        {agent.slug} · #{agent.id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <span aria-hidden="true" className={`size-2 rounded-full ${statusDot(agent.status)}`} />
                        {agent.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${agent.isActive ? "" : "text-muted-foreground"}`}>
                      {agent.isActive ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {agent.models.length === 0 ? (
                        "–"
                      ) : (
                        <span title={agent.models.map((model) => model.name).join("\n")}>
                          {agent.models.slice(0, 2).map((model) => model.name).join(", ")}
                          {agent.models.length > 2 && ` +${agent.models.length - 2}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(event) => toggleActionMenu(event, agent.id)}
                        aria-label={`Actions for ${agent.name}`}
                        aria-expanded={openMenu === agent.id}
                        className="size-8 rounded-lg text-lg leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        ⋮
                      </button>
                      {openMenu === agent.id &&
                        createPortal(
                          <div
                            role="menu"
                            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                            className="fixed z-50 w-40 rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted"
                              onClick={() => {
                                setSelectedAgent(agent)
                                setOpenMenu(null)
                              }}
                            >
                              View details
                            </button>
                          </div>,
                          document.body
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAgents.length === 0 && (
              <div className="px-4 py-12 text-center">
                <h2 className="text-base font-semibold">No agents found</h2>
                <p className="mt-1 text-sm text-muted-foreground">Try changing your search or filter.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {selectedAgent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedAgent(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="agent-details-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-6 text-card-foreground shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="agent-details-title" className="truncate text-lg font-semibold">{selectedAgent.name}</h2>
                <p className="truncate text-sm text-muted-foreground">{selectedAgent.slug}</p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelectedAgent(null)}
                className="size-8 shrink-0 rounded-lg text-xl leading-none text-muted-foreground hover:bg-muted"
              >
                ×
              </button>
            </div>

            <p className="mt-4 text-sm leading-6">{selectedAgent.description}</p>

            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Agent ID</dt>
              <dd className="text-right tabular-nums">#{selectedAgent.id}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-right">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className={`size-2 rounded-full ${statusDot(selectedAgent.status)}`} />
                  {selectedAgent.status}
                </span>
              </dd>
              <dt className="text-muted-foreground">Active</dt>
              <dd className="text-right">{selectedAgent.isActive ? "Yes" : "No"}</dd>
            </dl>

            <h3 className="mt-6 text-sm font-semibold">Models ({selectedAgent.models.length})</h3>
            {selectedAgent.models.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No models connected.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {selectedAgent.models.map((model) => (
                  <li key={model.id} className="py-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{model.name}</p>
                        {model.model_id !== model.name && (
                          <p className="truncate text-muted-foreground">{model.model_id}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-muted-foreground">{model.provider?.name || "Unknown provider"}</span>
                    </div>
                    {model.description && <p className="mt-2 text-muted-foreground">{model.description}</p>}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="h-9 rounded-lg border border-input bg-card px-4 text-sm font-medium transition-colors hover:bg-muted"
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

export default Agents
