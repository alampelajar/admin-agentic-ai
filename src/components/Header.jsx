import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, LogOut, Menu, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getStoredAdmin, logoutAdminSession } from "../lib/auth"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 11) return "Good morning"
  if (hour < 15) return "Good afternoon"
  if (hour < 19) return "Good evening"
  return "Good night"
}

function Header({ onMenuClick = () => {} }) {
  const navigate = useNavigate()
  const [admin] = useState(getStoredAdmin)
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"))

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin_theme")
    const dark = savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches
    document.documentElement.classList.toggle("dark", dark)
    setDarkMode(dark)
  }, [])

  const toggleDarkMode = () => {
    const nextMode = !darkMode
    setDarkMode(nextMode)
    document.documentElement.classList.toggle("dark", nextMode)
    localStorage.setItem("admin_theme", nextMode ? "dark" : "light")
  }

  const handleLogout = async () => {
    await logoutAdminSession()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background px-4 sm:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu" onClick={onMenuClick}>
        <Menu />
      </Button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {greeting()}, {admin.firstName}
        </p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          Here is what is happening on your THIS MY WEBSITE platform.
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? <Sun /> : <Moon />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2" aria-label={`Account menu for ${admin.name}`}>
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{admin.initial}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-40 truncate text-sm sm:inline">{admin.name}</span>
            <ChevronDown className="hidden text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">{admin.name}</p>
            <p className="truncate text-xs text-muted-foreground">{admin.email || admin.role}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleLogout}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

export default Header
