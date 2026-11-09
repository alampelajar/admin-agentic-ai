import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_BASE_URL } from "../../lib/config.js"
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert.jsx"
import { Button } from "../../components/ui/button.jsx"
import { Input } from "../../components/ui/input.jsx"
import { PasswordInput } from "../../components/ui/password-input.jsx"

function Login({ onAuthenticated = () => {} }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [leaving, setLeaving] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    if (loading) return
    setError("")
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const responseText = await response.text()
      let data
      try { data = JSON.parse(responseText) } catch { data = null }
      if (!response.ok) {
        const message = typeof data === "string" ? data : data?.error || data?.message || `Login gagal dengan status ${response.status}.`
        throw new Error(message)
      }
      if (!data || typeof data !== "object") throw new Error("Respons server bukan JSON yang valid.")
      if (!data.access_token) throw new Error("Access token tidak diterima dari server.")
      if (!data.user) throw new Error("Informasi pengguna tidak diterima dari server.")
      localStorage.setItem("admin_access_token", data.access_token)
      if (data.refresh_token) localStorage.setItem("admin_refresh_token", data.refresh_token)
      else localStorage.removeItem("admin_refresh_token")
      localStorage.setItem("admin_user", JSON.stringify(data.user))
      // Let the blue panel sweep away before the dashboard builds in.
      setLeaving(true)
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await new Promise((resolve) => setTimeout(resolve, 480))
      }
      // Tell the app first: otherwise the dashboard would still see "no session" and send the admin back here.
      onAuthenticated()
      navigate("/dashboard", { replace: true })
    } catch (error) {
      console.error("Login gagal:", error)
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat login.")
    } finally { setLoading(false) }
  }

  return (
    <main className={`grid min-h-svh overflow-hidden bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${leaving ? "login-leaving" : ""}`}>
      <section className="login-hero flex flex-col justify-between gap-10 px-6 py-8 text-white sm:px-10 lg:px-16 lg:py-14">
        <span className="blob blob-1" aria-hidden="true" />
        <span className="blob blob-2" aria-hidden="true" />
        <span className="dots" aria-hidden="true" />

        <div className="login-reveal flex items-center gap-3" style={{ "--i": 0 }}>
          <span className="login-hero-logo grid size-11 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <circle cx="8" cy="16" r="4" fill="currentColor" />
              <circle cx="24" cy="8" r="4" fill="currentColor" />
              <circle cx="24" cy="24" r="4" fill="currentColor" />
              <path d="M11.5 14.3 20.5 9.7M11.5 17.7l9 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-lg font-semibold tracking-tight">Agentic AI</span>
        </div>

        <div className="space-y-4">
          <p className="login-reveal max-w-[16ch] text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-5xl" style={{ "--i": 1 }}>
            Agents, models and tickets in one place.
          </p>
          <p className="login-reveal max-w-md text-sm text-white/75 sm:text-base" style={{ "--i": 2 }}>
            Watch your platform, answer users and keep every agent running from one console.
          </p>
        </div>

        <ul className="hidden gap-3 text-sm sm:flex">
          {["Agents", "Models", "Tickets"].map((label, index) => (
            <li key={label} className="login-reveal login-chip rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20 backdrop-blur" style={{ "--i": index + 3 }}>
              {label}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="login-card mx-auto w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-[0_20px_50px_rgb(24_32_64/8%)]">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back 👋</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in with your administrator account.</p>

          <form onSubmit={handleLogin} className="login-form mt-7 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required disabled={loading} className="h-10 rounded-lg shadow-none!" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <PasswordInput id="password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required disabled={loading} className="h-10 rounded-lg shadow-none!" />
            </div>
            {error && (
              <Alert variant="destructive" role="alert" aria-live="polite" className="bg-destructive/5">
                <AlertTitle>Unable to sign in</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="h-11 w-full gap-2 rounded-lg text-white" disabled={loading || leaving}>
              {(loading || leaving) && <span className="spinner" aria-hidden="true" />}
              {leaving ? "Opening dashboard..." : loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Login
