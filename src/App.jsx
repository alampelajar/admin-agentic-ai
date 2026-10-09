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
import Agents from "./Pages/Agents.jsx"
import Tasks from "./Pages/Tasks.jsx"
import Analytics from "./Pages/Analytics.jsx"
import Logs from "./Pages/Logs.jsx"
import Settings from "./Pages/Settings.jsx"
import Login from "./Pages/Login/Login.jsx"
import { getAccessToken } from "./lib/auth.js"

function ProtectedRoute({ authenticated, children }) {
  if (!authenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AdminLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="app">
      <Sidebar
        open={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      <main className="main-content">
        <Header onMenuClick={() => setMobileNavOpen(true)} />

        <div className="page-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/agents" element={<Agents />} />
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

function AppContent() {
  const location = useLocation()
  const [checkingSession, setCheckingSession] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      setCheckingSession(true)
      const accessToken = await getAccessToken()

      if (cancelled) return
      setAuthenticated(Boolean(accessToken))
      setCheckingSession(false)
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [location.pathname])

  // Keep the existing periodic session check so expired sessions still redirect.
  useEffect(() => {
    if (location.pathname === "/login") return

    const interval = window.setInterval(async () => {
      const accessToken = await getAccessToken()

      if (!accessToken) {
        setAuthenticated(false)
        window.location.replace("/login")
      }
    }, 15000)

    return () => window.clearInterval(interval)
  }, [location.pathname])

  if (location.pathname === "/login") return <Login />

  if (checkingSession) {
    return (
      <div className="session-screen">
        <span className="session-spinner" aria-hidden="true" />
        <p>Checking session...</p>
      </div>
    )
  }

  return (
    <ProtectedRoute authenticated={authenticated}>
      <AdminLayout />
    </ProtectedRoute>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
