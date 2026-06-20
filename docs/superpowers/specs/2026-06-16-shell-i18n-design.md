---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: docs/README.md#superpowers-specs
---

# Playground Shell i18n + Language Switcher

**Date:** 2026-06-16
**Status:** Approved (brainstormed via AskUserQuestion)
**Scope:** All 3 playgrounds (react-playground, vue3-playground, vue2-playground)

## Goal

Add a **language switcher** (中文 / English, default 中文) to each playground's
Header, placed **left of the theme switcher**. It switches the language of the
**shell** (Header, Sidebar, Devbar, Footer, dialogs) AND swaps the 4 built-in
sample documents between Chinese and English. It does **not** affect the Mardora
editor's own UI text (that is already driven by `config.locale` in Vue via the
existing Devbar segmented control; React has no such control today).

## Decisions (from AskUserQuestion)

- **English docs:** Real translations of all 4 docs.
- **i18n layer:** Per-playground, duplicated (matches how theme/data are already
  organized). No shared package.

## Architecture

### Locale model

A shared locale type per playground. To avoid confusion with the existing
Mardora-internal `config.locale` ("zh-CN" | "en-US"), the **shell locale** uses
short codes:

```ts
export type ShellLocale = "zh" | "en";
```

### React (`react-playground`)

New files under `app/i18n/`:

- `locales.ts` — `type Messages = {...}` + `const messages: Record<ShellLocale, Messages>`.
  Keys cover every shell string (header, sidebar, devbar, footer, dialogs, mode/theme labels).
- `LocaleContext.tsx` — `LocaleProvider` (React Context) holding `locale` state,
  persisted to `localStorage["mardora-playground-locale"]`, default `"zh"`.
  Exposes `{ locale, setLocale, t }` via `useLocale()` hook. `t` is typed as
  `(key) => string`.
- `LanguageSwitcher.tsx` — dropdown button (lucide `Languages` icon + current
  locale label), uses the same `DropdownMenu` UI primitives as `ThemeSwitcher`.

Wiring:

- `app/layout.tsx`: wrap children in `<LocaleProvider>` (inside `<Providers>`).
- `app/playground/header.tsx`: insert `<LanguageSwitcher />` **before**
  `<ThemeSwitcher />`.
- Replace hardcoded strings in `header.tsx`, `sidebar.tsx`, `devbar.tsx`,
  `footer.tsx`, `create-content-dialog.tsx` with `t("...")`.

### Vue 3 (`vue3-playground`)

New files under `src/i18n/`:

- `locales.ts` — same Messages type + `messages` map.
- `index.ts` — `reactive({ locale })` store + `setLocale()` (persists to
  `localStorage["mardora-vue3-playground-locale"]`, default `"zh"`) + `t(key)`
  helper that reads from the reactive store. Exported as `i18n` and `useI18n()`
  (returns `{ t, locale, setLocale }`).

Wiring:

- `Header.vue`: add a new dropdown (matching existing theme/mode dropdown markup
  - `closeMenus` outside-click handler) before the theme dropdown. Labels via `t()`.
- Replace strings in `Header.vue`, `Sidebar.vue`, `Devbar.vue` (only the shell
  strings; the existing Language segmented control stays — it sets
  `config.locale` for the Mardora editor, independent of shell locale),
  `Footer.vue`, `CreateContentDialog.vue` via a global mixin or `useI18n()` in
  each component. **Choice:** use a global mixin installed in `main.ts` that
  adds `this.$t` + `this.$locale` + `this.$setLocale` (simplest for Options API
  components that already use `defineComponent`).

### Vue 2 (`vue2-playground`)

New files under `src/i18n/`:

- `locales.ts` — same Messages type + `messages` map.
- `index.ts` — `Vue.observable({ locale })` store + `setLocale()` (persists to
  `localStorage["mardora-vue2-playground-locale"]`, default `"zh"`) + a global
  mixin adding `$t`, `$locale` (computed), `$setLocale`.

Wiring mirrors Vue 3 (global mixin installed in `main.ts`; Header dropdown
before theme dropdown; strings replaced in Header/Sidebar/Devbar/Footer/
CreateContentDialog).

### Message key set (shared shape across all 3)

Roughly:

- `header.selectMode`, `header.selectTheme`, `header.selectLanguage`
- `header.saving`, `header.saved`
- `header.hideDevbar`, `header.showDevbar`
- `mode.live`, `mode.view`, `mode.code`, `mode.output`
- `theme.system`, `theme.light`, `theme.dark` (Vue playgrounds label themes
  with these; React uses raw theme value — leave as-is or translate)
- `sidebar.contents`, `sidebar.noContents`, `sidebar.createContent`
- `sidebar.rename`, `sidebar.delete`, `sidebar.renamePrompt`
- `dialog.create.title`, `dialog.create.description`, `dialog.create.placeholder`
- `dialog.create.cancel`, `dialog.create.confirm`
- `dialog.rename.title`, `dialog.rename.description`, `dialog.rename.placeholder`,
  `dialog.rename.cancel`, `dialog.rename.confirm`
- `dialog.delete.title`, `dialog.delete.description`, `dialog.delete.cancel`,
  `dialog.delete.confirm`
- `devbar.title`, `devbar.outputTime` (interpolated), `devbar.editorOptions`,
  `devbar.previewOptions`, `devbar.featureOptions`, `devbar.plugins`,
  `devbar.nodes`, `devbar.nodesHint`
- All editor/preview/feature option labels + descriptions (mapping table)
- `footer.words`, `footer.lines`, `footer.chars`
- `empty.noContentSelected`, `empty.create`
- `common.loading`

Interpolation: a tiny `t(key, vars?)` that does `str.replace(/{(\w+)}/g, ...)`
covers `outputTime` and any future needs. Avoids pulling in a templating lib.

### Document language switching

For each playground, add 4 English doc files alongside the (current = Chinese) ones:

```
app/data/md/project-introduction.en.ts   (existing project-introduction.ts stays = zh)
app/data/md/react-guide.en.ts
app/data/md/vue2-guide.en.ts
app/data/md/vue3-guide.en.ts
```

Convention: existing `*.ts` = Chinese; new `*.en.ts` = English.

New `defaultContents(locale: ShellLocale)` returns the 4 docs with translated
**titles** for the requested locale.

**On locale change:** when shell locale changes, replace the built-in doc
entries (matched by id: `project-introduction | vue2-guide | vue3-guide |
react-guide`) with the other locale's version, **preserving user-created docs
and any edits the user made to non-default docs**. Default docs that the user
has _edited_ are still swapped to the new language (they're scaffold docs; the
version bump already treats them as refreshable). This is the simplest correct
behavior and matches the existing version-refresh semantics.

Bump `STORAGE_VERSION` (React) / `STORAGE_VERSION` (Vue) by 1 so cached default
entries refresh to the new locale-aware shape.

### Language switcher UI (all 3)

- Icon: the provided `lucide-languages` SVG (inline in Vue; `Languages` from
  `lucide-react` in React).
- Button: icon + current locale label (`中文` / `EN`), chevron.
- Dropdown: two items — `中文`, `English` — current one with a check.
- Default: `中文`.

## Out of scope

- The Mardora editor package's own i18n (separate; already exists).
- React Devbar has no Language control; we do NOT add one (matches the request:
  the switcher drives the shell + docs, not the editor internals).
- Persisting per-doc edits across language swaps (see "On locale change" above).

## Verification

- `bun run typecheck` passes in all 3 playgrounds.
- ESLint clean on touched React files.
- Manual: switch language in each playground, confirm Header/Sidebar/Devbar/
  Footer labels translate and the 4 sample docs swap to the matching language;
  user-created docs persist.
