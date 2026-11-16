import { cn } from "../../lib/utils.js"

// Material 3 buttons: filled (default), filled tonal (secondary), outlined, text (ghost, link),
// filled in error colors (destructive) and the round icon button (size="icon").
const variants = {
  default: "bg-primary text-primary-foreground disabled:bg-foreground/12",
  destructive: "bg-destructive text-destructive-foreground disabled:bg-foreground/12",
  secondary: "bg-secondary text-secondary-foreground disabled:bg-foreground/12",
  outline: "border border-input bg-transparent text-primary disabled:border-foreground/12",
  ghost: "bg-transparent text-primary",
  "destructive-ghost": "bg-transparent text-destructive",
  link: "bg-transparent text-primary underline-offset-4 hover:underline",
}
const sizes = { default: "h-10 px-6", sm: "h-8 px-4", lg: "h-12 px-8", icon: "size-10 px-0" }

export function Button({ className, variant = "default", size = "default", type = "button", ...props }) {
  return (
    <button
      type={type}
      className={cn(
        "state-layer inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors duration-200 ease-m3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:text-foreground/38 [&_svg]:pointer-events-none [&_svg]:size-4.5 [&_svg]:shrink-0",
        variants[variant] || variants.default,
        sizes[size] || sizes.default,
        size === "icon" && variant === "ghost" && "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
