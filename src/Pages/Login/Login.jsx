import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_BASE_URL } from "../../lib/config.js"
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert.jsx"
import { Button } from "../../components/ui/button.jsx"
import { Input } from "../../components/ui/input.jsx"

function Login({ onAuthenticated = () => {} }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

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
      // Tell the app first: otherwise the dashboard would still see "no session" and send the admin back here.
      onAuthenticated()
      navigate("/dashboard", { replace: true })
    } catch (error) {
      console.error("Login gagal:", error)
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat login.")
    } finally { setLoading(false) }
  }

  return (
    <main className="grid min-h-svh bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="flex flex-col justify-between gap-10 bg-primary px-6 py-8 text-primary-foreground sm:px-10 lg:px-16 lg:py-14">
        <div className="flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="8" cy="16" r="4" fill="currentColor" />
            <circle cx="24" cy="8" r="4" fill="currentColor" />
            <circle cx="24" cy="24" r="4" fill="currentColor" />
            <path d="M11.5 14.3 20.5 9.7M11.5 17.7l9 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-semibold tracking-tight">Agentic AI</span>
        </div>

        <p className="max-w-[18ch] text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl">Agents, models and tickets in one place.</p>

        <ul className="hidden gap-x-8 gap-y-2 text-sm text-primary-foreground/80 sm:grid sm:grid-cols-3 lg:max-w-md">
          <li>Agents</li>
          <li>Models</li>
          <li>Tickets</li>
        </ul>
      </section>

      <section className="flex items-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use your administrator account.</p>

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required disabled={loading} className="h-10 rounded-lg shadow-none!" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required disabled={loading} className="h-10 rounded-lg shadow-none!" />
            </div>
            {error && (
              <Alert variant="destructive" role="alert" aria-live="polite" className="bg-destructive/5">
                <AlertTitle>Unable to sign in</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="h-10 w-full rounded-lg shadow-none!" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</Button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default Login
