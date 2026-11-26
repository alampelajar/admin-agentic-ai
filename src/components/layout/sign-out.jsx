import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

import { logoutAdminSession } from "@/lib/auth"
import { useConfirm } from "@/components/ui/confirm-dialog"

// Asks before signing out, like the main app's sign-out dialog.
export function useSignOut() {
  const navigate = useNavigate()
  const [askToConfirm, confirmDialog] = useConfirm()

  const askToSignOut = useCallback(async () => {
    const confirmed = await askToConfirm({
      title: "Sign out?",
      description: "You will need to sign in again to use the admin console.",
      confirmLabel: "Sign out",
    })
    if (!confirmed) return
    await logoutAdminSession()
    navigate("/login")
  }, [askToConfirm, navigate])

  return [askToSignOut, confirmDialog]
}
