
const API_URL = "http://localhost:8081"

let refreshPromise = null

export function clearAdminSession() {
  localStorage.removeItem("admin_access_token")
  localStorage.removeItem("admin_refresh_token")
  localStorage.removeItem("admin_user")
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split(".")

    if (parts.length !== 3) {
      return null
    }

    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")

    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    )

    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export function isTokenExpired(token) {
  if (!token) {
    return true
  }

  const payload = decodeJwtPayload(token)

  if (!payload?.exp) {
    return true
  }

  const now = Math.floor(Date.now() / 1000)

  return payload.exp <= now
}

export async function refreshAccessToken() {
  // Gunakan satu request jika beberapa komponen
  // meminta refresh token secara bersamaan.
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem(
        "admin_refresh_token"
      )

      if (!refreshToken) {
        localStorage.removeItem("admin_access_token")
        return null
      }

      const response = await fetch(
        `${API_URL}/api/admin/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()

        console.error(
          "Refresh token gagal:",
          response.status,
          errorText
        )

        // Token tidak valid atau admin sudah tidak aktif.
        if (
          response.status === 401 ||
          response.status === 403
        ) {
          clearAdminSession()
        }

        return null
      }

      const data = await response.json()

      if (!data?.access_token) {
        console.error(
          "Access token tidak ditemukan pada respons refresh."
        )
        return null
      }

      localStorage.setItem(
        "admin_access_token",
        data.access_token
      )

      return data.access_token
    } catch (error) {
      // Jangan menghapus sesi hanya karena server
      // sedang tidak bisa dijangkau.
      console.error(
        "Refresh access token gagal:",
        error
      )

      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function getAccessToken() {
  const accessToken = localStorage.getItem(
    "admin_access_token"
  )

  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken
  }

  return await refreshAccessToken()
}