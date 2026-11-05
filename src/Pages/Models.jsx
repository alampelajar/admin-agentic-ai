import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "../lib/api"

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
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID")
}

function Models() {
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
    const confirmed = window.confirm(`Hapus model "${model.name}"? Model akan dihapus dari katalog global dan tidak lagi tersedia bagi pengguna.`)
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
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
  const areaClass =
    "w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
  const labelClass = "mb-2 block text-sm font-medium"
  const hintClass = "mt-1.5 text-sm text-muted-foreground"
  const primaryButton =
    "h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
  const secondaryButton =
    "h-9 rounded-lg border border-input bg-card px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
  const rowAction =
    "text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-50"

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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Model AI</h1>
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
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mb-4 rounded-lg bg-muted px-4 py-3 text-sm">
          {success}
        </p>
      )}

      <section className="rounded-xl bg-card text-card-foreground">
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
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-4 py-2.5">Model</th>
                  <th className="px-4 py-2.5">Provider</th>
                  <th className="px-4 py-2.5">Agent</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Dibuat</th>
                  <th className="px-4 py-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model) => (
                  <tr key={model.id} className="align-top transition-colors hover:bg-muted/60">
                    <td className="max-w-sm px-4 py-3">
                      <p className="truncate font-medium">{model.name}</p>
                      {model.model_id !== model.name && <p className="truncate text-muted-foreground">{model.model_id}</p>}
                      {model.description && <p className="mt-1 line-clamp-2 text-muted-foreground">{model.description}</p>}
                    </td>
                    <td className="px-4 py-3">{model.provider?.name || "–"}</td>
                    <td className="max-w-xs px-4 py-3 text-muted-foreground">
                      {Array.isArray(model.agents) && model.agents.length > 0
                        ? agents.length > 1 && model.agents.length === agents.length
                          ? `Semua agent (${agents.length})`
                          : model.agents.map((agent) => agent.name).join(", ")
                        : "Belum ditetapkan"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <span aria-hidden="true" className={`size-2 rounded-full ${model.is_active ? "bg-green-600" : "bg-muted-foreground"}`} />
                        {model.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(model.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
                        <button type="button" className={rowAction} onClick={() => startEditing(model)} disabled={updatingId === model.id}>
                          Edit
                        </button>
                        <button type="button" className={rowAction} onClick={() => void toggleActive(model)} disabled={updatingId === model.id}>
                          {updatingId === model.id ? "Menyimpan..." : model.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          type="button"
                          className="text-sm font-medium text-destructive underline-offset-4 hover:underline disabled:opacity-50"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!saving) setShowAdd(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-model-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6 text-card-foreground shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-model-title" className="text-lg font-semibold">Tambah model bawaan</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  API key disimpan terenkripsi di backend. Gunakan endpoint yang kompatibel dengan OpenAI Chat Completions.
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setShowAdd(false)}
                disabled={saving}
                className="size-8 shrink-0 rounded-lg text-xl leading-none text-muted-foreground hover:bg-muted"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-model-title"
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-card p-6 text-card-foreground shadow-xl"
          >
            <h2 id="edit-model-title" className="text-lg font-semibold">Edit model AI</h2>
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
