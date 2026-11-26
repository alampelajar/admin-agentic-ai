import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom"
import { useEffect, useState } from "react"

// Keep the existing page modules and business logic; only the app shell changes.
import { AppSidebar } from "./components/layout/app-sidebar.jsx"
import { Header } from "./components/layout/header.jsx"
import { SidebarInset, SidebarProvider } from "./components/ui/sidebar.jsx"
import Dashboard from "./Pages/dashboard.jsx"
import Users from "./Pages/users.jsx"
import Feedback from "./Pages/Feedback.jsx"
import Agents from "./Pages/Agents.jsx"
import Models from "./Pages/Models.jsx"
import Statistics from "./Pages/Statistics.jsx"
import Analytics from "./Pages/Analytics.jsx"
import Reports from "./Pages/Reports.jsx"
import Logs from "./Pages/Logs.jsx"
import Websites from "./Pages/Websites.jsx"
import TopUps from "./Pages/TopUps.jsx"
import Settings from "./Pages/Settings.jsx"
import Login from "./Pages/Login/Login.jsx"
import { Loader2 } from "lucide-react"
import { Toaster } from "./components/ui/sonner.jsx"
import { getAccessToken, SESSION_ENDED_EVENT } from "./lib/auth.js"

// The main app keeps the sidebar open or shrunk in a cookie; the admin console does too.
const sidebarOpen = () => !document.cookie.split("; ").includes("admin_sidebar_state=false")

function AdminLayout() {
  const location = useLocation()

  return (
    <SidebarProvider defaultOpen={sidebarOpen()}>
      <a
        href="#content"
        className="fixed start-44 z-999 -translate-y-52 bg-primary px-4 py-2 text-sm font-medium whitespace-nowrap text-primary-foreground opacity-95 shadow-sm transition hover:bg-primary/90 focus:translate-y-3 focus:transform focus-visible:ring-1 focus-visible:ring-ring"
      >
        Skip to main
      </a>
      <AppSidebar />

      <SidebarInset className="@container/content min-w-0">
        <Header />

        {/* Keyed by path so each page plays its entrance animation. */}
        <div key={location.pathname} id="content" className="page-enter">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/ticket" element={<Feedback />} />
            <Route path="/feedback" element={<Navigate to="/ticket" replace />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/models" element={<Models />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/tasks" element={<Navigate to="/statistics" replace />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/websites" element={<Websites />} />
            <Route path="/topups" element={<TopUps />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function SessionScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center gap-2 bg-background text-sm text-muted-foreground" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <p>Checking session...</p>
    </div>
  )
}

// One answer for the whole app: "checking" until the stored session has been
// looked at, then "authenticated" or "anonymous". Signing in and out update it
// directly, so the page never decides from an answer that is out of date.
function AppContent() {
  const location = useLocation()
  const [session, setSession] = useState("checking")

  useEffect(() => {
    let cancelled = false
    getAccessToken().then((accessToken) => {
      if (!cancelled) setSession(accessToken ? "authenticated" : "anonymous")
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Logout, a failed refresh or a token that is not an admin's all clear the session.
  useEffect(() => {
    const onEnded = () => setSession("anonymous")
    window.addEventListener(SESSION_ENDED_EVENT, onEnded)
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded)
  }, [])

  // Keep the periodic check so a session that expires while the page is open still ends.
  useEffect(() => {
    if (session !== "authenticated") return

    const interval = window.setInterval(async () => {
      const accessToken = await getAccessToken()
      if (!accessToken) setSession("anonymous")
    }, 15000)

    return () => window.clearInterval(interval)
  }, [session])

  if (session === "checking") return <SessionScreen />

  if (location.pathname === "/login") {
    if (session === "authenticated") return <Navigate to="/dashboard" replace />
    return <Login onAuthenticated={() => setSession("authenticated")} />
  }

  if (session !== "authenticated") return <Navigate to="/login" replace />

  return <AdminLayout />
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster richColors closeButton />
    </BrowserRouter>
  )
}

export default App
