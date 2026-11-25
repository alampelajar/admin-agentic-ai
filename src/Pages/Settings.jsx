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
    <div className="min-h-screen bg-muted p-6 text-foreground transition-colors duration-200">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="mb-6">

        <h1 className="text-2xl font-normal text-foreground">
          Settings
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Configure your THIS MY WEBSITE dashboard
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

          <div className="rounded-card border border-border bg-card transition-colors duration-200">

            {/* HEADER */}

            <div className="border-b border-border p-5">

              <h2 className="text-lg font-semibold text-foreground">
                General Settings
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage dashboard preferences
              </p>

            </div>

            {/* SETTINGS */}

            <div className="divide-y divide-border">

              {/* ================================================== */}
              {/* AUTO REFRESH */}
              {/* ================================================== */}

              <div className="flex items-center justify-between gap-6 p-5">

                <div>

                  <p className="font-medium text-foreground">
                    Auto Refresh
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Automatically refresh system information every 30 seconds
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateSetting("autoRefresh")
                  }
                  role="switch"
                  aria-checked={settings.autoRefresh}
                  aria-label="Auto refresh"
                  className="m3-switch"
                />

              </div>

              {/* ================================================== */}
              {/* MAINTENANCE MODE */}
              {/* ================================================== */}

              <div className="flex items-center justify-between gap-6 p-5">

                <div>

                  <p className="font-medium text-foreground">
                    Maintenance Mode
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Disable access to the normal website while maintenance is active
                  </p>

                  {settings.maintenanceMode && (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                      Website sedang dalam maintenance.
                    </p>
                  )}

                  {maintenanceError && (
                    <p className="mt-2 text-xs font-medium text-destructive">
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
                  role="switch"
                  aria-checked={settings.maintenanceMode}
                  aria-label="Maintenance mode"
                  className="m3-switch"
                />

              </div>

            </div>

          </div>

          {/* ================================================== */}
          {/* SAVE BUTTON */}
          {/* ================================================== */}

          <div className="mt-6 flex items-center justify-end gap-3">

            {saved && (
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Settings saved successfully
              </span>
            )}

            <button
              type="button"
              onClick={handleSave}
              className="
                state-layer rounded-full transition-colors duration-200 ease-m3
                bg-primary
                px-6
                h-10
                text-sm
                font-medium
                text-primary-foreground
               
               
               
               
               
               
               
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

          <div className="rounded-card border border-border bg-card transition-colors duration-200">

            {/* HEADER */}

            <div className="border-b border-border p-5">

              <h2 className="text-lg font-semibold text-foreground">
                System Information
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Current system information
              </p>

            </div>

            <div className="space-y-4 p-5">

              {/* ================================================== */}
              {/* VERSION */}
              {/* ================================================== */}

              <div className="rounded-card bg-muted p-4">

                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Version
                </p>

                <p className="mt-1 font-semibold text-foreground">
                  {systemInfo.version}
                </p>

              </div>

              {/* ================================================== */}
              {/* ENVIRONMENT */}
              {/* ================================================== */}

              <div className="rounded-card bg-muted p-4">

                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Environment
                </p>

                <p className="mt-1 font-semibold text-foreground">
                  {systemInfo.environment}
                </p>

              </div>

              {/* ================================================== */}
              {/* API STATUS */}
              {/* ================================================== */}

              <div className="rounded-card bg-muted p-4">

                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  API Status
                </p>

                <div className="mt-1 flex items-center gap-2">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      systemInfo.apiStatus ===
                      "Operational"
                        ? "bg-current text-green-700 dark:text-green-300"
                        : systemInfo.apiStatus ===
                            "Checking"
                          ? "bg-current text-amber-700 dark:text-amber-300"
                          : "bg-current text-destructive dark:text-red-300"
                    }`}
                  />

                  <p
                    className={`font-semibold ${
                      systemInfo.apiStatus ===
                      "Operational"
                        ? "text-green-700 dark:text-green-300"
                        : systemInfo.apiStatus ===
                            "Checking"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-destructive"
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

              <div className="rounded-card bg-muted p-4">

                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Database
                </p>

                <div className="mt-1 flex items-center gap-2">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      systemInfo.databaseStatus ===
                      "Connected"
                        ? "bg-current text-green-700 dark:text-green-300"
                        : systemInfo.databaseStatus ===
                            "Checking"
                          ? "bg-current text-amber-700 dark:text-amber-300"
                          : "bg-current text-destructive dark:text-red-300"
                    }`}
                  />

                  <p
                    className={`font-semibold ${
                      systemInfo.databaseStatus ===
                      "Connected"
                        ? "text-green-700 dark:text-green-300"
                        : systemInfo.databaseStatus ===
                            "Checking"
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-destructive"
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

              <div className="rounded-card bg-muted p-4">

                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Active Agents
                </p>

                <p className="mt-1 font-semibold text-foreground">
                  {loadingInfo
                    ? "Loading..."
                    : `${systemInfo.activeAgents} agents`}
                </p>

              </div>

              {/* ================================================== */}
              {/* MAINTENANCE STATUS */}
              {/* ================================================== */}

              <div className="rounded-card bg-muted p-4">

                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Maintenance
                </p>

                <div className="mt-1 flex items-center gap-2">

                  <span
                    className={`h-2 w-2 rounded-full ${
                      maintenanceLoading
                        ? "bg-current text-amber-700 dark:text-amber-300"
                        : settings.maintenanceMode
                          ? "bg-current text-amber-700 dark:text-amber-300"
                          : "bg-current text-green-700 dark:text-green-300"
                    }`}
                  />

                  <p
                    className={`font-semibold ${
                      maintenanceLoading
                        ? "text-amber-700 dark:text-amber-300"
                        : settings.maintenanceMode
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-green-700 dark:text-green-300"
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
              state-layer rounded-full transition-colors duration-200 ease-m3
              border
              border-input
              bg-transparent
              px-6
              h-10
              text-sm
              font-medium
              text-primary
             
             
              disabled:cursor-not-allowed
              disabled:border-foreground/12 disabled:text-foreground/38
             
             
             
             
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
            <p className="mt-3 text-xs leading-5 text-destructive">
              {infoError}
            </p>
          )}

        </div>

      </div>

    </div>
  )
}

export default Settings