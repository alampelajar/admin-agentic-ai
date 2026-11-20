import { useCallback, useEffect, useState } from "react"

import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"

// How often the list of builds in progress is refreshed while the page is visible.
const ACTIVE_REFRESH_MS = 5000

const chip = "inline-flex h-8 items-center gap-2 rounded-chip px-3 text-sm font-medium"

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
    <section className="rounded-card border border-border bg-card p-5" aria-labelledby="active-builds-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="active-builds-title" className="text-base font-medium text-foreground">
            Building now
          </h2>
          <p className="text-xs text-muted-foreground">
            People building a website and what the agent is doing. Refreshes every 5 seconds.
          </p>
        </div>
        <span className={`${chip} bg-secondary text-secondary-foreground tabular-nums`}>
          {runs.length} active
        </span>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-field bg-error-container px-4 py-3 text-sm text-on-error-container">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading builds in progress">
          <div className="skeleton h-24 rounded-card" />
        </div>
      ) : runs.length === 0 ? (
        <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nobody is building a website right now.
        </p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {runs.map((run) => (
            <li key={run.id} className="rounded-card border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <Owner user={run.user} />
                <span
                  className={`${chip} shrink-0 ${
                    run.status === "running"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                  }`}
                >
                  <span className={`status-dot ${run.status === "running" ? "is-running" : ""}`} aria-hidden="true" />
                  {run.status === "running" ? "Agent running" : "Queued"}
                </span>
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
    </section>
  )
}
