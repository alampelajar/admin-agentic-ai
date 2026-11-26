import { CheckCircle2, CircleAlert, Inbox, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Shared building blocks for the console's pages, so every page has the same frame and
// the same loading, empty and error states.

// Like the main app's Main: 16px at the sides, at most 80rem wide on large screens.
export function Page({ className, ...props }) {
  return (
    <div
      className={cn("space-y-6 px-4 py-6 @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl", className)}
      {...props}
    />
  )
}

export function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, children, action, className }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center", className)}>
      <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      {(title || children) && (
        <div className="space-y-1">
          {title && <p className="text-base font-semibold">{title}</p>}
          {children && <p className="max-w-md text-sm text-muted-foreground">{children}</p>}
        </div>
      )}
      {action}
    </div>
  )
}

// The same error box as the main app: a red outline, the message and a retry button.
export function ErrorState({ title, message, onRetry, busy = false, className }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          {title && <span className="font-medium">{title}. </span>}
          {message}
        </span>
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={onRetry} disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {busy ? "Retrying..." : "Retry"}
        </Button>
      )}
    </div>
  )
}

// A number with its label, as on the main app's Overview.
export function StatCard({ label, value, icon, note, loading = false, valueClassName, className }) {
  return (
    <Card className={className}>
      <CardContent className="space-y-1">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", valueClassName)}>{value}</p>
        )}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  )
}

// A short message after an action worked.
export function SuccessNotice({ children, className }) {
  return (
    <p role="status" className={cn("flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400", className)}>
      <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}

export function LoadingRows({ rows = 3, label = "Loading", className }) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function LoadingText({ children = "Loading...", className }) {
  return (
    <p className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)} role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {children}
    </p>
  )
}

// A small dot with a word beside it; "running" pulses.
export function StatusDot({ tone = "muted", running = false, className }) {
  const color = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-destructive",
    primary: "bg-primary",
    muted: "bg-muted-foreground",
  }[tone]
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden="true">
      {running && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", color)} />}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  )
}
