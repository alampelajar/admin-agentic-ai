import { cn } from "../../lib/utils.js"

const variants = {
  default: "border-border bg-card text-card-foreground",
  destructive: "border-transparent bg-error-container text-on-error-container [&>svg]:text-on-error-container",
}
export function Alert({ className, variant = "default", ...props }) { return <div role="alert" className={cn("relative w-full rounded-card border px-4 py-3 text-sm [&>svg~*]:pl-7", variants[variant] || variants.default, className)} {...props} /> }
export function AlertTitle({ className, ...props }) { return <h5 className={cn("mb-1 font-medium", className)} {...props} /> }
export function AlertDescription({ className, ...props }) { return <div className={cn("text-sm", className)} {...props} /> }
