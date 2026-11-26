import { useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import {
  BarChart3,
  Bot,
  Boxes,
  ChevronsUpDown,
  FileText,
  Globe,
  LayoutDashboard,
  List,
  LogOut,
  Settings,
  Ticket,
  Users,
  Wallet,
} from "lucide-react"

import { getStoredAdmin } from "@/lib/auth"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { BrandName, Logo } from "./logo.jsx"
import { useSignOut } from "./sign-out.jsx"

// The menu, grouped like the main app's sidebar.
export const navGroups = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Reports", url: "/reports", icon: FileText },
    ],
  },
  {
    title: "Website",
    items: [
      { title: "Websites", url: "/websites", icon: Globe },
      { title: "Users", url: "/users", icon: Users },
      { title: "Top-ups", url: "/topups", icon: Wallet },
      { title: "Ticket", url: "/ticket", icon: Ticket },
    ],
  },
  {
    title: "AI",
    items: [
      { title: "Agents", url: "/agents", icon: Bot },
      { title: "Models", url: "/models", icon: Boxes },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Logs", url: "/logs", icon: List },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
]

export function initials(name) {
  return (
    String(name || "A")
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A"
  )
}

function NavUser() {
  const { isMobile } = useSidebar()
  const [admin] = useState(getStoredAdmin)
  const [askToSignOut, signOutDialog] = useSignOut()

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{initials(admin.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{admin.name}</span>
                  <span className="truncate text-xs">{admin.email || admin.role}</span>
                </div>
                <ChevronsUpDown className="ms-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{initials(admin.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-semibold">{admin.name}</span>
                    <span className="truncate text-xs">{admin.email || admin.role}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={askToSignOut}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      {signOutDialog}
    </>
  )
}

export function AppSidebar() {
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <Link
          to="/dashboard"
          aria-label="THIS MY WEBSITE admin console, go to the dashboard"
          onClick={() => setOpenMobile(false)}
          className="group flex h-14 items-center gap-2 rounded-md px-3 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:px-0"
        >
          <span className="flex shrink-0 transition-transform duration-200 group-hover:scale-110">
            <Logo className="size-7" />
          </span>
          <BrandName className="group-data-[collapsible=icon]:hidden" />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <NavLink to={item.url} onClick={() => setOpenMobile(false)}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
