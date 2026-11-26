# Design system: THIS MY WEBSITE admin console

Follow these rules for every screen, component and style change in this repository.
The console is built with [shadcn/ui](https://ui.shadcn.com) and uses the same tokens and
components as the main app (`agentic-ai-fe`), so both feel like one product. If a request
conflicts with a rule, follow the request and point out the conflict.

## Character

Clean, calm and professional. Plenty of white space, one accent color, and hierarchy
made with size and weight instead of decoration. Function comes before ornament.

## Colors

Colors live in `src/index.css` as CSS variables, for light mode (`:root`) and dark mode
(`.dark` on `<html>`). They are copied from `agentic-ai-fe/src/styles/theme.css`: when the
main app's theme changes, copy the new values here too. Always use their Tailwind names, so
both modes work automatically.

| Use | Class |
|---|---|
| Page background and text | `bg-background`, `text-foreground` |
| Cards and panels | `bg-card`, `text-card-foreground` |
| Menus, dialogs, tooltips | `bg-popover`, `text-popover-foreground` |
| Main action | `bg-primary`, `text-primary-foreground` |
| Quiet surface and secondary text | `bg-muted`, `text-muted-foreground` |
| Hover and the active menu item | `bg-accent`, `text-accent-foreground` |
| Errors and destructive actions | `bg-destructive`, `text-destructive` |
| Borders and inputs | `border-border`, `border-input` |
| Focus ring | `ring-ring` |
| Charts | `var(--chart-1)` to `var(--chart-5)`, `var(--primary)` |

- Do not use hex values, or palette colors such as `bg-blue-500`, for interface colors.
- The one exception is status, which has no token yet. Use these pairs, with both modes:
  - Success: `text-emerald-600 dark:text-emerald-400`, background `bg-emerald-500/10`, dot `bg-emerald-500`
  - Warning: `text-amber-700 dark:text-amber-400`, background `bg-amber-500/10`, dot `bg-amber-500`
  - Prefer `Badge variant="success"` / `"warning"` / `"destructive"` and `StatusDot` over writing them out.
- Never let color carry meaning alone: add an icon or a word.

## Typography

Inter (`@fontsource-variable/inter`, bundled with the app) is the interface font. Do not add other fonts.

| Use | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight` (use `PageHeader`) |
| Section title | `text-base font-semibold` (`CardTitle className="text-base"`) |
| Body | `text-sm` |
| Helper text and metadata | `text-xs text-muted-foreground` |
| Figures | add `tabular-nums` |

## Spacing and shape

- Use the Tailwind spacing scale only, not values like `p-[13px]`.
- Page content goes in `Page` from `src/components/page.jsx`, with `PageHeader` first.
- Common gaps: `gap-2` inside a control, `gap-4` between cards, `space-y-6` between sections (`Page` does this).
- Radius comes from `--radius`: `rounded-md` for controls, `rounded-lg` or `rounded-xl` for cards.
- Prefer borders to shadows. Only floating things (dialogs, menus, popovers) get a shadow.

## Components

Reuse before writing anything new.

- Controls: `src/components/ui` holds the shadcn/ui components (JavaScript versions of the
  ones in `agentic-ai-fe`): `Button`, `Input`, `PasswordInput`, `Textarea`, `Label`, `Select`,
  `NativeSelect`, `Checkbox`, `Switch`, `Dialog`, `AlertDialog`, `Sheet`, `DropdownMenu`,
  `Tabs`, `Tooltip`, `Card`, `Table`, `Badge`, `Avatar`, `Alert`, `Separator`, `Skeleton`, `Toaster`.
  Add a new one from shadcn/ui (`components.json` is set up) rather than writing your own.
- `Select` for a choice that sets state directly (filters); `NativeSelect` inside forms whose
  handler reads `event.target.name`/`value`.
- Page building blocks in `src/components/page.jsx`: `Page`, `PageHeader`, `EmptyState`,
  `ErrorState`, `SuccessNotice`, `LoadingRows`, `LoadingText`, `StatusDot`.
- Dialogs with a form: `FormDialog` from `src/components/dialogs.jsx`. A row's actions:
  `RowMenu` from the same file.
- Confirming a destructive action: `useConfirm` from `src/components/ui/confirm-dialog.jsx`
  (an `AlertDialog`). Never `window.confirm`.
- Messages after an action: `SuccessNotice` on the page, or `toast` from `sonner`.
- Icons: `lucide-react`, default size `size-4`. Icon-only buttons need an `aria-label`.
- Merge class names with `cn` from `src/lib/utils`.
- Dates and times: `formatWib` from `src/lib/datetime`, which shows Jakarta time without
  seconds, such as `22/9/2026, 15.49 WIB`.
- API calls: `apiFetch` from `src/lib/api`. The signed-in admin: `getStoredAdmin` from `src/lib/auth`.
- Charts: `recharts`, using the CSS variables above instead of fixed colors.

## States

Every screen that loads data handles all of these:

- **Loading:** `LoadingRows` (skeletons) or `LoadingText` (a spinner with text).
- **Empty:** `EmptyState`: a dashed box with an icon, a short explanation and, where it helps, the next action.
- **Error:** `ErrorState`: a readable message with `role="alert"`, and a retry where it helps.

Buttons that start work are disabled and show progress (`Loader2` and a word such as
"Saving...") until it finishes. Destructive actions ask for confirmation first.

## Layout and accessibility

- Works from phone width up, with no horizontal page scroll; wide tables scroll inside their card.
  Start with the small layout and add `sm:`, `md:`, `lg:`.
- The menu is a fixed sidebar from `md:` up (it can shrink to icons) and a `Sheet` on phones.
- Check every change in both light and dark mode (the moon and sun button in the header).
- Everything works by keyboard, with a visible focus ring. Inputs have labels.

## Motion

Keep it short and purposeful: `transition-colors` on hover, the components' own open and
close animations, and nothing that delays the user. `prefers-reduced-motion` is handled
globally in `src/index.css`; motion started from JavaScript (charts, `CountUp`) checks it too.

## Text

The console is in English, with some older Indonesian text (Models). New text is in English.
There is no translation system here.

## Automatic checks

`scripts/check-design.mjs` checks these rules, so they do not depend on anyone remembering them.

- **While Claude Code works:** a hook in `.claude/settings.json` checks every file it edits and
  reports problems straight back, so it fixes them before you see the change.
- **By hand:** `npm run design:check` checks what this branch changes compared with `main`.
  `node scripts/check-design.mjs --all` lists what older code still breaks.
- **On pull requests:** the CI workflow runs the same check and fails when new lines break a rule.

It checks hex colors, palette colors (except the status pairs above), arbitrary values like
`p-[13px]` (`var(...)` values are fine), and `window.confirm` and `alert`. Only new and changed
lines are checked. `src/components/ui` is skipped, because it holds shadcn/ui's own code.

When a line must break a rule on purpose, put a comment containing `design-system-ignore` and
the reason on that line or the line above it. Spacing, wording and visual polish still need a
person to look at the result.
