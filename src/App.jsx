import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom"
import { useEffect, useState } from "react"

// Keep the existing page modules and business logic; only the app shell changes.
import Sidebar from "./components/sidebar.jsx"
import Header from "./components/Header.jsx"
import Dashboard from "./Pages/dashboard.jsx"
import Users from "./Pages/users.jsx"
import Feedback from "./Pages/Feedback.jsx"
import Agents from "./Pages/Agents.jsx"
import Models from "./Pages/Models.jsx"
import Tasks from "./Pages/Tasks.jsx"
import Analytics from "./Pages/Analytics.jsx"
import Logs from "./Pages/Logs.jsx"
import Settings from "./Pages/Settings.jsx"
import Login from "./Pages/Login/Login.jsx"
import { getAccessToken, SESSION_ENDED_EVENT } from "./lib/auth.js"

const SIDEBAR_KEY = "admin_sidebar"

function AdminLayout() {
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === "collapsed")

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      localStorage.setItem(SIDEBAR_KEY, value ? "expanded" : "collapsed")
      return !value
    })
  }

  return (
    <div className={`app ${collapsed ? "sidebar-collapsed" : ""}`}>
      <Sidebar
        open={mobileNavOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <main className="main-content">
        <Header onMenuClick={() => setMobileNavOpen(true)} />

        {/* Keyed by path so each page plays its entrance animation. */}
        <div key={location.pathname} className="page-content page-enter">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/ticket" element={<Feedback />} />
            <Route path="/feedback" element={<Navigate to="/ticket" replace />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/models" element={<Models />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function SessionScreen() {
  return (
    <div className="session-screen">
      <span className="session-spinner" aria-hidden="true" />
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
    </BrowserRouter>
  )
}

export default App
