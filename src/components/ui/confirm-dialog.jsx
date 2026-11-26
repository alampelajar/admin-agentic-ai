import { useCallback, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog.jsx"
import { buttonVariants } from "./button.jsx"

// Asks before a destructive action, in place of window.confirm.
//
//   const [askToConfirm, confirmDialog] = useConfirm()
//   if (!(await askToConfirm({ title: "Delete user?", description: "...", confirmLabel: "Delete" }))) return
//   ...
//   return <>{page}{confirmDialog}</>
//
// destructive: false shows the confirm button in the normal colour, for a question that
// takes nothing away (restoring an account).
export function useConfirm() {
  const [request, setRequest] = useState(null)

  const confirm = useCallback(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    []
  )

  const answer = (value) => {
    request?.resolve(value)
    setRequest(null)
  }

  const dialog = (
    <AlertDialog open={Boolean(request)} onOpenChange={(open) => !open && answer(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description ? (
            <AlertDialogDescription>{request.description}</AlertDialogDescription>
          ) : (
            <AlertDialogDescription className="sr-only">Confirm this action.</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* The safe choice gets focus first, so Enter never deletes by accident. */}
          <AlertDialogCancel autoFocus onClick={() => answer(false)}>
            {request?.cancelLabel || "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            className={request?.destructive === false ? undefined : buttonVariants({ variant: "destructive" })}
            onClick={() => answer(true)}
          >
            {request?.confirmLabel || "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
  return [confirm, dialog]
}
