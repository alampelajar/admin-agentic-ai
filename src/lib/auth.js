import { API_BASE_URL } from "./config.js"

let refreshPromise = null

export function clearAdminSession() {
  localStorage.removeItem("admin_access_token")
  localStorage.removeItem("admin_refresh_token")
  localStorage.removeItem("admin_user")
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
  if (token && !isTokenExpired(token)) return token
  return await refreshAccessToken()
}
