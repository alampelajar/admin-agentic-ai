import { useEffect, useState } from "react"

import { CheckCircle2, RotateCw, TriangleAlert } from "lucide-react"

import { apiFetch } from "../lib/api"
import { Button } from "../components/ui/button.jsx"
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/card.jsx"
import { Label } from "../components/ui/label.jsx"
import { Switch } from "../components/ui/switch.jsx"
import { ErrorState, Page, PageHeader, StatusDot } from "../components/page.jsx"

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
    <Page>
      <PageHeader title="Settings" description="Configure your THIS MY WEBSITE dashboard" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-5">
              <CardTitle className="text-base">General Settings</CardTitle>
              <CardDescription>Manage dashboard preferences</CardDescription>
            </CardHeader>

            <div className="divide-y">
              <div className="flex items-center justify-between gap-6 p-5">
                <div>
                  <Label htmlFor="auto-refresh" className="text-sm font-medium">
                    Auto Refresh
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground">Automatically refresh system information every 30 seconds</p>
                </div>
                <Switch id="auto-refresh" checked={settings.autoRefresh} onCheckedChange={() => updateSetting("autoRefresh")} />
              </div>

              <div className="flex items-center justify-between gap-6 p-5">
                <div>
                  <Label htmlFor="maintenance-mode" className="text-sm font-medium">
                    Maintenance Mode
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground">Disable access to the normal website while maintenance is active</p>
                  {settings.maintenanceMode && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <TriangleAlert className="size-3" aria-hidden="true" />
                      Website sedang dalam maintenance.
                    </p>
                  )}
                  {maintenanceError && (
                    <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                      {maintenanceError}
                    </p>
                  )}
                </div>
                <Switch
                  id="maintenance-mode"
                  checked={settings.maintenanceMode}
                  onCheckedChange={updateMaintenanceMode}
                  disabled={maintenanceLoading || maintenanceSaving}
                />
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span role="status" className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Settings saved successfully
              </span>
            )}
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-5">
              <CardTitle className="text-base">System Information</CardTitle>
              <CardDescription>Current system information</CardDescription>
            </CardHeader>

            <dl className="divide-y">
              <InfoRow label="Version">{systemInfo.version}</InfoRow>
              <InfoRow label="Environment">{systemInfo.environment}</InfoRow>
              <InfoRow label="API Status">
                <StatusText
                  tone={systemInfo.apiStatus === "Operational" ? "success" : systemInfo.apiStatus === "Checking" || loadingInfo ? "warning" : "danger"}
                  text={loadingInfo ? "Checking" : systemInfo.apiStatus}
                />
              </InfoRow>
              <InfoRow label="Database">
                <StatusText
                  tone={systemInfo.databaseStatus === "Connected" ? "success" : systemInfo.databaseStatus === "Checking" || loadingInfo ? "warning" : "danger"}
                  text={loadingInfo ? "Checking" : systemInfo.databaseStatus}
                />
              </InfoRow>
              <InfoRow label="Active Agents">{loadingInfo ? "Loading..." : `${systemInfo.activeAgents} agents`}</InfoRow>
              <InfoRow label="Maintenance">
                <StatusText
                  tone={maintenanceLoading || settings.maintenanceMode ? "warning" : "success"}
                  text={maintenanceLoading ? "Checking" : settings.maintenanceMode ? "Active" : "Off"}
                />
              </InfoRow>
            </dl>
          </Card>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              loadSystemInfo()
              loadMaintenanceStatus()
            }}
            disabled={loadingInfo || maintenanceLoading}
          >
            <RotateCw className={loadingInfo || maintenanceLoading ? "animate-spin" : undefined} aria-hidden="true" />
            {loadingInfo || maintenanceLoading ? "Refreshing..." : "Refresh System Information"}
          </Button>

          {infoError && <ErrorState title="Could not load system information" message={infoError} />}
        </div>
      </div>
    </Page>
  )
}

function InfoRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

function StatusText({ tone, text }) {
  const color = {
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-700 dark:text-amber-400",
    danger: "text-destructive",
  }[tone]
  return (
    <span className={`inline-flex items-center gap-2 ${color}`}>
      <StatusDot tone={tone} />
      {text}
    </span>
  )
}

export default Settings
