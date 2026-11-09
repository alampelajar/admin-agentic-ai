import { API_BASE_URL } from "./config.js"

let refreshPromise = null

// Fired whenever the session is cleared, so the app can move to the login page
// without a reload (logout, a failed refresh, or a token that is not an admin's).
export const SESSION_ENDED_EVENT = "admin-session-ended"

export function clearAdminSession() {
  localStorage.removeItem("admin_access_token")
  localStorage.removeItem("admin_refresh_token")
  localStorage.removeItem("admin_user")
  window.dispatchEvent(new Event(SESSION_ENDED_EVENT))
}

// Ends the session on the server too. Clearing local storage alone is not enough:
// the HTTP-only cookie would sign the admin straight back in on the next load.
export async function logoutAdminSession() {
  try {
    await fetch(`${API_BASE_URL}/api/admin/logout`, { method: "POST", credentials: "include" })
  } catch (error) {
    console.error("Logout admin gagal:", error)
  } finally {
    clearAdminSession()
  }
}

// The signed-in admin as the login response described them, for display only.
export function getStoredAdmin() {
  let user = null
  try {
    user = JSON.parse(localStorage.getItem("admin_user") || "null")
  } catch {
    user = null
  }
  const email = typeof user?.email === "string" ? user.email.trim() : ""
  const name = typeof user?.name === "string" && user.name.trim() ? user.name.trim() : email.split("@")[0] || "Admin"
  const role = typeof user?.role === "string" && user.role ? user.role : "admin"
  return {
    name,
    firstName: name.split(/\s+/)[0],
    email,
    role: role.charAt(0).toUpperCase() + role.slice(1),
    initial: (name || email || "A").charAt(0).toUpperCase(),
  }
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

// Only used to route the page; the server decides what an admin may actually do.
export function isAdminToken(token) {
  return decodeJwtPayload(token || "")?.role === "admin"
}

export function isTokenExpired(token) {
  if (!token) return true
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return true
  return payload.exp <= Math.floor(Date.now() / 1000)
}

// The main Agentic AI backend issues the refresh token as an HTTP-only cookie.
// Never read or store the refresh token in localStorage.
export async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      // Its own endpoint and cookie: the user app shares this host, and its session must never be taken for the admin's.
      const response = await fetch(`${API_BASE_URL}/api/admin/refresh`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.access_token) {
        if (response.status === 401 || response.status === 403) {
          clearAdminSession()
        }
        return null
      }

      localStorage.setItem("admin_access_token", data.access_token)
      return data.access_token
    } catch (error) {
      // Preserve local session data during temporary network failures.
      console.error("Refresh access token gagal:", error)
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function getAccessToken() {
  const token = localStorage.getItem("admin_access_token")
  if (token && isAdminToken(token) && !isTokenExpired(token)) return token
  // A stored token that is not an admin's (left over from another account) is never used.
  if (token && !isAdminToken(token)) clearAdminSession()
  return await refreshAccessToken()
}
