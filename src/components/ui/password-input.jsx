import { useState } from "react"
import { cn } from "../../lib/utils.js"
import { Input } from "./input.jsx"

// A password field with an eye button that shows or hides what was typed.
export function PasswordInput({ className, disabled, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} disabled={disabled} className={cn(className, "pe-10")} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 end-0 flex items-center rounded-md px-3 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {visible ? (
            <>
              <path d="M9.9 4.2A10 10 0 0 1 12 4c6.5 0 10 8 10 8a17 17 0 0 1-2.9 4.2" />
              <path d="M6.6 6.6A17 17 0 0 0 2 12s3.5 8 10 8a10 10 0 0 0 5.4-1.6" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
              <path d="m2 2 20 20" />
            </>
          ) : (
            <>
              <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  )
}
