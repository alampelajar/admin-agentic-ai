import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "./ui/button.jsx"

function Header({ onMenuClick = () => {} }) {
  const navigate = useNavigate()
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

  const toggleDarkMode = () => {
    const nextMode = !darkMode
    setDarkMode(nextMode)
    document.documentElement.classList.toggle("dark", nextMode)
    localStorage.setItem("admin_theme", nextMode ? "dark" : "light")
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_access_token")
    localStorage.removeItem("admin_refresh_token")
    localStorage.removeItem("admin_user")
    setProfileOpen(false)
    navigate("/login")
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        <Button type="button" variant="outline" size="icon" className="mobile-menu-button" aria-label="Open navigation menu" onClick={onMenuClick}>
          <span aria-hidden="true">☰</span>
        </Button>
        <div>
          <h1 className="header-heading">Admin workspace</h1>
          <p className="header-subheading">Manage your Agentic AI platform</p>
        </div>
      </div>

      <div className="app-header-actions">
        <Button type="button" variant="outline" size="icon" onClick={toggleDarkMode} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} title={darkMode ? "Light mode" : "Dark mode"} className="header-icon-button">
          <span aria-hidden="true">{darkMode ? "☀" : "◐"}</span>
        </Button>

        <div className="header-profile-wrap">
          <button
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            aria-expanded={profileOpen}
            className="header-profile-button"
          >
            <span className="header-profile-avatar" aria-hidden="true">A</span>
            <span className="header-profile-copy">
              <span className="header-profile-name">Admin</span>
              <span className="header-profile-role">Administrator</span>
            </span>
            <span className="header-profile-chevron" aria-hidden="true">⌄</span>
          </button>

          {profileOpen && (
            <div className="header-profile-menu">
              <div className="header-profile-menu-heading">
                <strong>Administrator</strong>
                <span>admin@example.com</span>
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
