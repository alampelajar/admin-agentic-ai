import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { useConfirm } from "../components/ui/confirm-dialog.jsx"

const initialForm = {
  provider_name: "",
  provider_type: "openrouter",
  base_url: "https://openrouter.ai/api/v1",
  api_key: "",
  name: "",
  model_id: "",
  description: "",
  agent_id: "",
}

// The choice that links a model to every active agent instead of one.
const ALL_AGENTS = "all"

// agent_id is set to undefined for "all" so the form's own "all" string is dropped from the JSON.
const agentTarget = (value) => (value === ALL_AGENTS ? { agent_id: undefined, all_agents: true } : { agent_id: Number(value) })

function formatDate(value) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : formatWib(date)
}

function Models() {
  const [askToConfirm, confirmDialog] = useConfirm()
  const [models, setModels] = useState([])
  const [agents, setAgents] = useState([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [agentLoadError, setAgentLoadError] = useState("")
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [editingModel, setEditingModel] = useState(null)
  const [editForm, setEditForm] = useState({ name: "", model_id: "", description: "", agent_id: "" })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showAdd, setShowAdd] = useState(false)

  const loadModels = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await apiFetch("/api/admin/ai/models")
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Gagal mengambil model global.")
      }
      setModels(Array.isArray(data.models) ? data.models : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil model global.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadModels()
  }, [loadModels])

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true)
    setAgentLoadError("")
    try {
      const response = await apiFetch("/api/admin/agents")
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Gagal mengambil daftar agent.")
      }
      setAgents(Array.isArray(data.agents) ? data.agents : [])
    } catch (err) {
      setAgents([])
      setAgentLoadError(err instanceof Error ? err.message : "Gagal mengambil daftar agent.")
    } finally {
      setAgentsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAgents()
  }, [loadAgents])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError("")
    setSuccess("")
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    if (!form.agent_id) {
      setError("Pilih Agent tujuan model terlebih dahulu.")
      return
    }
    setSaving(true)
    try {
      const response = await apiFetch("/api/admin/ai/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          provider_name: form.provider_name.trim(),
          base_url: form.base_url.trim(),
          api_key: form.api_key.trim(),
          name: form.name.trim(),
          model_id: form.model_id.trim(),
          description: form.description.trim(),
          ...agentTarget(form.agent_id),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Gagal menambahkan model global.")
      }
      setForm((current) => ({ ...initialForm, provider_name: current.provider_name, provider_type: current.provider_type, base_url: current.base_url, api_key: "" }))
      setSuccess(
        form.agent_id === ALL_AGENTS
          ? "Model global berhasil ditambahkan dan dihubungkan ke semua agent aktif. Model tersedia untuk semua akun."
          : "Model global berhasil ditambahkan dan dihubungkan hanya ke agent yang dipilih. Model tersedia untuk semua akun pada agent tersebut."
      )
      setShowAdd(false)
      await loadModels()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambahkan model global.")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (model) => {
    setUpdatingId(model.id)
    setError("")
    setSuccess("")
    try {
      const response = await apiFetch(`/api/admin/ai/models/${model.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !model.is_active }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Gagal mengubah status model.")
      }
      setSuccess(`Model ${model.name} sekarang ${!model.is_active ? "aktif" : "nonaktif"}.`)
      await loadModels()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status model.")
    } finally {
      setUpdatingId(null)
    }
  }

  const startEditing = (model) => {
    setEditingModel(model)
    setEditForm({
      name: model.name || "",
      model_id: model.model_id || "",
      description: model.description || "",
      agent_id: !Array.isArray(model.agents) ? "" : model.agents.length === 1
        ? String(model.agents[0].id)
        : agents.length > 1 && model.agents.length === agents.length
          ? ALL_AGENTS
          : "",
    })
    setError("")
    setSuccess("")
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target
    setEditForm((current) => ({ ...current, [name]: value }))
  }

  const handleUpdate = async (event) => {
    event.preventDefault()
    if (!editingModel) return
    if (!editForm.agent_id) {
      setError("Pilih tepat satu Agent tujuan untuk model ini.")
      return
    }

    setUpdatingId(editingModel.id)
    setError("")
    setSuccess("")
    try {
      const response = await apiFetch(`/api/admin/ai/models/${editingModel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          model_id: editForm.model_id.trim(),
          description: editForm.description.trim(),
          ...agentTarget(editForm.agent_id),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) throw new Error(data?.error || data?.message || "Gagal menyimpan perubahan model.")
      setEditingModel(null)
      setSuccess(`Model ${editForm.name.trim()} berhasil diperbarui.`)
      await loadModels()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan model.")
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteModel = async (model) => {
    const confirmed = await askToConfirm({
      title: `Hapus model "${model.name}"?`,
      description: "Model akan dihapus dari katalog global dan tidak lagi tersedia bagi pengguna.",
      confirmLabel: "Hapus",
      cancelLabel: "Batal",
    })
    if (!confirmed) return

    setUpdatingId(model.id)
    setError("")
    setSuccess("")
    try {
      const response = await apiFetch(`/api/admin/ai/models/${model.id}`, { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) throw new Error(data?.error || data?.message || "Gagal menghapus model.")
      setSuccess(`Model ${model.name} berhasil dihapus.`)
      await loadModels()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus model.")
    } finally {
      setUpdatingId(null)
    }
  }

  const activeModels = models.filter((model) => model.is_active).length

  const fieldClass =
    "h-14 w-full rounded-field hover:border-foreground transition-colors duration-200 ease-m3 border border-input bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary disabled:opacity-50"
  const areaClass =
    "w-full resize-y rounded-field hover:border-foreground transition-colors duration-200 ease-m3 border border-input bg-transparent px-4 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
  const labelClass = "mb-2 block text-sm font-medium"
  const hintClass = "mt-1.5 text-sm text-muted-foreground"
  const primaryButton =
    "h-10 state-layer rounded-full transition-colors duration-200 ease-m3 bg-primary px-6 text-sm font-medium text-primary-foreground disabled:bg-foreground/12 disabled:text-foreground/38"
  const secondaryButton =
    "h-10 state-layer rounded-full transition-colors duration-200 ease-m3 border border-input bg-transparent px-6 text-sm font-medium disabled:border-foreground/12 disabled:text-foreground/38 text-primary"

  const agentOptions = (
    <>
      <option value="">{agentsLoading ? "Memuat agent..." : "Pilih agent"}</option>
      {agents.length > 1 && <option value={ALL_AGENTS}>Semua agent</option>}
      {agents.map((agent) => (
        <option key={agent.id} value={String(agent.id)}>
          {agent.name}
        </option>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6">
      {confirmDialog}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-2xl font-normal">Model AI</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Memuat model..."
              : `${models.length} model di katalog sistem, ${activeModels} aktif. Semua akun dapat memakainya.`}
          </p>
        </div>
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            setError("")
            setSuccess("")
            setShowAdd(true)
          }}
        >
          Tambah model
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-card bg-error-container px-4 py-3 text-sm font-medium text-on-error-container">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-4 rounded-card bg-muted px-4 py-3 text-sm">
          {success}
        </p>
      )}

      <section className="rounded-card bg-card text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <h2 className="text-base font-semibold">Katalog model sistem</h2>
          <button type="button" className={secondaryButton} onClick={() => void loadModels()} disabled={loading}>
            Muat ulang
          </button>
        </div>

        {loading ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">Memuat model...</p>
        ) : models.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">Belum ada model global.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-4 py-0">Model</th>
                  <th className="px-4 py-0">Provider</th>
                  <th className="px-4 py-0">Agent</th>
                  <th className="px-4 py-0">Status</th>
                  <th className="px-4 py-0">Dibuat</th>
                  <th className="px-4 py-0 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id} className="align-top transition-colors hover:bg-muted/60">
                    <td className="max-w-sm px-4 py-2">
                      <p className="truncate font-medium">{model.name}</p>
                      {model.model_id !== model.name && <p className="truncate text-muted-foreground">{model.model_id}</p>}
                      {model.description && <p className="mt-1 line-clamp-2 text-muted-foreground">{model.description}</p>}
                    </td>
                    <td className="px-4 py-2">{model.provider?.name || "–"}</td>
                    <td className="max-w-xs px-4 py-2 text-muted-foreground">
                      {Array.isArray(model.agents) && model.agents.length > 0
                        ? agents.length > 1 && model.agents.length === agents.length
                          ? `Semua agent (${agents.length})`
                          : model.agents.map((agent) => agent.name).join(", ")
                        : "Belum ditetapkan"}
                    </td>
                    <td className="px-4 py-2">
                      <label className="inline-flex cursor-pointer items-center gap-3 whitespace-nowrap">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(model.is_active)}
                          aria-label={`${model.is_active ? "Nonaktifkan" : "Aktifkan"} ${model.name}`}
                          onClick={() => void toggleActive(model)}
                          disabled={updatingId === model.id}
                          className="m3-switch"
                        />
                        <span className={model.is_active ? "" : "text-muted-foreground"}>
                          {updatingId === model.id ? "Menyimpan..." : model.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </label>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{formatDate(model.created_at)}</td>
                    <td className="w-40 px-4 py-2">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          type="button"
                          className="h-10 state-layer rounded-full transition-colors duration-200 ease-m3 border border-input bg-transparent px-6 text-sm font-medium disabled:border-foreground/12 disabled:text-foreground/38 text-primary"
                          onClick={() => startEditing(model)}
                          disabled={updatingId === model.id}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="h-10 state-layer rounded-full transition-colors duration-200 ease-m3 px-3 text-sm font-medium text-destructive disabled:text-foreground/38"
                          onClick={() => void deleteModel(model)}
                          disabled={updatingId === model.id}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center m3-scrim p-4"
          onClick={() => {
            if (!saving) setShowAdd(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-model-title"
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-dialog bg-surface-high p-6 text-card-foreground shadow-m3-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-model-title" className="text-2xl font-normal">Tambah model bawaan</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  API key disimpan terenkripsi di backend. Gunakan endpoint yang kompatibel dengan OpenAI Chat Completions.
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setShowAdd(false)}
                disabled={saving}
                className="size-10 shrink-0 state-layer rounded-full transition-colors duration-200 ease-m3 text-xl leading-none text-muted-foreground"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="provider_name" className={labelClass}>Nama provider</label>
                <input id="provider_name" name="provider_name" value={form.provider_name} onChange={handleChange} required placeholder="Contoh: OpenRouter" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="provider_type" className={labelClass}>Tipe provider</label>
                <select id="provider_type" name="provider_type" value={form.provider_type} onChange={handleChange} className={fieldClass}>
                  <option value="openrouter">OpenRouter</option>
                  <option value="openai">OpenAI-compatible / OpenAI</option>
                  <option value="nararouter">NaraRouter</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="google">Google-compatible</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="base_url" className={labelClass}>Base URL</label>
                <input id="base_url" name="base_url" type="url" value={form.base_url} onChange={handleChange} required placeholder="https://provider.example/v1" className={fieldClass} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="api_key" className={labelClass}>API key sistem</label>
                <input id="api_key" name="api_key" type="password" autoComplete="new-password" value={form.api_key} onChange={handleChange} required placeholder="Masukkan API key milik sistem" aria-describedby="api-key-hint" className={fieldClass} />
                <p id="api-key-hint" className={hintClass}>
                  User memakai layanan melalui API key ini. Biaya dan batas penggunaan berada pada akun provider milik sistem.
                </p>
              </div>
              <div>
                <label htmlFor="name" className={labelClass}>Nama model untuk user</label>
                <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Contoh: GPT Model" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="model_id" className={labelClass}>Model ID dari provider</label>
                <input id="model_id" name="model_id" value={form.model_id} onChange={handleChange} required placeholder="Contoh: provider/model-id" className={fieldClass} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="agent_id" className={labelClass}>Agent tujuan</label>
                <select
                  id="agent_id"
                  name="agent_id"
                  value={form.agent_id}
                  onChange={handleChange}
                  required
                  disabled={agentsLoading || saving}
                  aria-describedby="agent-hint"
                  className={fieldClass}
                >
                  {agentOptions}
                </select>
                {agentLoadError && <p role="alert" className="mt-1.5 text-sm text-destructive">{agentLoadError}</p>}
                <p id="agent-hint" className={hintClass}>
                  Pilih satu agent, atau "Semua agent" untuk menghubungkan model ke setiap agent aktif.
                </p>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="description" className={labelClass}>Deskripsi (opsional)</label>
                <textarea id="description" name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Kegunaan atau catatan model" className={areaClass} />
              </div>
              <div className="flex justify-end gap-3 md:col-span-2">
                <button type="button" className={secondaryButton} onClick={() => setShowAdd(false)} disabled={saving}>Batal</button>
                <button type="submit" className={primaryButton} disabled={saving}>
                  {saving ? "Menyimpan..." : "Tambah model ke agent"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editingModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center m3-scrim p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-model-title"
            className="max-h-full w-full max-w-xl overflow-y-auto rounded-dialog bg-surface-high p-6 text-card-foreground shadow-m3-3"
          >
            <h2 id="edit-model-title" className="text-2xl font-normal">Edit model AI</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Perubahan berlaku bagi semua pengguna yang memakai model global ini.
            </p>
            <form onSubmit={handleUpdate} className="mt-6 space-y-4">
              <div>
                <label htmlFor="edit-model-name" className={labelClass}>Nama model</label>
                <input id="edit-model-name" name="name" value={editForm.name} onChange={handleEditChange} required maxLength={150} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="edit-model-id" className={labelClass}>Model ID provider</label>
                <input id="edit-model-id" name="model_id" value={editForm.model_id} onChange={handleEditChange} required maxLength={200} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="edit-model-agent" className={labelClass}>Agent tujuan</label>
                <select
                  id="edit-model-agent"
                  name="agent_id"
                  value={editForm.agent_id}
                  onChange={handleEditChange}
                  required
                  disabled={updatingId === editingModel.id || agentsLoading}
                  className={fieldClass}
                >
                  {agentOptions}
                </select>
                {editForm.agent_id === "" && Array.isArray(editingModel.agents) && editingModel.agents.length > 1 && (
                  <p className={hintClass}>
                    Model ini terhubung ke {editingModel.agents.length} agent. Pilih satu agent atau "Semua agent" untuk menyimpan relasinya.
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="edit-model-description" className={labelClass}>Deskripsi</label>
                <textarea id="edit-model-description" name="description" value={editForm.description} onChange={handleEditChange} rows={3} className={areaClass} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingModel(null)} disabled={updatingId === editingModel.id} className={secondaryButton}>
                  Batal
                </button>
                <button type="submit" disabled={updatingId === editingModel.id} className={primaryButton}>
                  {updatingId === editingModel.id ? "Menyimpan..." : "Simpan perubahan"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default Models
