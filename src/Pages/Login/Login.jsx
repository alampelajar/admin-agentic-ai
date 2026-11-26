import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_BASE_URL } from "../../lib/config.js"
import { setAdminAccessToken } from "../../lib/auth.js"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert.jsx"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.jsx"
import { Label } from "../../components/ui/label.jsx"
import { BrandLogo } from "../../components/sidebar.jsx"
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
      // In memory only; the refresh token stays in its HTTP-only cookie.
      setAdminAccessToken(data.access_token)
      localStorage.setItem("admin_user", JSON.stringify(data.user))
      setLeaving(true)
      // Tell the app first: otherwise the dashboard would still see "no session" and send the admin back here.
      onAuthenticated()
      navigate("/dashboard", { replace: true })
    } catch (error) {
      console.error("Login gagal:", error)
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat login.")
    } finally { setLoading(false) }
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-12 text-foreground">
      <div className="flex items-center gap-2">
        <BrandLogo />
        <span className="text-base font-semibold">THIS MY WEBSITE</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Sign in with your administrator account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required disabled={loading} />
            </div>
            {error && (
              <Alert variant="destructive" aria-live="polite">
                <AlertCircle />
                <AlertTitle>Unable to sign in</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading || leaving}>
              {(loading || leaving) && <Loader2 className="animate-spin" aria-hidden="true" />}
              {leaving ? "Opening dashboard..." : loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Admin console for agents, models and tickets.</p>
    </main>
  )
}

export default Login
