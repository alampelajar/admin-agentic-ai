import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight, Laptop, Moon, SearchIcon, Sun } from "lucide-react"

import { cn } from "@/lib/utils"
import { useTheme } from "@/lib/theme"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { navGroups } from "./app-sidebar.jsx"

// The search box of the header and the menu it opens (also with Ctrl+K or Cmd+K), like the
// main app's Search and CommandMenu: go to a page or change the theme.
export function Search({ className }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { setTheme } = useTheme()

  useEffect(() => {
    const onKey = (event) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const run = useCallback((command) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "group relative h-8 w-full flex-1 justify-start rounded-md bg-muted/25 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent sm:w-40 sm:pe-12 md:flex-none lg:w-52 xl:w-64",
          className
        )}
        aria-label="Search"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={() => setOpen(true)}
      >
        <SearchIcon aria-hidden="true" className="absolute start-1.5 top-1/2 -translate-y-1/2" size={16} />
        <span className="ms-4">Search</span>
        <kbd className="pointer-events-none absolute end-1 top-1 hidden h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium select-none group-hover:bg-accent sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Search" description="Go to a page or change the theme.">
        <CommandInput placeholder="Type a page or a command..." />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {navGroups.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((item) => (
                <CommandItem key={item.url} value={item.title} onSelect={() => run(() => navigate(item.url))}>
                  <div className="flex size-4 items-center justify-center">
                    <ArrowRight className="size-2 text-muted-foreground/80" />
                  </div>
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => run(() => setTheme("light"))}>
              <Sun /> <span>Light</span>
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("dark"))}>
              <Moon className="scale-90" />
              <span>Dark</span>
            </CommandItem>
            <CommandItem onSelect={() => run(() => setTheme("system"))}>
              <Laptop />
              <span>System</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
