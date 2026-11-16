import { cn } from "../../lib/utils.js"

// Looks like a Material 3 assist chip: 32px tall, 8px radius. It is not interactive.
const variants = {
  default: "border-transparent bg-secondary text-secondary-foreground",
  secondary: "border-transparent bg-muted text-foreground",
  outline: "border-input text-foreground",
  destructive: "border-transparent bg-error-container text-on-error-container",
  success: "border-transparent bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  warning: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
}
export function Badge({ className, variant = "default", ...props }) { return <span className={cn("inline-flex h-8 items-center gap-2 rounded-chip border px-4 text-sm font-medium [&_svg]:size-4.5", variants[variant] || variants.default, className)} {...props} /> }
