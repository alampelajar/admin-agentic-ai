import { AlertCircle, CheckCircle2, Inbox, Loader2, RotateCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// Shared building blocks for the console's pages, so every page has the same frame and
// the same loading, empty and error states.

export function Page({ className, ...props }) {
  return <div className={cn("space-y-6 p-4 sm:p-6", className)} {...props} />
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
    <div className={cn("flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center", className)}>
      <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      {title && <p className="text-sm font-medium">{title}</p>}
      {children && <p className="max-w-md text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = "Something went wrong", message, onRetry, busy = false, className }) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCw aria-hidden="true" />}
            {busy ? "Retrying..." : "Retry"}
          </Button>
        )}
      </AlertDescription>
    </Alert>
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
