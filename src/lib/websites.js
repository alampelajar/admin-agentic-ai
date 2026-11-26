import { apiFetch } from "./api"
import { formatWib } from "./datetime"

// Shared by the Dashboard, Analytics and Reports pages, which all count websites now that
// the product is the website builder. Everything comes from existing admin routes.

export async function readJson(path) {
  const response = await apiFetch(path)
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || "Request failed.")
  }
  return data
}

export const listOf = (data, key) => (Array.isArray(data?.[key]) ? data[key] : [])

// Accounts come as "2006-01-02 15:04:05", which not every browser (Safari) reads as is.
export const parseDate = (value) => new Date(String(value || "").replace(" ", "T"))

export const DAY_MS = 24 * 60 * 60 * 1000
export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
export const dayKey = (value) => startOfDay(new Date(value)).getTime()

// Plain words for stored keys ("tech-precise" becomes "Tech precise").
export const words = (value) => {
  const text = String(value || "").replace(/[-_]+/g, " ").trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Not set"
}

// Where a website is: live, made but not published, or not made yet.
export function siteState(site) {
  if (site.published) return { key: "live", label: "Live", variant: "success" }
  if (site.has_version) return { key: "built", label: "Made, not published", variant: "secondary" }
  if (site.status === "failed") return { key: "failed", label: "Failed", variant: "destructive" }
  if (site.status === "building") return { key: "building", label: "Being made", variant: "warning" }
  return { key: "draft", label: "Draft", variant: "outline" }
}

// Made per day (from the website) and published per day (from the log), oldest first.
export function perDay(sites, logs, days, locale = "en-GB") {
  const today = startOfDay(new Date())
  const rows = new Map()
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today.getTime() - index * DAY_MS)
    rows.set(date.getTime(), {
      name: date.toLocaleDateString(locale, { day: "numeric", month: "short" }),
      made: 0,
      published: 0,
    })
  }
  sites.forEach((site) => {
    const row = rows.get(dayKey(site.created_at))
    if (row) row.made += 1
  })
  logs
    .filter((log) => log.action === "site.publish")
    .forEach((log) => {
      const row = rows.get(dayKey(log.time))
      if (row) row.published += 1
    })
  return [...rows.values()]
}

export function relativeTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`
  return formatWib(date)
}

// The website events of the log, in words.
export const EVENTS = {
  "site.create": { label: "Made", variant: "secondary" },
  "site.publish": { label: "Published", variant: "success" },
  "site.delete": { label: "Deleted", variant: "destructive" },
}

// Recharts animates from JavaScript, so the global reduced-motion rule does not reach it.
export const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

export const chartTooltip = {
  cursor: { fill: "var(--muted)", radius: 6 },
  contentStyle: {
    background: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 13,
  },
}
export const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 }
