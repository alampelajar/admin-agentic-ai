import { API_BASE_URL } from "./config.js"
import {
  getAccessToken,
  refreshAccessToken,
  clearAdminSession,
} from "./auth"



export async function apiFetch(
  endpoint,
  options = {}
) {
  let accessToken =
    await getAccessToken()

  if (!accessToken) {
    clearAdminSession()
    window.location.replace("/login")
    throw new Error(
      "Sesi admin sudah berakhir"
    )
  }

  const makeRequest = (token) => {
    const headers = new Headers(
      options.headers || {}
    )

    headers.set(
      "Authorization",
      `Bearer ${token}`
    )

    if (
      options.body &&
      !headers.has("Content-Type")
    ) {
      headers.set(
        "Content-Type",
        "application/json"
      )
    }

    return fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers,
        credentials: "include",
      }
    )
  }

  let response =
    await makeRequest(accessToken)

  if (response.status === 401) {
    const refreshed =
      await refreshAccessToken()

    if (!refreshed) {
      clearAdminSession()

      window.location.replace(
        "/login"
      )

      throw new Error(
        "Sesi admin sudah berakhir"
      )
    }

    accessToken =
      localStorage.getItem(
        "admin_access_token"
      )

    if (!accessToken) {
      clearAdminSession()

      window.location.replace(
        "/login"
      )

      throw new Error(
        "Access token tidak tersedia"
      )
    }

    response =
      await makeRequest(accessToken)
  }

  // The server says this session is not an admin's: it can never work, so end it and sign in again.
  if (response.status === 403) {
    const body = await response.clone().json().catch(() => ({}))
    if (/hanya untuk admin|bukan akun admin/i.test(body?.message || body?.error || "")) {
      clearAdminSession()
      window.location.replace("/login")
      throw new Error("Akun ini bukan akun admin")
    }
  }

  return response
}
