import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { API_BASE_URL } from "../../lib/config.js"
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert.jsx"
import { Button } from "../../components/ui/button.jsx"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card.jsx"
import { Input } from "../../components/ui/input.jsx"

function Login() {
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
      navigate("/dashboard", { replace: true })
    } catch (error) {
      console.error("Login gagal:", error)
      setError(error instanceof Error ? error.message : "Terjadi kesalahan saat login.")
    } finally { setLoading(false) }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-primary" />
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-muted/80 blur-3xl" />
      <Card className="relative w-full max-w-md shadow-lg">
        <CardHeader className="items-center space-y-3 pb-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm">AI</div>
          <div className="space-y-1">
            <CardTitle className="text-2xl tracking-tight">Admin Console</CardTitle>
            <CardDescription>Sign in to manage your Agentic AI platform.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none">Email</label>
              <Input id="email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" required disabled={loading} />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">Password</label>
              <Input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required disabled={loading} />
            </div>
            {error && <Alert variant="destructive" className="bg-destructive/5"><AlertTitle>Unable to sign in</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t px-6 py-4 text-xs text-muted-foreground">Agentic AI Admin Dashboard</CardFooter>
      </Card>
    </main>
  )
}

export default Login
