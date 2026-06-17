---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: docs/README.md#superpowers-specs
---

# Header Icon-Only Refactor + Theme-aware Logo

**Date:** 2026-06-16
**Status:** Approved (brainstormed via AskUserQuestion)
**Scope:** All 3 playgrounds (react-playground, vue3-playground, vue2-playground)

## Goal

Refactor the Header action bar so every control is **icon-only** with a hover
tooltip, and replace the "Markora" wordmark with a **theme-aware inline logo**.
Click behavior (dropdowns) stays unchanged.

## Decisions (from AskUserQuestion)

- **Logo theme switch:** inline SVG, swap variant by current theme. No public-dir
  asset serving needed.
- **Mode toggle icon:** static `GalleryHorizontalEnd` icon; current mode shown only
  inside the dropdown (with check).
- **Tooltip scope:** Header action buttons only (sidebar toggle, language, theme,
  mode, devbar toggle).

## Icons

All from `lucide-react` (React) / inline SVG markup (Vue):

| Action                | Icon                   |
| --------------------- | ---------------------- |
| Sidebar toggle (left) | `PanelLeftClose`       |
| Language              | `Languages`            |
| Theme                 | `Palette`              |
| Mode                  | `GalleryHorizontalEnd` |
| Devbar toggle (right) | `PanelRightClose`      |

Note: the sidebar-toggle and devbar-toggle icons are single icons regardless of
open/closed state (consistent with "icon-only" — the tooltip text indicates the
action). If a clearer affordance is wanted later, we can swap to open/close pairs,
but for now one icon per control.

## Tooltip implementation

- **React:** wrap each icon button in `<Tooltip><TooltipTrigger asChild>…`
  `<TooltipContent>{t("…")}</TooltipContent></Tooltip>` using the existing
  `@workspace/ui/components/tooltip` primitive (Radix-based, delay 0).
- **Vue 3 / Vue 2:** native HTML `title` attribute on the toolbar button. Keeps the
  playground dependency-free (Vue playgrounds have no tooltip lib and adding one
  is out of scope for an icon-only tweak).
- Tooltip text reuses existing i18n keys:
  - sidebar toggle: `header.toggleSidebar` (new key — zh: "切换文档目录" / en: "Toggle contents")
  - language: `header.selectLanguage`
  - theme: `header.selectTheme`
  - mode: `header.selectMode`
  - devbar toggle: `header.hideDevbar` / `header.showDevbar` (depends on state)

The new `header.toggleSidebar` key is added to all three playgrounds' locale dicts.

## Trigger button shape

- React: each dropdown trigger becomes `<Button variant="ghost" size="icon"
className="size-8">`. The `<img>`/icon inside is `size-4`-ish. No label text,
  no visible chevron (the dropdown still opens on click). Theme/Mode/Language
  dropdowns keep their `<DropdownMenuContent>` with labels + check, unchanged.
- Vue: toolbar buttons keep their existing `toolbar-button` class but the inner
  `<span>` text is removed, leaving only the icon span. The CSS icon spans
  (`.icon-panel`, `.icon-screen`, `.mode-dot`, `.icon-languages`) are replaced by
  inline SVG markup matching the chosen lucide icon. Devbar toggle likewise
  becomes icon-only.

## Theme-aware logo

- Inline the SVG (path data) as a constant. Two variants:
  - `LOGO_DARK_SVG` = the dark-mode logo (white paths on dark bg) — shown when
    theme resolves to dark.
  - `LOGO_LIGHT_SVG` = the light-mode logo (dark paths on light bg) — shown when
    light.
    Source: the existing `public/markora-logo-dark.svg` / `markora-logo-light.svg`
    path data (already in the repo for React).
- **React (`Header`):** render `<span dangerouslySetInnerHTML={{__html: logo}} />`
  (or inline JSX paths) where `logo` picks the variant from `useTheme().resolvedTheme`.
  Size ~`size-7`. Replace the `<h2 className="text-xl font-mono">markora</h2>`.
- **Vue 3 / Vue 2:** the logo variant is selected from the existing `theme`
  prop (`"light" | "dark"`), rendered via `v-html` on an inline span, replacing
  `<span class="brand">markora</span>`.
- The logo + sidebar-toggle remain grouped on the left; the 4 action buttons on
  the right.

## Out of scope

- Tooltips on Sidebar/Devbar icon buttons (only Header per decision).
- Changing the ThemeSwitcher/ModeSwitcher dropdown _contents_ (labels + check) —
  only the trigger becomes icon-only.
- Logo on the React landing page (already done in an earlier change).

## Verification

- `bun run typecheck` passes in all 3 playgrounds.
- ESLint clean on touched React files.
- Vue 3/2 unit tests still pass.
- Visual: each Header control is a single icon; hovering shows a tooltip;
  clicking opens the same dropdown; logo swaps with theme toggle.
