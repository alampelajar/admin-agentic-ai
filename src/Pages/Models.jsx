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
}

function formatDate(value) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID")
}

function Models() {
  const [models, setModels] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

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

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError("")
    setSuccess("")
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")
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
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || data?.message || "Gagal menambahkan model global.")
      }
      setForm((current) => ({ ...initialForm, provider_name: current.provider_name, provider_type: current.provider_type, base_url: current.base_url, api_key: "" }))
      setSuccess("Model berhasil ditambahkan ke katalog global dan dihubungkan ke agent aktif.")
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

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header>
        <h1 className="text-2xl font-bold">Global AI Models</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Kelola model bawaan sistem yang tersedia bagi semua akun user.
        </p>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{success}</div>}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="font-semibold">Tambah model bawaan</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            API key disimpan terenkripsi di backend. Gunakan endpoint yang kompatibel dengan OpenAI Chat Completions.
          </p>
        </div>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div>
            <label htmlFor="provider_name" className="mb-1.5 block text-sm font-medium">Nama provider</label>
            <input id="provider_name" name="provider_name" value={form.provider_name} onChange={handleChange} required placeholder="Contoh: OpenRouter" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div>
            <label htmlFor="provider_type" className="mb-1.5 block text-sm font-medium">Tipe provider</label>
            <select id="provider_type" name="provider_type" value={form.provider_type} onChange={handleChange} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950">
              <option value="openrouter">OpenRouter</option>
              <option value="openai">OpenAI-compatible / OpenAI</option>
              <option value="nararouter">NaraRouter</option>
              <option value="deepseek">DeepSeek</option>
              <option value="google">Google-compatible</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="base_url" className="mb-1.5 block text-sm font-medium">Base URL</label>
            <input id="base_url" name="base_url" type="url" value={form.base_url} onChange={handleChange} required placeholder="https://provider.example/v1" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="api_key" className="mb-1.5 block text-sm font-medium">API key sistem</label>
            <input id="api_key" name="api_key" type="password" autoComplete="new-password" value={form.api_key} onChange={handleChange} required placeholder="Masukkan API key milik sistem" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" />
            <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">User akan memakai layanan melalui API key ini. Biaya dan batas penggunaan berada pada akun provider milik sistem.</p>
          </div>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium">Nama model untuk user</label>
            <input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="Contoh: GPT Model" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div>
            <label htmlFor="model_id" className="mb-1.5 block text-sm font-medium">Model ID dari provider</label>
            <input id="model_id" name="model_id" value={form.model_id} onChange={handleChange} required placeholder="Contoh: provider/model-id" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium">Deskripsi (opsional)</label>
            <textarea id="description" name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Kegunaan atau catatan model" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950" />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900">
              {saving ? "Menyimpan..." : "Tambah ke semua akun"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <h2 className="font-semibold">Katalog model sistem</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Model di sini dapat dilihat semua user; model pribadi user tidak ditampilkan.</p>
          </div>
          <button type="button" onClick={() => void loadModels()} disabled={loading} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">Muat ulang</button>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Memuat model...</p>
        ) : models.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Belum ada model global.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr><th className="px-5 py-3 font-semibold">Model</th><th className="px-5 py-3 font-semibold">Provider</th><th className="px-5 py-3 font-semibold">Model ID</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Dibuat</th><th className="px-5 py-3 font-semibold">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {models.map((model) => (
                  <tr key={model.id}>
                    <td className="px-5 py-4"><p className="font-medium">{model.name}</p><p className="mt-1 max-w-sm text-xs text-slate-500">{model.description || "Tanpa deskripsi"}</p></td>
                    <td className="px-5 py-4">{model.provider?.name || "-"}</td>
                    <td className="px-5 py-4 font-mono text-xs">{model.model_id}</td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${model.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{model.is_active ? "Aktif" : "Nonaktif"}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-500">{formatDate(model.created_at)}</td>
                    <td className="px-5 py-4"><button type="button" onClick={() => void toggleActive(model)} disabled={updatingId === model.id} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800">{updatingId === model.id ? "Menyimpan..." : model.is_active ? "Nonaktifkan" : "Aktifkan"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default Models
