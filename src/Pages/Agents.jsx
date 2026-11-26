import { useEffect, useMemo, useState } from "react"
import { Bot, Search } from "lucide-react"

import { apiFetch } from "../lib/api"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card } from "../components/ui/card.jsx"
import { DialogFooter } from "../components/ui/dialog.jsx"
import { Input } from "../components/ui/input.jsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.jsx"
import { Separator } from "../components/ui/separator.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatusDot } from "../components/page.jsx"
import { FormDialog, RowMenu } from "../components/dialogs.jsx"

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

  const [selectedAgent, setSelectedAgent] = useState(null)

  // ============================================================
  // LOAD AGENTS
  // ============================================================

  const loadAgents = async () => {
    setLoading(true)
    setPageError("")

    try {
      const response = await apiFetch("/api/admin/agent-catalog")

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
  // CLEAR FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("All")
  }

  // ============================================================
  // RETURN
  // ============================================================

  const statusTone = (status) =>
    status === "Running" || status === "Active" ? "success" : status === "Idle" ? "warning" : "muted"

  return (
    <Page>
      <PageHeader
        title="Agents"
        description={
          loading
            ? "Loading agents..."
            : `${agents.length} ${agents.length === 1 ? "agent" : "agents"}, ${activeAgents} active, ${runningAgents} running now, ${totalModels} ${totalModels === 1 ? "model" : "models"} connected.`
        }
      />

      {pageError && <ErrorState message={pageError} onRetry={loadAgents} busy={loading} />}

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search agents"
              placeholder="Search by name, slug, ID or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by status" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Running">Running</SelectItem>
              <SelectItem value="Idle">Idle</SelectItem>
              <SelectItem value="Stopped">Stopped</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <p className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            {filteredAgents.length} of {agents.length}
            {(search || statusFilter !== "All") && (
              <Button variant="link" size="sm" className="h-auto px-0" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </p>
        </div>

        {loading ? (
          <LoadingRows rows={4} label="Loading agents" className="p-4" />
        ) : filteredAgents.length === 0 ? (
          <EmptyState icon={Bot} title="No agents found" className="m-4">
            {agents.length === 0 ? "Agents appear here once they are set up in the backend." : "Try changing your search or filter."}
          </EmptyState>
        ) : (
          <Table className="min-w-190">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Models</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="max-w-md pl-4">
                    <p className="truncate font-medium">{agent.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {agent.slug} · #{agent.id}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <StatusDot tone={statusTone(agent.status)} running={agent.status === "Running"} />
                      {agent.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.isActive ? "success" : "outline"}>{agent.isActive ? "Yes" : "No"}</Badge>
                  </TableCell>
                  <TableCell className="max-w-64 text-muted-foreground">
                    {agent.models.length === 0 ? (
                      "–"
                    ) : (
                      <span className="block truncate" title={agent.models.map((model) => model.name).join("\n")}>
                        {agent.models.slice(0, 2).map((model) => model.name).join(", ")}
                        {agent.models.length > 2 && ` +${agent.models.length - 2}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <RowMenu icon label={`Actions for ${agent.name}`} items={[{ label: "View details", onSelect: () => setSelectedAgent(agent) }]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {selectedAgent && (
        <FormDialog title={selectedAgent.name} subtitle={selectedAgent.slug} onClose={() => setSelectedAgent(null)} className="sm:max-w-lg">
          {selectedAgent.description && <p className="text-sm leading-6">{selectedAgent.description}</p>}

          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Agent ID</dt>
            <dd className="text-right tabular-nums">#{selectedAgent.id}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="text-right">
              <span className="inline-flex items-center gap-2">
                <StatusDot tone={statusTone(selectedAgent.status)} />
                {selectedAgent.status}
              </span>
            </dd>
            <dt className="text-muted-foreground">Active</dt>
            <dd className="text-right">{selectedAgent.isActive ? "Yes" : "No"}</dd>
          </dl>

          <Separator />
          <h3 className="text-sm font-semibold">Models ({selectedAgent.models.length})</h3>
          {selectedAgent.models.length === 0 ? (
            <p className="text-sm text-muted-foreground">No models connected.</p>
          ) : (
            <ul className="divide-y">
              {selectedAgent.models.map((model) => (
                <li key={model.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{model.name}</p>
                      {model.model_id !== model.name && <p className="truncate text-muted-foreground">{model.model_id}</p>}
                    </div>
                    <span className="shrink-0 text-muted-foreground">{model.provider?.name || "Unknown provider"}</span>
                  </div>
                  {model.description && <p className="mt-2 text-muted-foreground">{model.description}</p>}
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedAgent(null)}>
              Close
            </Button>
          </DialogFooter>
        </FormDialog>
      )}
    </Page>
  )
}

export default Agents
