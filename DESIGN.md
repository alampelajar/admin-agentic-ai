# Design system: Agentic AI admin console

Follow these rules for every screen, component and style change in this repository.
They describe how the console looks, so new work matches it. If a request conflicts
with a rule, follow the request and point out the conflict.

## Character

Simple and lively: clean surfaces, one strong blue accent, and gentle motion that makes
the console feel alive without getting in the way of the work.

## Colors

Colors are CSS variables, with light and dark values. `src/motion.css` loads last and
sets the blue accent, so change the brand color there.

| Use | Class or variable |
|---|---|
| Page background | `var(--app-bg)` |
| Text | `text-foreground`, `text-muted-foreground` |
| Cards and panels | `bg-card`, `text-card-foreground`, `border-border` |
| Main action | `bg-primary`, `text-primary-foreground` |
| Brand accent | `var(--brand)`, soft background `var(--brand-soft)` |
| Featured surface | `.hero-card`, which uses `var(--brand-gradient)` |
| Errors and destructive actions | `bg-destructive`, `text-destructive` |

- New work does not use hex values, or palette colors such as `bg-slate-800`, for interface colors.
- The one exception is status, which has no token yet. Use these pairs, with both modes:
  - Success: `bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300`
  - Warning: `bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300`
  - Danger: `bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300`
- Never let color carry meaning alone: add an icon or a word.

## Typography

Inter is the interface font. Do not add other fonts.

| Use | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight` |
| Section title | `text-base font-semibold` |
| Body | `text-sm` |
| Helper text and metadata | `text-xs text-muted-foreground` |
| Figures | add `tabular-nums` |

## Spacing and shape

- Use the Tailwind spacing scale only, not values like `p-[13px]`.
- A page root is `<div className="min-h-screen bg-[var(--app-bg)] p-6">`. `admin-polish.css` relies on it.
- Panels: `rounded-2xl border border-border bg-card p-5`.
- Gaps: `gap-4` between cards, `gap-6` or `mt-6` between sections.

## Components

Reuse before writing anything new.

- Controls: `src/components/ui` (`Button`, `Input`, `Card`, `Table`, `Badge`, `Alert`, `Skeleton`, `Separator`).
- API calls: `apiFetch` from `src/lib/api`.
- The signed-in admin: `getStoredAdmin` from `src/lib/auth`.
- Icons: inline SVG with `stroke="currentColor"`, as in `sidebar.jsx`. This repo has no icon library.
- Charts: `recharts`, using the variables above instead of fixed colors.

## Motion

Use the helpers in `src/motion.css` instead of writing new keyframes.

| Class | Effect |
|---|---|
| `.page-enter` | Already on every page: its sections rise in one after another |
| `.lift` | A card rises slightly on hover |
| `.kpi-card` with `--i` | A card rises in, delayed by its position |
| `.activity-item` with `--i` | A list row slides in, delayed by its position |
| `.skeleton` | Shimmering placeholder while loading |
| `.status-dot.is-running` | Pulsing status dot |

- Keep it under about 700ms, except quiet background loops.
- Finished animations must not leave a `transform` behind, or fixed dialogs inside the page break. Use `animation-fill-mode: backwards`.
- `prefers-reduced-motion` is handled globally in `motion.css`. Any motion started from JavaScript must check it too.

## States

Every screen that loads data handles all of these:

- **Loading:** `.skeleton` shapes matching the final layout, or short text.
- **Empty:** a short sentence saying what will appear.
- **Error:** a readable message with `role="alert"`.

Buttons that start work are disabled and say what is happening. Destructive actions ask for confirmation first.

## Layout and accessibility

- Works from phone width up, with no horizontal page scroll.
- Check every change in both light and dark mode.
- Everything works by keyboard. Icon-only buttons need an `aria-label`, and inputs need labels.

## Text

The console is in English, with some older Indonesian text. New text is in English. There is no translation system here.

## Existing code

Many older pages use raw `slate` colors. Do not copy them, and do not restyle them as
part of unrelated work: follow the rules in what you touch, and mention the rest.
