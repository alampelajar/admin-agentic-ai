# Design system: Agentic AI admin console

Follow these rules for every screen, component and style change in this repository.
The console follows [Material Design 3](https://m3.material.io), built with our own
tokens and components (no MUI or `@material/web`). If a request conflicts with a rule,
follow the request and point out the conflict.

## Character

Calm and clear, in the Material 3 way: tonal surfaces instead of shadows, one blue
seed color, rounded shapes, and short motion that explains what changed.

## Colors

The scheme is generated from the seed color `#455bd5` with
`@material/material-color-utilities` (`scripts/m3-theme.mjs`) and written to
`src/index.css` as `oklch` values, for light mode (`:root`) and dark mode (`html.dark`).
To change the brand, change the seed and run the script again; do not edit the values by hand.

Always use the Tailwind names below, so both modes work automatically.

| Material 3 role | Class | Use |
|---|---|---|
| surface / on-surface | `bg-background`, `text-foreground` | Page background and text |
| surface-container-low | `bg-card`, `bg-sidebar` | Cards, navigation drawer |
| surface-container | `bg-popover` | Menus, dropdowns |
| surface-container-high | `bg-surface-high` | Dialogs |
| surface-container-highest | `bg-muted` | Quiet surfaces, filled areas |
| on-surface-variant | `text-muted-foreground` | Secondary text, icons |
| primary / on-primary | `bg-primary`, `text-primary-foreground` | Filled buttons, main action |
| primary-container | `bg-primary-container`, `text-on-primary-container` | Highlighted cards |
| secondary-container | `bg-secondary`, `text-secondary-foreground` | Tonal buttons, active navigation item |
| tertiary, tertiary-container | `text-tertiary`, `bg-tertiary-container`, `text-on-tertiary-container` | Contrasting accents |
| error / on-error | `bg-destructive`, `text-destructive`, `text-destructive-foreground` | Errors, destructive actions |
| error-container | `bg-error-container`, `text-on-error-container` | Error banners |
| outline-variant | `border-border` | Dividers, card outlines |
| outline | `border-input` | Text field outlines |
| secondary | `ring-ring` | Focus indicator |
| inverse-surface | `bg-inverse-surface`, `text-inverse-on-surface` | Tooltips, snackbars |
| on-surface at 8% over surface | `bg-accent`, `text-accent-foreground` | Hover state layer |
| — | `chart-1` to `chart-5` | Charts |

- Do not use hex values, or palette colors such as `bg-slate-800`, for interface colors.
- The one exception is status, which has no Material role. Use these pairs, with both modes:
  - Success: `bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300`
  - Warning: `bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300`
  - Danger: `bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300`
- Never let color carry meaning alone: add an icon or a word.
- Text has a contrast of at least 4.5:1 against its surface in both modes.

## State layers

Interactive controls show their state with a layer of their content color, not with a
new color or a shadow:

| State | Layer |
|---|---|
| Hover | 8% |
| Focus | 10%, plus the `ring-ring` focus indicator |
| Pressed | 10% |
| Disabled | content at 38%, container at 12% |

Use the `.state-layer` helper from `src/m3.css`. There is no JavaScript ripple.

## Elevation

Surfaces are told apart by their surface color, not by shadows. Only floating
elements get a shadow:

| Level | Class | Use |
|---|---|---|
| 0 | none | Cards, drawer, app bar, page |
| 2 | `shadow-m3-2` | Menus, dropdowns, popovers |
| 3 | `shadow-m3-3` | Dialogs |

## Typography

Inter is the interface font (Material 3 allows a brand typeface). Do not add other fonts.

| Use | Material 3 scale | Classes |
|---|---|---|
| Page title | Headline small, 24/32 | `text-2xl font-normal` |
| Section title | Title medium, 16/24 | `text-base font-medium` |
| Body | Body medium, 14/20 | `text-sm` |
| Helper text and metadata | Body small, 12/16 | `text-xs text-muted-foreground` |
| Button label | Label large, 14/20 | `text-sm font-medium` |
| Figures | | add `tabular-nums` |

## Shape

| Token | Radius | Use |
|---|---|---|
| `rounded-field` | 4px | Text fields, menus, tooltips, snackbars |
| `rounded-chip` | 8px | Chips, badges |
| `rounded-card` | 12px | Cards, panels |
| `rounded-sheet` | 16px | Side sheets (inner edge) |
| `rounded-dialog` | 28px | Dialogs |
| `rounded-full` | full | Buttons, icon buttons, active navigation item |

## Spacing and layout

- Use the Tailwind spacing scale only, not values like `p-[13px]`.
- A page root is `<div className="min-h-screen bg-background p-6">`.
- Panels: `rounded-card border border-border bg-card p-5`.
- Gaps: `gap-4` between cards, `gap-6` or `mt-6` between sections.
- Navigation drawer: `bg-sidebar`, the active item is a 56px pill in `bg-secondary`.
  Collapsed, it becomes a navigation rail.
- Top app bar: 64px tall, `bg-background`.

## Components

Reuse before writing anything new. `src/components/ui` holds the Material 3 versions:

| Component | Material 3 | Notes |
|---|---|---|
| `Button` default | Filled button | 40px tall, `rounded-full`, 24px padding |
| `Button` secondary | Filled tonal button | secondary-container |
| `Button` outline | Outlined button | `border-input` outline |
| `Button` ghost, link | Text button | |
| `Button` destructive | Filled, error colors | |
| `Button` icon | Icon button | 40px, round, needs `aria-label` |
| `Card` | Outlined card | `rounded-card`, outline-variant, no shadow |
| `Input`, `PasswordInput` | Outlined text field | 56px, `rounded-field`, 2px primary outline on focus, error outline when `aria-invalid` |
| `Badge` | Assist chip (look only) | 32px, `rounded-chip` |
| `Table` | (no M3 component) | 52px rows, outline-variant dividers, header `text-sm font-medium` |
| `Alert` | | `bg-error-container` for errors, `role="alert"` |

- Confirming a destructive action: `useConfirm` from `src/components/ui/confirm-dialog.jsx`,
  a Material 3 dialog. Never `window.confirm`.
- Dates and times: `formatWib` from `src/lib/datetime`, which shows Jakarta time without
  seconds, such as `22/9/2026, 15.49 WIB`.
- API calls: `apiFetch` from `src/lib/api`.
- The signed-in admin: `getStoredAdmin` from `src/lib/auth`.
- Icons: inline SVG with `stroke="currentColor"`, as in `sidebar.jsx`, default 20px (`size-5`).
  This repo has no icon library.
- Charts: `recharts`, using `var(--chart-1)` to `var(--chart-5)` instead of fixed colors.

## Motion

- Transitions take 200ms with the Material standard easing `cubic-bezier(0.2, 0, 0, 1)`
  (`duration-200 ease-m3`).
- Use the helpers in `src/motion.css` (`.page-enter`, `.kpi-card`, `.activity-item`,
  `.skeleton`, `.status-dot.is-running`) instead of writing new keyframes. Keep them under 700ms.
- Finished animations must not leave a `transform` behind, or fixed dialogs inside the page
  break. Use `animation-fill-mode: backwards`.
- `prefers-reduced-motion` is handled globally in `motion.css`. Any motion started from
  JavaScript must check it too.

## States

Every screen that loads data handles all of these:

- **Loading:** `.skeleton` shapes matching the final layout, or short text.
- **Empty:** a short sentence saying what will appear.
- **Error:** a readable message with `role="alert"`.

Buttons that start work are disabled and say what is happening. Destructive actions ask for confirmation first.

## Layout and accessibility

- Works from phone width up, with no horizontal page scroll.
- Check every change in both light and dark mode.
- Everything works by keyboard, with a visible focus indicator. Icon-only buttons need an
  `aria-label`, and inputs need labels.

## Text

The console is in English, with some older Indonesian text. New text is in English. There is no translation system here.

## Existing code

Some older pages still use raw `slate` colors and their own radius and shadow classes.
Restyle them only when the work is about their look; otherwise follow the rules in what
you touch, and mention the rest.

## Automatic checks

`scripts/check-design.mjs` checks these rules, so they do not depend on anyone remembering them.

- **While Claude Code works:** a hook in `.claude/settings.json` checks every file it edits and
  reports problems straight back, so it fixes them before you see the change.
- **By hand:** `npm run design:check` checks what this branch changes compared with `main`.
  `node scripts/check-design.mjs --all` lists what older code still breaks.
- **On pull requests:** the CI workflow runs the same check and fails when new lines break a rule.

It checks hex colors, palette colors (except the status pairs above, and white on the blue
brand surfaces), arbitrary values like `p-[13px]` (`var(...)` values are fine), and
`window.confirm` and `alert`. Only new and changed lines are checked, so older pages pass
until someone touches them.

When a line must break a rule on purpose, put a comment containing `design-system-ignore` and
the reason on that line or the line above it. Spacing, wording and visual polish still need a
person to look at the result.
