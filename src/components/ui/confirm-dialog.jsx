import { useCallback, useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "./button.jsx"

// A Material 3 basic dialog that asks before a destructive action, in place of window.confirm.
//
//   const [askToConfirm, confirmDialog] = useConfirm()
//   if (!(await askToConfirm({ title: "Delete user?", description: "...", confirmLabel: "Delete" }))) return
//   ...
//   return <>{page}{confirmDialog}</>
export function useConfirm() {
  const [request, setRequest] = useState(null)

  const confirm = useCallback(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    []
  )

  const close = (answer) => {
    request?.resolve(answer)
    setRequest(null)
  }

  const dialog = request ? <ConfirmDialog {...request} onAnswer={close} /> : null
  return [confirm, dialog]
}

function ConfirmDialog({ title, description, confirmLabel = "Delete", cancelLabel = "Cancel", onAnswer }) {
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef(null)

  useEffect(() => {
    // The safe choice has focus, so Enter never deletes by accident.
    cancelRef.current?.focus()
    const onKey = (event) => {
      if (event.key === "Escape") onAnswer(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onAnswer])

  return createPortal(
    <div className="m3-scrim fixed inset-0 flex items-center justify-center p-4" onClick={() => onAnswer(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="w-full max-w-sm rounded-dialog bg-surface-high p-6 text-foreground shadow-m3-3"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="text-2xl font-normal">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-4 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelRef} variant="ghost" onClick={() => onAnswer(false)}>
            {cancelLabel}
          </Button>
          <Button variant="destructive-ghost" onClick={() => onAnswer(true)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
