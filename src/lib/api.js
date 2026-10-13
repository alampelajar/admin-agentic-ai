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

  return response
}
