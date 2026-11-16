import { cn } from "../../lib/utils.js"

// Material 3 outlined card: 12px radius, outline-variant border, no shadow.
export function Card({ className, ...props }) { return <div className={cn("rounded-card border border-border bg-card text-card-foreground", className)} {...props} /> }
export function CardHeader({ className, ...props }) { return <div className={cn("flex flex-col gap-1 p-4", className)} {...props} /> }
export function CardTitle({ className, ...props }) { return <h3 className={cn("text-base font-medium", className)} {...props} /> }
export function CardDescription({ className, ...props }) { return <p className={cn("text-sm text-muted-foreground", className)} {...props} /> }
export function CardContent({ className, ...props }) { return <div className={cn("p-4 pt-0", className)} {...props} /> }
export function CardFooter({ className, ...props }) { return <div className={cn("flex items-center gap-2 p-4 pt-0", className)} {...props} /> }
