import { cn } from "../../lib/utils.js"
export function Separator({ className, orientation = "horizontal", decorative = true, ...props }) {
  const horizontal = orientation === "horizontal"
  return <div role={decorative ? "none" : "separator"} aria-orientation={decorative ? undefined : orientation} className={cn("shrink-0 bg-border", horizontal ? "h-px w-full" : "h-full w-px", className)} {...props} />
}
