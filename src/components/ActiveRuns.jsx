import { useCallback, useEffect, useState } from "react"

import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { Hammer } from "lucide-react"
import { Badge } from "./ui/badge.jsx"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.jsx"
import { Skeleton } from "./ui/skeleton.jsx"
import { EmptyState, ErrorState, StatusDot } from "./page.jsx"

// How often the list of builds in progress is refreshed while the page is visible.
const ACTIVE_REFRESH_MS = 5000

async function readJson(path, options) {
  const response = await apiFetch(path, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Request failed.")
  }
  return data
}

function Owner({ user }) {
  if (!user) return <span className="text-muted-foreground">Deleted user</span>
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">{user.name || "-"}</p>
      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
    </div>
  )
}

// Who is building a website right now and what the agent is doing. Shown on the Websites page.
export function ActiveRuns() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const data = await readJson("/api/admin/site-runs/active")
      setRuns(Array.isArray(data.runs) ? data.runs : [])
      setError("")
    } catch (err) {
      setError(err.message || "Could not load the builds in progress.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load()
    }, ACTIVE_REFRESH_MS)
    return () => clearInterval(timer)
  }, [load])

  return (
    <Card aria-labelledby="active-builds-title">
      <CardHeader>
        <CardTitle id="active-builds-title" className="text-base">
          Building now
        </CardTitle>
        <CardDescription>People building a website and what the agent is doing. Refreshes every 5 seconds.</CardDescription>
        <CardAction>
          <Badge variant="secondary" className="tabular-nums">
            {runs.length} active
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
      {error && <ErrorState title="Could not load the builds" message={error} onRetry={load} />}

      {loading ? (
        <div role="status" aria-label="Loading builds in progress">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : runs.length === 0 ? (
        <EmptyState icon={Hammer} title="Nothing in progress">
          Nobody is building a website right now.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {runs.map((run) => (
            <li key={run.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <Owner user={run.user} />
                <Badge variant={run.status === "running" ? "success" : "warning"}>
                  <StatusDot tone={run.status === "running" ? "success" : "warning"} running={run.status === "running"} />
                  {run.status === "running" ? "Agent running" : "Queued"}
                </Badge>
              </div>

              <p className="mt-3 text-sm text-foreground">
                <span className="font-medium">{run.site?.name || "Untitled website"}</span>
                <span className="text-muted-foreground"> · {run.kind === "revise" ? "Revision" : "New website"}</span>
              </p>
              {run.request && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">“{run.request}”</p>
              )}

              <ol className="mt-3 space-y-2 border-l border-border pl-4">
                {(run.steps || []).length === 0 ? (
                  <li className="text-xs text-muted-foreground">Waiting for the agent to start.</li>
                ) : (
                  run.steps.map((step, index) => (
                    <li key={`${run.id}-${index}`} className="text-sm">
                      <span className={index === 0 ? "text-foreground" : "text-muted-foreground"}>{step.summary}</span>
                      {step.status === "failed" && <span className="ml-2 text-xs text-destructive">failed</span>}
                    </li>
                  ))
                )}
              </ol>

              <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                {run.step_count} steps · {run.model_calls} model calls · started {formatWib(run.started_at || run.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
      </CardContent>
    </Card>
  )
}
