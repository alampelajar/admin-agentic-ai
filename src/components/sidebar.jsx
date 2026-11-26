import { NavLink } from "react-router-dom"
import {
  BarChart3,
  Bot,
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  FileText,
  Globe,
  LayoutDashboard,
  List,
  Settings,
  Ticket,
  Users,
  Wallet,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const menuItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "Users", path: "/users", icon: Users },
  { name: "Websites", path: "/websites", icon: Globe },
  { name: "Top-ups", path: "/topups", icon: Wallet },
  { name: "Ticket", path: "/ticket", icon: Ticket },
  { name: "Agents", path: "/agents", icon: Bot },
  { name: "Models", path: "/models", icon: Boxes },
  { name: "Tasks", path: "/tasks", icon: ClipboardCheck },
  { name: "Analytics", path: "/analytics", icon: BarChart3 },
  { name: "Reports", path: "/reports", icon: FileText },
  { name: "Logs", path: "/logs", icon: List },
  { name: "Settings", path: "/settings", icon: Settings },
]

export function BrandLogo({ className }) {
  return (
    <span
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground", className)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" className="size-5" fill="none">
        <path d="M11 11L20 20L29 11M20 20L11 29M20 20L29 29" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="15.5" y="15.5" width="9" height="9" rx="2.5" fill="currentColor" />
        <circle cx="11" cy="11" r="4" fill="currentColor" />
        <circle cx="29" cy="11" r="4" fill="currentColor" />
        <circle cx="11" cy="29" r="4" fill="currentColor" />
        <circle cx="29" cy="29" r="4" fill="currentColor" />
      </svg>
    </span>
  )
}

function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <BrandLogo />
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-semibold">THIS MY WEBSITE</p>
        <p className="truncate text-xs font-normal text-muted-foreground">Admin console</p>
      </div>
    </div>
  )
}

function NavItems({ collapsed = false, onNavigate }) {
  return (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-2">
      <ul className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const link = (
            <NavLink
              to={item.path}
              onClick={onNavigate}
              aria-label={collapsed ? item.name : undefined}
              className={({ isActive }) =>
                cn(
                  "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          )
          return (
            <li key={item.path}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.name}</TooltipContent>
                </Tooltip>
              ) : (
                link
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// On a computer the menu stays on the left and can shrink to icons; on a phone it opens
// as a sheet from the menu button in the header.
function Sidebar({ open = false, collapsed = false, onToggleCollapse = () => {}, onNavigate = () => {} }) {
  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className={cn("flex h-14 items-center gap-2 border-b px-3", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && <Brand />}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
        </div>
        <NavItems collapsed={collapsed} />
      </aside>

      <Sheet open={open} onOpenChange={(value) => !value && onNavigate()}>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="border-b p-4">
            <SheetTitle asChild>
              <div>
                <Brand />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Main navigation</SheetDescription>
          </SheetHeader>
          <NavItems onNavigate={onNavigate} />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  )
}

export default Sidebar
