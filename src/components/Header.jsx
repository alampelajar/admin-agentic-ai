import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { useNavigate } from "react-router-dom"
import { Button } from "./ui/button.jsx"
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
  const [profileOpen, setProfileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin_theme")

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark")
      setDarkMode(true)
      return
    }

    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark")
      setDarkMode(false)
      return
    }

    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    document.documentElement.classList.toggle("dark", systemDark)
    setDarkMode(systemDark)
  }, [])

  const toggleDarkMode = (event) => {
    const nextMode = !darkMode
    const apply = () => {
      setDarkMode(nextMode)
      document.documentElement.classList.toggle("dark", nextMode)
      localStorage.setItem("admin_theme", nextMode ? "dark" : "light")
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!document.startViewTransition || reduceMotion) {
      apply()
      return
    }

    // The new theme spreads out in a circle from the switch.
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const transition = document.startViewTransition(() => flushSync(apply))
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      )
    })
  }

  const handleLogout = async () => {
    await logoutAdminSession()
    setProfileOpen(false)
    navigate("/login")
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        <Button type="button" variant="outline" size="icon" className="mobile-menu-button" aria-label="Open navigation menu" onClick={onMenuClick}>
          <span aria-hidden="true">☰</span>
        </Button>
        <div className="header-greeting">
          <h1 className="header-heading">
            {greeting()}, {admin.firstName}<span className="header-wave" aria-hidden="true">👋</span>
          </h1>
          <p className="header-subheading">Here is what is happening on your Agentic AI platform.</p>
        </div>
      </div>

      <div className="app-header-actions">
        <button
          type="button"
          role="switch"
          aria-checked={darkMode}
          aria-label="Dark mode"
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          onClick={toggleDarkMode}
          className="theme-switch"
        >
          <span className="theme-switch-knob" aria-hidden="true" />
          <span className="theme-switch-icon" aria-hidden="true">☀</span>
          <span className="theme-switch-icon" aria-hidden="true">☾</span>
        </button>

        <div className="header-profile-wrap">
          <button
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            aria-expanded={profileOpen}
            className="header-profile-button"
          >
            <span className="header-profile-avatar" aria-hidden="true">{admin.initial}</span>
            <span className="header-profile-copy">
              <span className="header-profile-name">{admin.name}</span>
              <span className="header-profile-role">{admin.email || admin.role}</span>
            </span>
            <span className="header-profile-chevron" aria-hidden="true">⌄</span>
          </button>

          {profileOpen && (
            <div className="header-profile-menu">
              <div className="header-profile-menu-heading">
                <strong>{admin.name}</strong>
                <span>{admin.email || admin.role}</span>
              </div>
              <button type="button" className="header-logout-button" onClick={handleLogout}>
                <span aria-hidden="true">↪</span>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
