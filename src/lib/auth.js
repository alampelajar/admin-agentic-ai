const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

let refreshPromise = null

export function clearAdminSession() {
  localStorage.removeItem("admin_access_token")
  localStorage.removeItem("admin_refresh_token")
  localStorage.removeItem("admin_user")
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
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
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
