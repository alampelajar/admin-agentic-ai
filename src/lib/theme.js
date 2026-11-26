import { useCallback, useEffect, useState } from "react"

// Light, dark or the device's setting, kept in localStorage like before ("admin_theme").
// The class on <html> is set in main.jsx before the first paint and here after a change.
const KEY = "admin_theme"
const EVENT = "admin-theme-change"
const media = () => window.matchMedia("(prefers-color-scheme: dark)")

export function readTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    return saved === "light" || saved === "dark" ? saved : "system"
  } catch {
    return "system"
  }
}

export function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "system" && media().matches)
  document.documentElement.classList.toggle("dark", dark)
}

export function useTheme() {
  const [theme, setThemeState] = useState(readTheme)

  // Every switch on the page (header, search menu) shows the same choice.
  useEffect(() => {
    const onChange = () => setThemeState(readTheme())
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])

  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system") return
    const list = media()
    const onChange = () => applyTheme("system")
    list.addEventListener("change", onChange)
    return () => list.removeEventListener("change", onChange)
  }, [theme])

  const setTheme = useCallback((value) => {
    try {
      if (value === "system") localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, value)
    } catch {
      // The choice still applies to this page.
    }
    setThemeState(value)
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return { theme, setTheme }
}
