import { cn } from "@/lib/utils"

// The same mark as the main app (agentic-ai-fe/src/assets/logo.tsx).
export function Logo({ className, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-6", className)}
      aria-hidden="true"
      {...props}
    >
      <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
    </svg>
  )
}

export function BrandName({ subtitle = "Admin console", className }) {
  return (
    <div className={cn("grid flex-1 text-start leading-tight", className)}>
      <span className="truncate text-sm font-semibold tracking-tight">
        THIS MY <span className="text-primary">WEBSITE</span>
      </span>
      <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
    </div>
  )
}
