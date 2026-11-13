import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { apiFetch } from "../lib/api"
import { PasswordInput } from "../components/ui/password-input.jsx"

const normalizeUser = (user) => {
  const roleMap = {
    admin: "Admin",
    user: "User",
  }

  return {
    id: user.id,
    name: user.name || "Unknown User",
    email: user.email || "-",
    role: roleMap[user.role] || "User",
    status: user.status || "Active",
    agents: Array.isArray(user.agents)
      ? user.agents.map((agent) => ({
          id: agent.id,
          name: agent.name || "Unnamed Agent",
          slug: agent.slug || "-",
          taskCount: agent.task_count ?? 0,
        }))
      : [],
    lastActive: user.updated_at
      ? new Date(user.updated_at).toLocaleString("id-ID")
      : "-",
    avatar: user.avatar || "",
    createdAt: user.created_at || null,
    updatedAt: user.updated_at || null,
  }
}

const initialNewUser = {
  name: "",
  email: "",
  role: "User",
  password: "",
  confirmPassword: "",
}

const initialEditForm = {
  name: "",
  email: "",
  role: "User",
}

function Users() {
  const [users, setUsers] = useState([])

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("All")

  const [openMenu, setOpenMenu] = useState(null)
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  })

  const [selectedUser, setSelectedUser] = useState(null)
  const [editingUser, setEditingUser] = useState(null)

  const [showAddUser, setShowAddUser] = useState(false)

  const [newUser, setNewUser] = useState(initialNewUser)

  const [editForm, setEditForm] = useState(initialEditForm)

  const [formError, setFormError] = useState("")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const [pageError, setPageError] = useState("")

  // ============================================================
  // LOAD USERS
  // ============================================================

  const loadUsers = async () => {
    setLoading(true)
    setPageError("")

    try {
      const response = await apiFetch("/api/admin/users")

      if (!response.ok) {
        let message = "Gagal mengambil data users."

        try {
          const data = await response.json()

          if (data?.error) {
            message = data.error
          }

          if (data?.message) {
            message = data.message
          }
        } catch {
          // Ignore JSON parsing error
        }

        throw new Error(message)
      }

      const data = await response.json()

      const usersData = Array.isArray(data)
        ? data
        : Array.isArray(data?.users)
          ? data.users
          : []

      setUsers(usersData.map(normalizeUser))
    } catch (error) {
      console.error("Gagal mengambil users:", error)

      setPageError(
        error.message ||
          "Gagal mengambil data users dari server."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // ============================================================
  // FILTER
  // ============================================================

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchValue = search.toLowerCase().trim()

      const matchesSearch =
        user.name.toLowerCase().includes(searchValue) ||
        user.email.toLowerCase().includes(searchValue)

      const matchesRole =
        roleFilter === "All" ||
        user.role === roleFilter

      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  // ============================================================
  // ADD USER
  // ============================================================

  const handleNewUserChange = (event) => {
    const { name, value } = event.target

    setNewUser((current) => ({
      ...current,
      [name]: value,
    }))

    setFormError("")
  }

  const handleAddUser = async (event) => {
    event.preventDefault()

    const name = newUser.name.trim()
    const email = newUser.email.trim()

    if (!name || !email || !newUser.password) {
      setFormError(
        "Please fill in all required fields."
      )
      return
    }

    if (newUser.password.length < 8) {
      setFormError(
        "Password must be at least 8 characters."
      )
      return
    }

    if (
      newUser.password !==
      newUser.confirmPassword
    ) {
      setFormError(
        "Passwords do not match."
      )
      return
    }

    const emailExists = users.some(
      (user) =>
        user.email.toLowerCase() ===
        email.toLowerCase()
    )

    if (emailExists) {
      setFormError(
        "A user with this email already exists."
      )
      return
    }

    setSubmitting(true)
    setFormError("")

    try {
      const backendRole =
        newUser.role === "Admin"
          ? "admin"
          : "user"

      const response = await apiFetch(
        "/api/admin/users",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            email,
            password: newUser.password,
            role: backendRole,
          }),
        }
      )

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Gagal membuat user."
        )
      }

      setShowAddUser(false)
      setNewUser(initialNewUser)
      setFormError("")

      await loadUsers()
    } catch (error) {
      console.error(
        "Gagal membuat user:",
        error
      )

      setFormError(
        error.message ||
          "Gagal membuat user."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // EDIT USER
  // ============================================================

  const openEditUser = (user) => {
    setEditingUser(user)

    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
    })

    setFormError("")
    setOpenMenu(null)
  }

  const handleEditChange = (event) => {
    const { name, value } = event.target

    setEditForm((current) => ({
      ...current,
      [name]: value,
    }))

    setFormError("")
  }

  const handleEditUser = async (event) => {
    event.preventDefault()

    if (!editingUser) {
      return
    }

    const name = editForm.name.trim()
    const email = editForm.email.trim()

    if (!name || !email) {
      setFormError(
        "Name and email are required."
      )
      return
    }

    const emailExists = users.some(
      (user) =>
        user.id !== editingUser.id &&
        user.email.toLowerCase() ===
          email.toLowerCase()
    )

    if (emailExists) {
      setFormError(
        "A user with this email already exists."
      )
      return
    }

    setSubmitting(true)
    setFormError("")

    try {
      const backendRole =
        editForm.role === "Admin"
          ? "admin"
          : "user"

      const response = await apiFetch(
        `/api/admin/users/${editingUser.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name,
            email,
            role: backendRole,
          }),
        }
      )

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Gagal mengubah user."
        )
      }

      setEditingUser(null)
      setEditForm(initialEditForm)
      setFormError("")

      await loadUsers()
    } catch (error) {
      console.error(
        "Gagal mengubah user:",
        error
      )

      setFormError(
        error.message ||
          "Gagal mengubah user."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // DELETE USER
  // ============================================================

  const handleDelete = async (id) => {
    const user = users.find(
      (currentUser) =>
        currentUser.id === id
    )

    if (!user) {
      return
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`
    )

    if (!confirmed) {
      return
    }

    setDeletingId(id)
    setOpenMenu(null)
    setPageError("")

    try {
      const response = await apiFetch(
        `/api/admin/users/${id}`,
        {
          method: "DELETE",
        }
      )

      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Gagal menghapus user."
        )
      }

      if (selectedUser?.id === id) {
        setSelectedUser(null)
      }

      if (editingUser?.id === id) {
        setEditingUser(null)
      }

      await loadUsers()
    } catch (error) {
      console.error(
        "Gagal menghapus user:",
        error
      )

      setPageError(
        error.message ||
          "Gagal menghapus user."
      )
    } finally {
      setDeletingId(null)
    }
  }

  // ============================================================
  // RESET FILTERS
  // ============================================================

  const clearFilters = () => {
    setSearch("")
    setRoleFilter("All")
  }

  // ============================================================
  // SHARED INPUT CLASS
  // ============================================================

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

  // ============================================================
  // RETURN
  // ============================================================

  const adminCount = users.filter((user) => user.role === "Admin").length

  const openRowMenu = (event, user) => {
    if (openMenu === user.id) {
      setOpenMenu(null)
      return
    }

    const buttonRect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 176
    const menuHeight = 132
    const gap = 8
    const viewportPadding = 12

    let left = buttonRect.right - menuWidth
    if (left < viewportPadding) left = viewportPadding
    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - menuWidth - viewportPadding
    }

    const spaceBelow = window.innerHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top
    let top
    if (spaceBelow >= menuHeight + gap) {
      top = buttonRect.bottom + gap
    } else if (spaceAbove >= menuHeight + gap) {
      top = buttonRect.top - menuHeight - gap
    } else {
      top = Math.max(
        viewportPadding,
        Math.min(buttonRect.bottom + gap, window.innerHeight - menuHeight - viewportPadding)
      )
    }

    setMenuPosition({ top, left })
    setOpenMenu(user.id)
  }

  const closeAddUser = () => {
    if (!submitting) setShowAddUser(false)
  }

  const closeEditUser = () => {
    if (!submitting) setEditingUser(null)
  }

  const secondaryButton =
    "h-9 rounded-lg border border-input bg-card px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
  const primaryButton =
    "h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
  const fieldLabel = "mb-2 block text-sm font-medium"

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? "Loading users..."
              : `${users.length} ${users.length === 1 ? "user" : "users"}, ${adminCount} ${adminCount === 1 ? "admin" : "admins"}.`}
          </p>
        </div>
        <button
          type="button"
          className={primaryButton}
          onClick={() => {
            setFormError("")
            setNewUser(initialNewUser)
            setShowAddUser(true)
          }}
        >
          Add user
        </button>
      </div>

      {pageError && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-lg bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium text-destructive">{pageError}</p>
          <button type="button" onClick={loadUsers} className="text-sm font-medium underline-offset-4 hover:underline">
            Retry
          </button>
        </div>
      )}

      <section className="rounded-xl bg-card text-card-foreground">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <input
            type="search"
            aria-label="Search users"
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 min-w-0 flex-1 basis-64 rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <select
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="All">All roles</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
          <p className="ml-auto text-sm text-muted-foreground">
            {filteredUsers.length} of {users.length}
            {(search || roleFilter !== "All") && (
              <button type="button" onClick={clearFilters} className="ml-3 font-medium text-foreground underline-offset-4 hover:underline">
                Clear filters
              </button>
            )}
          </p>
        </div>

        {loading ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-4 py-2.5 text-sm font-normal normal-case tracking-normal">User</th>
                  <th className="px-4 py-2.5 text-sm font-normal normal-case tracking-normal">Role</th>
                  <th className="px-4 py-2.5 text-sm font-normal normal-case tracking-normal">Status</th>
                  <th className="px-4 py-2.5 text-sm font-normal normal-case tracking-normal">Agents</th>
                  <th className="px-4 py-2.5 text-sm font-normal normal-case tracking-normal">Last active</th>
                  <th className="w-12 px-4 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          style={{
                            background: `hsl(${((Number(user.id) || 0) * 67) % 360} 60% 90%)`,
                            color: `hsl(${((Number(user.id) || 0) * 67) % 360} 45% 28%)`,
                          }}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${user.role === "Admin" ? "font-medium" : "text-muted-foreground"}`}>{user.role}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <span
                          aria-hidden="true"
                          className={`size-2 rounded-full ${user.status === "Active" ? "bg-green-600" : user.status === "Suspended" ? "bg-destructive" : "bg-muted-foreground"}`}
                        />
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.agents.length === 0 ? (
                        "–"
                      ) : (
                        <span title={user.agents.map((agent) => `${agent.name} · ${agent.taskCount} tasks`).join("\n")}>
                          {user.agents.slice(0, 3).map((agent) => agent.name).join(", ")}
                          {user.agents.length > 3 && ` +${user.agents.length - 3}`}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{user.lastActive}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(event) => openRowMenu(event, user)}
                        disabled={deletingId === user.id}
                        aria-label={`Actions for ${user.name}`}
                        aria-expanded={openMenu === user.id}
                        className="size-8 rounded-lg text-lg leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                      >
                        ⋮
                      </button>
                      {openMenu === user.id &&
                        createPortal(
                          <div
                            role="menu"
                            style={{ top: `${menuPosition.top}px`, left: `${menuPosition.left}px` }}
                            className="fixed z-50 w-44 rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted"
                              onClick={() => {
                                setSelectedUser(user)
                                setOpenMenu(null)
                              }}
                            >
                              View details
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted"
                              onClick={() => openEditUser(user)}
                            >
                              Edit user
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="block w-full rounded-md px-3 py-2 text-left text-destructive hover:bg-destructive/10 disabled:opacity-50"
                              onClick={() => handleDelete(user.id)}
                              disabled={deletingId === user.id}
                            >
                              {deletingId === user.id ? "Deleting..." : "Delete user"}
                            </button>
                          </div>,
                          document.body
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="px-4 py-12 text-center">
                <h2 className="text-base font-semibold">No users found</h2>
                <p className="mt-1 text-sm text-muted-foreground">Try changing your search or filters.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-card p-6 text-card-foreground shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="user-details-title" className="truncate text-lg font-semibold">{selectedUser.name}</h2>
                <p className="truncate text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setSelectedUser(null)} className="size-8 shrink-0 rounded-lg text-xl leading-none text-muted-foreground hover:bg-muted">
                ×
              </button>
            </div>

            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">User ID</dt>
              <dd className="text-right tabular-nums">#{selectedUser.id}</dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="text-right">{selectedUser.role}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="text-right">{selectedUser.status}</dd>
              <dt className="text-muted-foreground">Last active</dt>
              <dd className="text-right">{selectedUser.lastActive}</dd>
            </dl>

            <h3 className="mt-6 text-sm font-semibold">Agents ({selectedUser.agents.length})</h3>
            {selectedUser.agents.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">This user has not used any agent yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {selectedUser.agents.map((agent) => (
                  <li key={agent.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{agent.name}</span>
                      <span className="block truncate text-muted-foreground">{agent.slug}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{agent.taskCount} tasks</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex justify-end">
              <button type="button" className={secondaryButton} onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeEditUser}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-card p-6 text-card-foreground shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="edit-user-title" className="text-lg font-semibold">Edit user</h2>
                <p className="text-sm text-muted-foreground">User #{editingUser.id}</p>
              </div>
              <button type="button" aria-label="Close" onClick={closeEditUser} disabled={submitting} className="size-8 rounded-lg text-xl leading-none text-muted-foreground hover:bg-muted">
                ×
              </button>
            </div>

            <form onSubmit={handleEditUser} className="mt-6 space-y-4">
              <div>
                <label htmlFor="edit-name" className={fieldLabel}>Full name</label>
                <input id="edit-name" type="text" name="name" value={editForm.name} onChange={handleEditChange} disabled={submitting} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-email" className={fieldLabel}>Email</label>
                <input id="edit-email" type="email" name="email" value={editForm.email} onChange={handleEditChange} disabled={submitting} className={inputClass} />
              </div>
              <div>
                <label htmlFor="edit-role" className={fieldLabel}>Role</label>
                <select id="edit-role" name="role" value={editForm.role} onChange={handleEditChange} disabled={submitting} className={inputClass}>
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              {formError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className={secondaryButton} onClick={closeEditUser} disabled={submitting}>Cancel</button>
                <button type="submit" className={primaryButton} disabled={submitting}>{submitting ? "Saving..." : "Save changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeAddUser}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-card p-6 text-card-foreground shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-user-title" className="text-lg font-semibold">Add user</h2>
                <p className="text-sm text-muted-foreground">Create a new user account.</p>
              </div>
              <button type="button" aria-label="Close" onClick={closeAddUser} disabled={submitting} className="size-8 rounded-lg text-xl leading-none text-muted-foreground hover:bg-muted">
                ×
              </button>
            </div>

            <form onSubmit={handleAddUser} className="mt-6 space-y-4">
              <div>
                <label htmlFor="add-name" className={fieldLabel}>Full name</label>
                <input id="add-name" type="text" name="name" value={newUser.name} onChange={handleNewUserChange} disabled={submitting} placeholder="Enter full name" className={inputClass} />
              </div>
              <div>
                <label htmlFor="add-email" className={fieldLabel}>Email</label>
                <input id="add-email" type="email" name="email" value={newUser.email} onChange={handleNewUserChange} disabled={submitting} placeholder="Enter email address" className={inputClass} />
              </div>
              <div>
                <label htmlFor="add-role" className={fieldLabel}>Role</label>
                <select id="add-role" name="role" value={newUser.role} onChange={handleNewUserChange} disabled={submitting} className={inputClass}>
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label htmlFor="add-password" className={fieldLabel}>Password</label>
                <PasswordInput id="add-password" name="password" autoComplete="new-password" value={newUser.password} onChange={handleNewUserChange} disabled={submitting} placeholder="Enter password" aria-describedby="add-password-hint" className={`${inputClass} shadow-none!`} />
                <p id="add-password-hint" className="mt-1.5 text-sm text-muted-foreground">At least 8 characters.</p>
              </div>
              <div>
                <label htmlFor="add-confirm" className={fieldLabel}>Confirm password</label>
                <PasswordInput id="add-confirm" name="confirmPassword" autoComplete="new-password" value={newUser.confirmPassword} onChange={handleNewUserChange} disabled={submitting} placeholder="Repeat the password" className={`${inputClass} shadow-none!`} />
              </div>
              {formError && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{formError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" className={secondaryButton} onClick={closeAddUser} disabled={submitting}>Cancel</button>
                <button type="submit" className={primaryButton} disabled={submitting}>{submitting ? "Creating..." : "Create user"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
