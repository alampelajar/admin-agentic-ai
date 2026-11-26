import { useEffect, useMemo, useState } from "react"
import { Loader2, Search, UserPlus, Users as UsersIcon } from "lucide-react"
import { apiFetch } from "../lib/api"
import { formatWib } from "../lib/datetime"
import { useConfirm } from "../components/ui/confirm-dialog.jsx"
import { PasswordInput } from "../components/ui/password-input.jsx"
import { Avatar, AvatarFallback } from "../components/ui/avatar.jsx"
import { Badge } from "../components/ui/badge.jsx"
import { Button } from "../components/ui/button.jsx"
import { Card } from "../components/ui/card.jsx"
import { DialogFooter } from "../components/ui/dialog.jsx"
import { Input } from "../components/ui/input.jsx"
import { Label } from "../components/ui/label.jsx"
import { NativeSelect, NativeSelectOption } from "../components/ui/native-select.jsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.jsx"
import { Separator } from "../components/ui/separator.jsx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table.jsx"
import { EmptyState, ErrorState, LoadingRows, Page, PageHeader, StatusDot } from "../components/page.jsx"
import { FormDialog, RowMenu } from "../components/dialogs.jsx"

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
    // premium counts now; premiumExpired: switched on but past its end date.
    premium: Boolean(user.premium_active ?? user.is_premium),
    premiumExpired: Boolean(user.is_premium) && user.premium_active === false,
    premiumUntil: user.premium_until || null,
    // Website Builder credits; unlimited is an owner's own account, which uses none.
    credits: Number(user.credits ?? 0),
    unlimited: Boolean(user.unlimited),
    // The new-account promo (10 free credits, 50% off top-ups for 30 days); false when a
    // second account from the same device or a busy address was found (promoNote).
    promoEligible: user.promo_eligible !== false,
    promoNote: user.promo_note || "",
    // An account its owner deleted waits 30 days (deletes_at) before it is removed for good.
    deletesAt: user.deletes_at || null,
    // Set once an admin restored the account; it cannot be restored a second time.
    restoredAt: user.restored_at || null,
    status: user.deletes_at ? "Being deleted" : user.status || "Active",
    agents: Array.isArray(user.agents)
      ? user.agents.map((agent) => ({
          id: agent.id,
          name: agent.name || "Unnamed Agent",
          slug: agent.slug || "-",
          taskCount: agent.task_count ?? 0,
        }))
      : [],
    lastActive: user.updated_at
      ? formatWib(user.updated_at)
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
  plan: "Free",
  period: "1",
  customDate: "",
}

// How long a premium account lasts, chosen in the edit dialog.
const PREMIUM_PERIODS = [
  { value: "keep", label: "Keep the current end" },
  { value: "1", label: "1 month" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
  { value: "none", label: "No end" },
  { value: "date", label: "Until a date" },
]

// premiumEnd turns the chosen period into an ISO time, null for no end, or undefined when the
// current end is kept or the date is missing.
function premiumEnd(form, currentUntil) {
  if (form.period === "keep") return currentUntil ?? null
  if (form.period === "none") return null
  if (form.period === "date") {
    return form.customDate ? new Date(`${form.customDate}T23:59:59+07:00`).toISOString() : undefined
  }
  const end = new Date()
  end.setMonth(end.getMonth() + Number(form.period))
  return end.toISOString()
}

function Users() {
  const [askToConfirm, confirmDialog] = useConfirm()
  const [users, setUsers] = useState([])

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("All")

  const [selectedUser, setSelectedUser] = useState(null)
  const [editingUser, setEditingUser] = useState(null)

  const [showAddUser, setShowAddUser] = useState(false)

  const [newUser, setNewUser] = useState(initialNewUser)

  const [editForm, setEditForm] = useState(initialEditForm)

  const [formError, setFormError] = useState("")

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [restoringId, setRestoringId] = useState(null)
  // Adding credits (a top-up) or taking some away.
  const [creditUser, setCreditUser] = useState(null)
  const [creditForm, setCreditForm] = useState({ amount: "", note: "" })
  const [creditError, setCreditError] = useState("")
  const [savingCredits, setSavingCredits] = useState(false)

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
      plan: user.premium ? "Premium" : "Free",
      period: user.premium ? "keep" : "1",
      customDate: "",
    })

    setFormError("")
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

    const wantsPremium = editForm.plan === "Premium"
    const until = wantsPremium ? premiumEnd(editForm, editingUser.premiumUntil) : null
    if (wantsPremium && until === undefined) {
      setFormError("Choose the date the premium account ends.")
      return
    }
    if (wantsPremium && until && new Date(until) <= new Date()) {
      setFormError("The premium account must end in the future.")
      return
    }
    const premiumChanged = wantsPremium !== editingUser.premium || (wantsPremium && editForm.period !== "keep")

    setSubmitting(true)
    setFormError("")

    try {
      if (premiumChanged) {
        const premiumResponse = await apiFetch(`/api/admin/users/${editingUser.id}/premium`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_premium: wantsPremium, premium_until: until }),
        })
        const premiumData = await premiumResponse.json().catch(() => ({}))
        if (!premiumResponse.ok || premiumData?.ok === false) {
          throw new Error(premiumData?.error || premiumData?.message || "Could not save the premium account.")
        }
      }

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

    const confirmed = await askToConfirm({
      title: `Delete ${user.name}?`,
      description: user.deletesAt
        ? "This account is waiting to be deleted. Deleting it now removes it and its websites at once. This cannot be undone."
        : "This account and its websites will be deleted at once. This cannot be undone.",
      confirmLabel: "Delete",
    })

    if (!confirmed) {
      return
    }

    setDeletingId(id)
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
  // RESTORE AN ACCOUNT WAITING TO BE DELETED
  // ============================================================

  const handleRestore = async (user) => {
    const confirmed = await askToConfirm({
      title: `Restore ${user.name}?`,
      description:
        "The person can sign in again, and their websites come back online. Open restore requests from this account are closed. An account can be restored only once: if they delete it again, it is removed at once.",
      confirmLabel: "Restore",
      destructive: false,
    })
    if (!confirmed) return

    setRestoringId(user.id)
    setPageError("")
    try {
      const response = await apiFetch(`/api/admin/users/${user.id}/restore`, { method: "PATCH" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.message || "The account could not be restored.")
      }
      await loadUsers()
    } catch (error) {
      setPageError(error.message || "The account could not be restored.")
    } finally {
      setRestoringId(null)
    }
  }

  // ============================================================
  // CREDITS: A TOP-UP, OR TAKING SOME AWAY
  // ============================================================

  const openCredits = (user) => {
    setCreditUser(user)
    setCreditForm({ amount: "", note: "" })
    setCreditError("")
  }

  const handleCredits = async (event) => {
    event.preventDefault()
    const amount = Number(creditForm.amount)
    if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 10000) {
      setCreditError("Enter a whole number from -10000 to 10000, not 0.")
      return
    }
    setSavingCredits(true)
    setCreditError("")
    try {
      const response = await apiFetch(`/api/admin/users/${creditUser.id}/credits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, note: creditForm.note.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || "The credits could not be saved.")
      }
      setCreditUser(null)
      await loadUsers()
    } catch (error) {
      setCreditError(error.message || "The credits could not be saved.")
    } finally {
      setSavingCredits(false)
    }
  }

  // ============================================================
  // NEW-ACCOUNT PROMO
  // ============================================================

  const togglePromo = async (user) => {
    const giving = !user.promoEligible
    const confirmed = await askToConfirm({
      title: giving ? `Give the new-account promo to ${user.name}?` : `Take the new-account promo from ${user.name}?`,
      description: giving
        ? "They get 50% off top-ups until 30 days after they signed up. The 10 free credits are not added by this: use Add credits if they should have them."
        : "They pay the full price for top-ups. Their credits stay as they are.",
      confirmLabel: giving ? "Give promo" : "Take promo",
      destructive: !giving,
    })
    if (!confirmed) return
    setPageError("")
    try {
      const response = await apiFetch(`/api/admin/users/${user.id}/promo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eligible: giving }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || "The promo could not be saved.")
      }
      await loadUsers()
    } catch (error) {
      setPageError(error.message || "The promo could not be saved.")
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
  // RETURN
  // ============================================================

  const adminCount = users.filter((user) => user.role === "Admin").length

  const closeAddUser = () => {
    if (!submitting) setShowAddUser(false)
  }

  const closeEditUser = () => {
    if (!submitting) setEditingUser(null)
  }

  const statusDot = (user) =>
    user.status === "Active" ? "success" : user.deletesAt ? "warning" : user.status === "Suspended" ? "danger" : "muted"

  const formErrorBox = formError && (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {formError}
    </p>
  )

  return (
    <Page>
      {confirmDialog}
      <PageHeader
        title="Users"
        description={
          loading
            ? "Loading users..."
            : `${users.length} ${users.length === 1 ? "user" : "users"}, ${adminCount} ${adminCount === 1 ? "admin" : "admins"}.`
        }
        actions={
          <Button
            onClick={() => {
              setFormError("")
              setNewUser(initialNewUser)
              setShowAddUser(true)
            }}
          >
            <UserPlus aria-hidden="true" />
            Add user
          </Button>
        }
      />

      {pageError && <ErrorState message={pageError} onRetry={loadUsers} busy={loading} />}

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search users"
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger aria-label="Filter by role" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All roles</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
              <SelectItem value="User">User</SelectItem>
            </SelectContent>
          </Select>
          <p className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
            {filteredUsers.length} of {users.length}
            {(search || roleFilter !== "All") && (
              <Button variant="link" size="sm" className="h-auto px-0" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </p>
        </div>

        {loading ? (
          <LoadingRows rows={5} label="Loading users" className="p-4" />
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" className="m-4">
            {users.length === 0 ? "People appear here once they sign up." : "Try changing your search or filters."}
          </EmptyState>
        ) : (
          <Table className="min-w-180">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agents</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="w-12 pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="max-w-64 pl-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback className="text-xs font-medium">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "Admin" ? "default" : "outline"}>{user.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.premium ? (
                      <div>
                        <Badge variant="success">Premium</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {user.premiumUntil ? `Until ${formatWib(user.premiumUntil)}` : "No end"}
                        </p>
                      </div>
                    ) : user.premiumExpired ? (
                      <div>
                        <Badge variant="warning">Premium ended</Badge>
                        <p className="mt-1 text-xs text-muted-foreground">{formatWib(user.premiumUntil)}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Free</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {user.unlimited ? (
                      <span className="text-muted-foreground">Unlimited</span>
                    ) : (
                      <span className={user.credits < 2 ? "font-medium text-amber-700 dark:text-amber-400" : ""}>
                        {user.credits}
                      </span>
                    )}
                    {!user.unlimited && !user.promoEligible && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400" title={user.promoNote}>
                        No promo
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="min-w-28 whitespace-normal">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <StatusDot tone={statusDot(user)} />
                      {user.status}
                    </span>
                    {user.deletesAt && (
                      <p className="mt-1 text-xs text-muted-foreground">Removed on {formatWib(user.deletesAt)}</p>
                    )}
                    {!user.deletesAt && user.restoredAt && (
                      <p className="mt-1 text-xs text-muted-foreground" title="If this person deletes the account again, it is removed at once.">
                        Restored once
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-36 text-muted-foreground">
                    {user.agents.length === 0 ? (
                      "–"
                    ) : (
                      <span className="block truncate" title={user.agents.map((agent) => `${agent.name} · ${agent.taskCount} tasks`).join("\n")}>
                        {user.agents.slice(0, 3).map((agent) => agent.name).join(", ")}
                        {user.agents.length > 3 && ` +${user.agents.length - 3}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.lastActive}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <RowMenu
                      icon
                      label={`Actions for ${user.name}`}
                      disabled={deletingId === user.id || restoringId === user.id}
                      items={[
                        { label: "View details", onSelect: () => setSelectedUser(user) },
                        ...(user.deletesAt
                          ? [{ label: "Restore account", onSelect: () => handleRestore(user) }]
                          : [
                              { label: "Edit user", onSelect: () => openEditUser(user) },
                              { label: user.premium ? "Change premium" : "Make premium", onSelect: () => openEditUser(user) },
                              { label: "Add credits", onSelect: () => openCredits(user) },
                              { label: user.promoEligible ? "Take promo" : "Give promo", onSelect: () => togglePromo(user) },
                            ]),
                        {
                          label: deletingId === user.id ? "Deleting..." : user.deletesAt ? "Delete now" : "Delete user",
                          destructive: true,
                          separatorBefore: true,
                          disabled: deletingId === user.id,
                          onSelect: () => handleDelete(user.id),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {creditUser && (
        <FormDialog
          title="Add credits"
          subtitle={`${creditUser.name} has ${creditUser.credits} credits. A new website uses 2, a change uses 1. Use a minus number to take credits away; the balance never goes below 0.`}
          onClose={() => setCreditUser(null)}
          busy={savingCredits}
        >
          <form onSubmit={handleCredits} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credit-amount">Credits to add</Label>
              <Input
                id="credit-amount"
                type="number"
                step="1"
                inputMode="numeric"
                autoFocus
                value={creditForm.amount}
                onChange={(event) => setCreditForm({ ...creditForm, amount: event.target.value })}
                placeholder="20"
                aria-invalid={creditError ? true : undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit-note">Note (optional)</Label>
              <Input
                id="credit-note"
                type="text"
                maxLength={200}
                value={creditForm.note}
                onChange={(event) => setCreditForm({ ...creditForm, note: event.target.value })}
                placeholder="Transfer 25 Nov"
                aria-describedby="credit-note-hint"
              />
              <p id="credit-note-hint" className="text-xs text-muted-foreground">The person sees this note in their credit history.</p>
            </div>
            {creditError && <p role="alert" className="text-sm text-destructive">{creditError}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreditUser(null)} disabled={savingCredits}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingCredits}>
                {savingCredits && <Loader2 className="animate-spin" aria-hidden="true" />}
                {savingCredits ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </FormDialog>
      )}

      {selectedUser && (
        <FormDialog title={selectedUser.name} subtitle={selectedUser.email} onClose={() => setSelectedUser(null)}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="text-right tabular-nums">#{selectedUser.id}</dd>
            <dt className="text-muted-foreground">Role</dt>
            <dd className="text-right">{selectedUser.role}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd className="text-right">{selectedUser.status}</dd>
            <dt className="text-muted-foreground">Last active</dt>
            <dd className="text-right">{selectedUser.lastActive}</dd>
            <dt className="text-muted-foreground">New-account promo</dt>
            <dd className="text-right">{selectedUser.promoEligible ? "Yes" : `No: ${selectedUser.promoNote || "taken by an admin"}`}</dd>
          </dl>

          <Separator />
          <h3 className="text-sm font-semibold">Agents ({selectedUser.agents.length})</h3>
          {selectedUser.agents.length === 0 ? (
            <p className="text-sm text-muted-foreground">This user has not used any agent yet.</p>
          ) : (
            <ul className="divide-y">
              {selectedUser.agents.map((agent) => (
                <li key={agent.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{agent.name}</span>
                    <span className="block truncate text-muted-foreground">{agent.slug}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{agent.taskCount} tasks</span>
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </FormDialog>
      )}

      {editingUser && (
        <FormDialog title="Edit user" subtitle={`User #${editingUser.id}`} onClose={closeEditUser} busy={submitting}>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full name</Label>
              <Input id="edit-name" type="text" name="name" value={editForm.name} onChange={handleEditChange} disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" name="email" value={editForm.email} onChange={handleEditChange} disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <NativeSelect id="edit-role" name="role" value={editForm.role} onChange={handleEditChange} disabled={submitting}>
                <NativeSelectOption value="User">User</NativeSelectOption>
                <NativeSelectOption value="Admin">Admin</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-plan">Plan</Label>
              <NativeSelect id="edit-plan" name="plan" value={editForm.plan} onChange={handleEditChange} disabled={submitting} aria-describedby="edit-plan-hint">
                <NativeSelectOption value="Free">Free: 2 websites, 200,000 tokens a month</NativeSelectOption>
                <NativeSelectOption value="Premium">Premium: 1,000,000 tokens a month, every active model</NativeSelectOption>
              </NativeSelect>
              <p id="edit-plan-hint" className="text-xs text-muted-foreground">
                {editingUser.premium
                  ? editingUser.premiumUntil
                    ? `Premium now, until ${formatWib(editingUser.premiumUntil)}.`
                    : "Premium now, with no end."
                  : editingUser.premiumExpired
                    ? `Premium ended on ${formatWib(editingUser.premiumUntil)}.`
                    : "Free now."}
              </p>
            </div>
            {editForm.plan === "Premium" && (
              <div className="space-y-2">
                <Label htmlFor="edit-period">Premium period</Label>
                <NativeSelect id="edit-period" name="period" value={editForm.period} onChange={handleEditChange} disabled={submitting}>
                  {PREMIUM_PERIODS.filter((option) => option.value !== "keep" || editingUser.premium).map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {editForm.period === "date" && (
                  <div className="space-y-2 pt-1">
                    <Label htmlFor="edit-premium-date">Ends on (end of the day, WIB)</Label>
                    <Input id="edit-premium-date" type="date" name="customDate" value={editForm.customDate} onChange={handleEditChange} disabled={submitting} />
                  </div>
                )}
                {(() => {
                  const end = premiumEnd(editForm, editingUser.premiumUntil)
                  if (end === undefined) return null
                  return (
                    <p className="text-xs text-muted-foreground">
                      {end ? `Premium until ${formatWib(end)}.` : "Premium with no end."}
                    </p>
                  )
                })()}
              </div>
            )}
            {formErrorBox}
            <DialogFooter>
              <Button variant="outline" onClick={closeEditUser} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {submitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </FormDialog>
      )}

      {showAddUser && (
        <FormDialog title="Add user" subtitle="Create a new user account." onClose={closeAddUser} busy={submitting}>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Full name</Label>
              <Input id="add-name" type="text" name="name" value={newUser.name} onChange={handleNewUserChange} disabled={submitting} placeholder="Enter full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input id="add-email" type="email" name="email" value={newUser.email} onChange={handleNewUserChange} disabled={submitting} placeholder="Enter email address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <NativeSelect id="add-role" name="role" value={newUser.role} onChange={handleNewUserChange} disabled={submitting}>
                <NativeSelectOption value="User">User</NativeSelectOption>
                <NativeSelectOption value="Admin">Admin</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password</Label>
              <PasswordInput id="add-password" name="password" autoComplete="new-password" value={newUser.password} onChange={handleNewUserChange} disabled={submitting} placeholder="Enter password" aria-describedby="add-password-hint" />
              <p id="add-password-hint" className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-confirm">Confirm password</Label>
              <PasswordInput id="add-confirm" name="confirmPassword" autoComplete="new-password" value={newUser.confirmPassword} onChange={handleNewUserChange} disabled={submitting} placeholder="Repeat the password" />
            </div>
            {formErrorBox}
            <DialogFooter>
              <Button variant="outline" onClick={closeAddUser} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                {submitting ? "Creating..." : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </FormDialog>
      )}
    </Page>
  )
}

export default Users
