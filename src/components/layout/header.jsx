import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, LogOut, Moon, Settings, Sun } from "lucide-react"

import { cn } from "@/lib/utils"
import { getStoredAdmin } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { initials } from "./app-sidebar.jsx"
import { Search } from "./search.jsx"
import { useSignOut } from "./sign-out.jsx"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 11) return "Good morning"
  if (hour < 15) return "Good afternoon"
  if (hour < 19) return "Good evening"
  return "Good night"
}

// Light, dark or the device's setting, as in the main app's ThemeSwitch.
function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const options = [
    ["light", "Light"],
    ["dark", "Dark"],
    ["system", "System"],
  ]
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="scale-95 rounded-full">
          <Sun className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Change the theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map(([value, label]) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
            {label}
            <Check size={14} className={cn("ms-auto", theme !== value && "hidden")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProfileDropdown() {
  const [admin] = useState(getStoredAdmin)
  const [askToSignOut, signOutDialog] = useSignOut()

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative size-8 rounded-full" aria-label="Open the profile menu">
            <Avatar className="size-8">
              <AvatarFallback>{initials(admin.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm leading-none font-medium">{admin.name}</p>
              <p className="text-xs leading-none text-muted-foreground">{admin.email || admin.role}</p>
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
      {signOutDialog}
    </>
  )
}

// The bar above every page, like the main app's Header: the sidebar button, the search,
// the greeting, the theme and the profile.
export function Header() {
  const [admin] = useState(getStoredAdmin)

  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b border-border/70 bg-background">
      <div className="relative flex h-full items-center gap-3 px-4 sm:gap-4">
        <SidebarTrigger variant="outline" className="max-md:scale-125" />
        <Separator orientation="vertical" className="h-6" />
        <Search className="me-auto" />
        <p className="hidden min-w-0 truncate text-sm text-muted-foreground lg:block">
          {greeting()}, <span className="font-medium text-foreground">{admin.firstName}</span>
        </p>
        <ThemeSwitch />
        <ProfileDropdown />
      </div>
    </header>
  )
}
