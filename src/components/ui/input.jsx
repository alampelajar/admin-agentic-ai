import { cn } from "../../lib/utils.js"

// Material 3 outlined text field: 56px tall, 4px radius, a 2px primary outline on focus and an
// error outline when aria-invalid is set.
export function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-14 w-full rounded-field border border-input bg-transparent px-4 text-base text-foreground transition-colors duration-200 ease-m3 placeholder:text-muted-foreground hover:border-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive disabled:cursor-not-allowed disabled:border-foreground/12 disabled:text-foreground/38",
        className
      )}
      {...props}
    />
  )
}
