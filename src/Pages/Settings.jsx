import { useEffect, useState } from "react"

import { apiFetch } from "../lib/api"

const DEFAULT_SETTINGS = {
  autoRefresh: true,
  maintenanceMode: false,
}

const loadSavedSettings = () => {
  try {
    const saved = localStorage.getItem(
      "admin_dashboard_settings"
    )

    if (!saved) {
      return DEFAULT_SETTINGS
    }

    const parsed = JSON.parse(saved)

    return {
      autoRefresh:
        parsed.autoRefresh !== false,

      maintenanceMode: false,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function Settings() {
  const [settings, setSettings] = useState(
    loadSavedSettings
  )

  const [saved, setSaved] = useState(false)

  const [maintenanceLoading, setMaintenanceLoading] =
    useState(true)

  const [maintenanceSaving, setMaintenanceSaving] =
    useState(false)

  const [maintenanceError, setMaintenanceError] =
    useState("")

  const [systemInfo, setSystemInfo] = useState({
    version: "v1.0.0",

    environment:
      import.meta.env.MODE === "development"
        ? "Development"
        : "Production",

    apiStatus: "Checking",

    databaseStatus: "Checking",

    activeAgents: 0,
  })

  const [loadingInfo, setLoadingInfo] =
    useState(true)

  const [infoError, setInfoError] =
    useState("")

  // ============================================================
  // SAVE SETTINGS
  // ============================================================

  const updateSetting = (key) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }))

    setSaved(false)
  }

  const handleSave = () => {
    localStorage.setItem(
      "admin_dashboard_settings",
      JSON.stringify({
        autoRefresh: settings.autoRefresh,
      })
    )

    setSaved(true)

    window.setTimeout(() => {
      setSaved(false)
    }, 2500)
  }

  // ============================================================
  // LOAD MAINTENANCE STATUS
  // ============================================================

  const loadMaintenanceStatus = async () => {
    setMaintenanceLoading(true)
    setMaintenanceError("")

    try {
      const response = await apiFetch(
        "/api/system/maintenance"
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.message ||
            "Gagal mengambil status maintenance."
        )
      }

      setSettings((current) => ({
        ...current,
        maintenanceMode:
          data.maintenance === true,
      }))
    } catch (error) {
      console.error(
        "Gagal mengambil maintenance status:",
        error
      )

      setMaintenanceError(
        error.message ||
          "Gagal mengambil status maintenance."
      )
    } finally {
      setMaintenanceLoading(false)
    }
  }

  // ============================================================
  // UPDATE MAINTENANCE MODE
  // ============================================================

  const updateMaintenanceMode = async () => {
    if (
      maintenanceLoading ||
      maintenanceSaving
    ) {
      return
    }

    const nextValue =
      !settings.maintenanceMode

    setMaintenanceSaving(true)
    setMaintenanceError("")

    try {
      const response = await apiFetch(
        "/api/admin/settings/maintenance",
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            maintenance: nextValue,
          }),
        }
      )

      const data = await response
        .json()
        .catch(() => ({}))

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.message ||
            "Gagal memperbarui maintenance mode."
        )
      }

      setSettings((current) => ({
        ...current,
        maintenanceMode:
          data.maintenance === true,
      }))

      setSaved(false)
    } catch (error) {
      console.error(
        "Gagal memperbarui maintenance mode:",
        error
      )

      setMaintenanceError(
        error.message ||
          "Gagal memperbarui maintenance mode."
      )
    } finally {
      setMaintenanceSaving(false)
    }
  }

  // ============================================================
  // LOAD SYSTEM INFORMATION
  // ============================================================

  const loadSystemInfo = async () => {
    setLoadingInfo(true)
    setInfoError("")

    try {
      const [
        usersResponse,
        agentsResponse,
        tasksResponse,
      ] = await Promise.all([
        apiFetch("/api/admin/users"),
        apiFetch("/api/admin/agent-catalog"),
        apiFetch("/api/admin/tasks"),
      ])

      const [
        usersData,
        agentsData,
        tasksData,
      ] = await Promise.all([
        usersResponse
          .json()
          .catch(() => ({})),

        agentsResponse
          .json()
          .catch(() => ({})),

        tasksResponse
          .json()
          .catch(() => ({})),
      ])

      if (
        !usersResponse.ok ||
        !agentsResponse.ok ||
        !tasksResponse.ok
      ) {
        throw new Error(
          "Gagal mengambil informasi sistem."
        )
      }

      const agents = Array.isArray(
        agentsData?.agents
      )
        ? agentsData.agents
        : []

      setSystemInfo((current) => ({
        ...current,

        apiStatus: "Operational",

        databaseStatus: "Connected",

        activeAgents: agents.filter(
          (agent) => agent.is_active
        ).length,
      }))

      void usersData
      void tasksData
    } catch (error) {
      console.error(
        "Gagal mengambil system information:",
        error
      )

      setSystemInfo((current) => ({
        ...current,

        apiStatus: "Unavailable",

        databaseStatus: "Unavailable",
      }))

      setInfoError(
        error.message ||
          "Gagal mengambil informasi sistem."
      )
    } finally {
      setLoadingInfo(false)
    }
  }

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadSystemInfo()
    loadMaintenanceStatus()
  }, [])

  // ============================================================
  // AUTO REFRESH SYSTEM INFORMATION
  // ============================================================

  useEffect(() => {
    if (!settings.autoRefresh) {
      return
    }

    const interval = window.setInterval(() => {
      loadSystemInfo()
    }, 30000)

    return () => {
      window.clearInterval(interval)
    }
  }, [settings.autoRefresh])

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="mb-6">

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure your Agentic AI dashboard
        </p>

      </div>

      {/* ====================================================== */}
      {/* MAIN GRID */}
      {/* ====================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* ==================================================== */}
        {/* GENERAL SETTINGS */}
        {/* ==================================================== */}

        <div className="xl:col-span-2">

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">

            {/* HEADER */}

            <div className="border-b border-slate-200 p-5 dark:border-slate-800">

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                General Settings
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage dashboard preferences
              </p>

            </div>

            {/* SETTINGS */}

            <div className="divide-y divide-slate-100 dark:divide-slate-800">

              {/* ================================================== */}
              {/* AUTO REFRESH */}
              {/* ================================================== */}

              <div className="flex items-center justify-between gap-6 p-5">

                <div>

                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    Auto Refresh
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Automatically refresh system information every 30 seconds
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateSetting("autoRefresh")
                  }
                  aria-pressed={
                    settings.autoRefresh
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    settings.autoRefresh
                      ? "bg-slate-900 dark:bg-white"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >

                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                      settings.autoRefresh
                        ? "left-6 dark:bg-slate-900"
                        : "left-1"
                    }`}
                  />

                </button>

              </div>

              {/* ================================================== */}
              {/* MAINTENANCE MODE */}
              {/* ================================================== */}

              <div className="flex items-center justify-between gap-6 p-5">

                <div>

                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    Maintenance Mode
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Disable access to the normal website while maintenance is active
                  </p>

                  {settings.maintenanceMode && (
                    <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                      Website sedang dalam maintenance.
                    </p>
                  )}

                  {maintenanceError && (
                    <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                      {maintenanceError}
                    </p>
                  )}

                </div>

                <button
                  type="button"
                  onClick={updateMaintenanceMode}
                  disabled={
                    maintenanceLoading ||
                    maintenanceSaving
                  }
                  aria-pressed={
                    settings.maintenanceMode
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    settings.maintenanceMode
                      ? "bg-amber-500"
                      : "bg-slate-300 dark:bg-slate-700"
                  } ${
                    maintenanceLoading ||
                    maintenanceSaving
                      ? "cursor-not-allowed opacity-50"
                      : ""
                  }`}
                >

                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
                      settings.maintenanceMode
                        ? "left-6"
                        : "left-1"
                    }`}
                  />

                </button>

              </div>

            </div>

          </div>

          {/* ================================================== */}
          {/* SAVE BUTTON */}
          {/* ================================================== */}

          <div className="mt-6 flex items-center justify-end gap-3">

            {saved && (
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                Settings saved successfully
              </span>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="
                rounded-lg
                bg-slate-900
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-slate-800
                hover:shadow-md
                dark:bg-white
                dark:text-slate-900
                dark:hover:bg-slate-200
              "
            >
              Save Changes
            </button>

          </div>

        </div>

        {/* ==================================================== */}
        {/* SYSTEM INFORMATION */}
        {/* ==================================================== */}

        <div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900">

            {/* HEADER */}

            <div className="border-b border-slate-200 p-5 dark:border-slate-800">

              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                System Information
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Current system information
              </p>

            </div>

            <div className="space-y-4 p-5">

              {/* ================================================== */}
              {/* VERSION */}
              {/* ================================================== */}

              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Version
                </p>

                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                  {systemInfo.version}
                </p>

              </div>

              {/* ================================================== */}
              {/* ENVIRONMENT */}
              {/* ================================================== */}

              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Environment
                </p>

                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                  {systemInfo.environment}
                </p>

              </div>

              {/* ================================================== */}
              {/* API STATUS */}
              {/* ================================================== */}

              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  API Status
                </p>

                <div className="mt-1 flex items-center gap-2">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      systemInfo.apiStatus ===
                      "Operational"
                        ? "bg-green-500"
                        : systemInfo.apiStatus ===
                            "Checking"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                  />

                  <p
                    className={`font-semibold ${
                      systemInfo.apiStatus ===
                      "Operational"
                        ? "text-green-700 dark:text-green-400"
                        : systemInfo.apiStatus ===
                            "Checking"
                          ? "text-yellow-700 dark:text-yellow-400"
                          : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {loadingInfo
                      ? "Checking"
                      : systemInfo.apiStatus}
                  </p>

                </div>

              </div>

              {/* ================================================== */}
              {/* DATABASE */}
              {/* ================================================== */}

              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Database
                </p>

                <div className="mt-1 flex items-center gap-2">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      systemInfo.databaseStatus ===
                      "Connected"
                        ? "bg-green-500"
                        : systemInfo.databaseStatus ===
                            "Checking"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                  />

                  <p
                    className={`font-semibold ${
                      systemInfo.databaseStatus ===
                      "Connected"
                        ? "text-green-700 dark:text-green-400"
                        : systemInfo.databaseStatus ===
                            "Checking"
                          ? "text-yellow-700 dark:text-yellow-400"
                          : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {loadingInfo
                      ? "Checking"
                      : systemInfo.databaseStatus}
                  </p>

                </div>

              </div>

              {/* ================================================== */}
              {/* ACTIVE AGENTS */}
              {/* ================================================== */}

              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Active Agents
                </p>

                <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
                  {loadingInfo
                    ? "Loading..."
                    : `${systemInfo.activeAgents} agents`}
                </p>

              </div>

              {/* ================================================== */}
              {/* MAINTENANCE STATUS */}
              {/* ================================================== */}

              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">

                <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Maintenance
                </p>

                <div className="mt-1 flex items-center gap-2">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      maintenanceLoading
                        ? "bg-yellow-500"
                        : settings.maintenanceMode
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                  />

                  <p
                    className={`font-semibold ${
                      maintenanceLoading
                        ? "text-yellow-700 dark:text-yellow-400"
                        : settings.maintenanceMode
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-green-700 dark:text-green-400"
                    }`}
                  >
                    {maintenanceLoading
                      ? "Checking"
                      : settings.maintenanceMode
                        ? "Active"
                        : "Off"}
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* ================================================== */}
          {/* REFRESH SYSTEM INFORMATION */}
          {/* ================================================== */}

          <button
            type="button"
            onClick={() => {
              loadSystemInfo()
              loadMaintenanceStatus()
            }}
            disabled={
              loadingInfo ||
              maintenanceLoading
            }
            className="
              mt-4
              w-full
              rounded-lg
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-semibold
              text-slate-700
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:border-slate-800
              dark:bg-slate-900
              dark:text-slate-200
              dark:hover:bg-slate-800
            "
          >
            {loadingInfo ||
            maintenanceLoading
              ? "Refreshing..."
              : "Refresh System Information"}
          </button>

          {/* ================================================== */}
          {/* ERROR */}
          {/* ================================================== */}

          {infoError && (
            <p className="mt-3 text-xs leading-5 text-red-600 dark:text-red-400">
              {infoError}
            </p>
          )}

        </div>

      </div>

    </div>
  )
}

export default Settings