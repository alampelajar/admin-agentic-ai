import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { useConfirm } from "../components/ui/confirm-dialog.jsx"
import { Boxes, Loader2, Plus, RotateCw } from "lucide-react"
import { Card, CardAction, CardHeader, CardTitle } from "../components/ui/card.jsx"
import { DialogFooter } from "../components/ui/dialog.jsx"
import { Switch } from "../components/ui/switch.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, SuccessNotice } from "../components/page.jsx"
import { FormDialog } from "../components/dialogs.jsx"
import { Button } from "../components/ui/button.jsx"
import { Input } from "../components/ui/input.jsx"
import { Label } from "../components/ui/label.jsx"
import { NativeSelect, NativeSelectOption } from "../components/ui/native-select.jsx"
import { Textarea } from "../components/ui/textarea.jsx"

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

  // The builder default is the model people without premium build websites with.
  const toggleBuilderDefault = async (model) => {
    setUpdatingId(model.id)
    setError("")
    setSuccess("")
    try {
      const response = await apiFetch(`/api/admin/ai/models/${model.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_builder_default: !model.is_builder_default }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Could not change the builder default.")
      }
      setSuccess(
        model.is_builder_default
          ? `${model.name} is no longer the website builder default.`
          : `${model.name} is now the website builder default for free accounts.`
      )
      await loadModels()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the builder default.")
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

  const agentOptions = (
    <>
      <NativeSelectOption value="">{agentsLoading ? "Memuat agent..." : "Pilih agent"}</NativeSelectOption>
      {agents.length > 1 && <NativeSelectOption value={ALL_AGENTS}>Semua agent</NativeSelectOption>}
      {agents.map((agent) => (
        <NativeSelectOption key={agent.id} value={String(agent.id)}>
          {agent.name}
        </NativeSelectOption>
      ))}
    </>
  )

  return (
    <Page>
      {confirmDialog}
      <PageHeader
        title="Model AI"
        description={
          loading
            ? "Memuat model..."
            : `${models.length} model di katalog sistem, ${activeModels} aktif. Semua akun dapat memakainya.`
        }
        actions={
          <Button
            onClick={() => {
              setError("")
              setSuccess("")
              setShowAdd(true)
            }}
          >
            <Plus aria-hidden="true" />
            Tambah model
          </Button>
        }
      />

      {error && <ErrorState title="Terjadi kesalahan" message={error} />}
      {success && <SuccessNotice>{success}</SuccessNotice>}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">Katalog model sistem</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => void loadModels()} disabled={loading}>
              <RotateCw className={loading ? "animate-spin" : undefined} aria-hidden="true" />
              Muat ulang
            </Button>
          </CardAction>
        </CardHeader>

        {loading ? (
          <LoadingRows rows={4} label="Memuat model" className="p-4" />
        ) : models.length === 0 ? (
          <EmptyState icon={Boxes} title="Belum ada model global" className="m-4" action={<Button size="sm" onClick={() => setShowAdd(true)}>Tambah model</Button>}>
            Model yang ditambahkan di sini dipakai oleh semua akun.
          </EmptyState>
        ) : (
            <Table className="min-w-225">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Builder default</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="pr-4 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow key={model.id} className="align-top">
                    <TableCell className="max-w-sm pl-4 whitespace-normal">
                      <p className="truncate font-medium">{model.name}</p>
                      {model.model_id !== model.name && <p className="truncate text-muted-foreground">{model.model_id}</p>}
                      {model.description && <p className="mt-1 line-clamp-2 text-muted-foreground">{model.description}</p>}
                    </TableCell>
                    <TableCell>{model.provider?.name || "–"}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal text-muted-foreground">
                      {Array.isArray(model.agents) && model.agents.length > 0
                        ? agents.length > 1 && model.agents.length === agents.length
                          ? `Semua agent (${agents.length})`
                          : model.agents.map((agent) => agent.name).join(", ")
                        : "Belum ditetapkan"}
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-2 whitespace-nowrap">
                        <Switch
                          checked={Boolean(model.is_active)}
                          aria-label={`${model.is_active ? "Nonaktifkan" : "Aktifkan"} ${model.name}`}
                          onCheckedChange={() => void toggleActive(model)}
                          disabled={updatingId === model.id}
                        />
                        <span className={model.is_active ? "" : "text-muted-foreground"}>
                          {updatingId === model.id ? "Menyimpan..." : model.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-2 whitespace-nowrap">
                        <Switch
                          checked={Boolean(model.is_builder_default)}
                          aria-label={`${model.is_builder_default ? "Stop using" : "Use"} ${model.name} as the website builder default`}
                          onCheckedChange={() => void toggleBuilderDefault(model)}
                          disabled={updatingId === model.id}
                        />
                        <span className={model.is_builder_default ? "" : "text-muted-foreground"}>
                          {model.is_builder_default ? "Default" : "Premium only"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(model.created_at)}</TableCell>
                    <TableCell className="w-40 pr-4">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <Button variant="outline" size="sm"
                          onClick={() => startEditing(model)}
                          disabled={updatingId === model.id}
                        >
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                          onClick={() => void deleteModel(model)}
                          disabled={updatingId === model.id}
                        >
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
      </Card>

      {showAdd && (
        <FormDialog
          title="Tambah model bawaan"
          subtitle="API key disimpan terenkripsi di backend. Gunakan endpoint yang kompatibel dengan OpenAI Chat Completions."
          onClose={() => setShowAdd(false)}
          busy={saving}
          className="sm:max-w-2xl"
        >
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider_name">Nama provider</Label>
                <Input id="provider_name" name="provider_name" value={form.provider_name} onChange={handleChange} required placeholder="Contoh: OpenRouter" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider_type">Tipe provider</Label>
                <NativeSelect id="provider_type" name="provider_type" value={form.provider_type} onChange={handleChange}>
                  <NativeSelectOption value="openrouter">OpenRouter</NativeSelectOption>
                  <NativeSelectOption value="openai">OpenAI-compatible / OpenAI</NativeSelectOption>
                  <NativeSelectOption value="nararouter">NaraRouter</NativeSelectOption>
                  <NativeSelectOption value="deepseek">DeepSeek</NativeSelectOption>
                  <NativeSelectOption value="google">Google-compatible</NativeSelectOption>
                  <NativeSelectOption value="custom">Custom</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="base_url">Base URL</Label>
                <Input id="base_url" name="base_url" type="url" value={form.base_url} onChange={handleChange} required placeholder="https://provider.example/v1" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="api_key">API key sistem</Label>
                <Input id="api_key" name="api_key" type="password" autoComplete="new-password" value={form.api_key} onChange={handleChange} required placeholder="Masukkan API key milik sistem" aria-describedby="api-key-hint" />
                <p id="api-key-hint" className="text-xs text-muted-foreground">
                  User memakai layanan melalui API key ini. Biaya dan batas penggunaan berada pada akun provider milik sistem.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama model untuk user</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Contoh: GPT Model" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model_id">Model ID dari provider</Label>
                <Input id="model_id" name="model_id" value={form.model_id} onChange={handleChange} required placeholder="Contoh: provider/model-id" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="agent_id">Agent tujuan</Label>
                <NativeSelect
                  id="agent_id"
                  name="agent_id"
                  value={form.agent_id}
                  onChange={handleChange}
                  required
                  disabled={agentsLoading || saving}
                  aria-describedby="agent-hint"
                >
                  {agentOptions}
                </NativeSelect>
                {agentLoadError && <p role="alert" className="text-sm text-destructive">{agentLoadError}</p>}
                <p id="agent-hint" className="text-xs text-muted-foreground">
                  Pilih satu agent, atau "Semua agent" untuk menghubungkan model ke setiap agent aktif.
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Deskripsi (opsional)</Label>
                <Textarea id="description" name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Kegunaan atau catatan model" />
              </div>
              <DialogFooter className="md:col-span-2">
                <Button variant="outline" onClick={() => setShowAdd(false)} disabled={saving}>Batal</Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {saving ? "Menyimpan..." : "Tambah model ke agent"}
                </Button>
              </DialogFooter>
            </form>
        </FormDialog>
      )}

      {editingModel && (
        <FormDialog
          title="Edit model AI"
          subtitle="Perubahan berlaku bagi semua pengguna yang memakai model global ini."
          onClose={() => setEditingModel(null)}
          busy={updatingId === editingModel.id}
          className="sm:max-w-xl"
        >
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-model-name">Nama model</Label>
                <Input id="edit-model-name" name="name" value={editForm.name} onChange={handleEditChange} required maxLength={150} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model-id">Model ID provider</Label>
                <Input id="edit-model-id" name="model_id" value={editForm.model_id} onChange={handleEditChange} required maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model-agent">Agent tujuan</Label>
                <NativeSelect
                  id="edit-model-agent"
                  name="agent_id"
                  value={editForm.agent_id}
                  onChange={handleEditChange}
                  required
                  disabled={updatingId === editingModel.id || agentsLoading}
                >
                  {agentOptions}
                </NativeSelect>
                {editForm.agent_id === "" && Array.isArray(editingModel.agents) && editingModel.agents.length > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Model ini terhubung ke {editingModel.agents.length} agent. Pilih satu agent atau "Semua agent" untuk menyimpan relasinya.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-model-description">Deskripsi</Label>
                <Textarea id="edit-model-description" name="description" value={editForm.description} onChange={handleEditChange} rows={3} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingModel(null)} disabled={updatingId === editingModel.id}>
                  Batal
                </Button>
                <Button type="submit" disabled={updatingId === editingModel.id}>
                  {updatingId === editingModel.id && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {updatingId === editingModel.id ? "Menyimpan..." : "Simpan perubahan"}
                </Button>
              </DialogFooter>
            </form>
        </FormDialog>
      )}
    </Page>
  )
}

export default Models
