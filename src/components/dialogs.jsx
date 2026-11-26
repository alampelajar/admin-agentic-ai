import { ChevronDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// A dialog that holds a short form. While busy it cannot be closed, so a request in
// progress is never left without its dialog.
export function FormDialog({ title, subtitle, onClose, busy = false, className, children }) {
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className={cn("max-h-9/10 overflow-y-auto sm:max-w-md", className)} showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// A row's less frequent actions in a menu. items: [{ label, onSelect, destructive, separatorBefore }]
export function RowMenu({ label, disabled, items, text = "More", icon = false }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={icon ? "icon" : "sm"} disabled={disabled} aria-label={label}>
          {icon ? (
            <MoreHorizontal />
          ) : (
            <>
              {text}
              <ChevronDown aria-hidden="true" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {items.map((item) => [
          item.separatorBefore && <DropdownMenuSeparator key={`${item.label}-separator`} />,
          <DropdownMenuItem
            key={item.label}
            variant={item.destructive ? "destructive" : "default"}
            disabled={item.disabled}
            onSelect={() => item.onSelect()}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>,
        ])}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
