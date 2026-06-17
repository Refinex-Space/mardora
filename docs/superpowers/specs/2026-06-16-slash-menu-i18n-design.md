---
owner: refinex
updated: 2026-06-16
status: active
referenced_by: docs/README.md#superpowers-specs
---

# Slash Menu I18n Design

## Goal

Add a small, framework-agnostic internationalization layer for Markora editor UI text. The first delivery scope covers the slash command menu only.

The default language is Simplified Chinese. Integrators can opt into English without rebuilding the entire slash command list.

## Context

The current slash menu implementation lives in `packages/markora/src/editor/slash`.

Today, localized text is split across two places:

- `default-commands.ts`: command titles such as `文本`, `标题 1`, `图片`, plus aliases and right-side hints.
- `menu.ts`: group labels and menu chrome such as `基本区块`, `媒体`, `没有匹配的命令`, and `关闭菜单`.

The search path in `query.ts` already indexes `title`, `id`, `hint`, and `aliases`, so bilingual search can be preserved by shaping localized command aliases carefully.

## Constraints

- Keep the capability in `packages/markora`, not in a playground.
- Do not introduce a runtime i18n framework or dependency.
- Keep the default behavior backward-compatible: no configuration still renders Chinese slash menu text.
- Preserve custom `slashCommands.commands`; integrators who provide commands stay in control of command titles.
- Support Vue2, React, Vue3, and vanilla CodeMirror integrations through the same core API.
- Keep command insertion behavior unchanged. Only display text and searchable aliases are localized.
- Avoid a broad product-wide i18n abstraction before more editor surfaces need it.

## Recommended Approach

Use a core-owned, typed dictionary for Markora UI strings and a locale-aware default slash command factory.

Supported locales:

```ts
export type MarkoraLocale = "zh-CN" | "en-US";
```

Default locale:

```ts
const defaultMarkoraLocale: MarkoraLocale = "zh-CN";
```

This keeps the first version simple while leaving a stable seam for later editor surfaces such as the selection toolbar.

## Public API

Add locale options to the core config:

```ts
type MarkoraI18nConfig = {
  locale?: MarkoraLocale;
};

type MarkoraConfig = {
  locale?: MarkoraLocale;
  i18n?: MarkoraI18nConfig;
  slashCommands?: MarkoraSlashCommandsConfig;
};
```

Extend slash command config:

```ts
type MarkoraSlashCommandsConfig = {
  enabled?: boolean;
  locale?: MarkoraLocale;
  commands?: MarkoraSlashCommand[];
};
```

Resolution order:

1. `slashCommands.locale`
2. `i18n.locale`
3. `locale`
4. `"zh-CN"`

This allows app-wide editor locale through `markora({ locale: "en-US" })` while still allowing slash-only override when needed.

## Slash Dictionary

Add a localized slash menu message type:

```ts
type MarkoraSlashMessages = {
  groups: Record<MarkoraSlashCommandGroup, string>;
  empty: string;
  close: string;
  closeHint: string;
};
```

Initial dictionaries:

```ts
zh-CN:
  groups.basic = "基本区块"
  groups.media = "媒体"
  empty = "没有匹配的命令"
  close = "关闭菜单"
  closeHint = "esc"

en-US:
  groups.basic = "Basic blocks"
  groups.media = "Media"
  empty = "No matching commands"
  close = "Close menu"
  closeHint = "esc"
```

The menu renderer receives messages explicitly instead of reading hard-coded constants.

## Default Commands

Replace the single hard-coded command list with a locale-aware factory:

```ts
export function getDefaultSlashCommands(locale: MarkoraLocale = "zh-CN"): MarkoraSlashCommand[];
```

Keep the existing export for compatibility:

```ts
export const defaultSlashCommands = getDefaultSlashCommands("zh-CN");
```

Localized titles:

| Command        | zh-CN        | en-US         |
| -------------- | ------------ | ------------- |
| paragraph      | 文本         | Text          |
| heading-1      | 标题 1       | Heading 1     |
| heading-2      | 标题 2       | Heading 2     |
| heading-3      | 标题 3       | Heading 3     |
| heading-4      | 标题 4       | Heading 4     |
| heading-5      | 标题 5       | Heading 5     |
| heading-6      | 标题 6       | Heading 6     |
| quote          | 引用         | Quote         |
| ordered-list   | 有序列表     | Numbered list |
| unordered-list | 项目符号列表 | Bulleted list |
| task-list      | 待办清单     | To-do list    |
| table          | 表格         | Table         |
| divider        | 分隔线       | Divider       |
| link           | 链接         | Link          |
| file           | 文件         | File          |
| image          | 图片         | Image         |
| video          | 视频         | Video         |
| audio          | 音频         | Audio         |

The Markdown markers and insertion templates do not change.

## Search Behavior

Both locales should support Chinese and English search terms.

Examples:

- In Chinese UI, `/图片`, `/image`, and `/img` find the image command.
- In English UI, `/image`, `/img`, and `/图片` find the image command.
- `/标题`, `/heading`, and `/h2` continue to find heading commands when applicable.

Implementation rule:

- Command `title` is localized to the selected locale.
- Command `aliases` include stable English aliases and Chinese aliases where useful.
- `filterSlashCommands()` remains unchanged unless tests reveal locale-specific matching gaps.

## Custom Commands

If an integrator passes `slashCommands.commands`, Markora does not translate those custom commands.

Reason:

- Custom commands may be product-specific.
- Markora cannot infer translation quality.
- The integrator should provide localized custom commands for their own UI.

Menu chrome still follows the resolved locale, because group labels and footer text remain Markora-owned.

## Vue2 Playground

Expose a Developer Panel debugging control:

- Label: `Language`
- Options: `中文`, `English`
- Default: `zh-CN`

The Vue2 playground stores the selected locale in its existing config state and passes it to:

```ts
markora({
  locale: config.locale,
  slashCommands: {
    enabled: config.features.slashCommands,
  },
});
```

The playground should demonstrate that the same core package can render both Chinese and English slash menus without Vue2-only command forks.

## Testing

Add or update package-level tests for:

- `getDefaultSlashCommands("zh-CN")` returns Chinese titles.
- `getDefaultSlashCommands("en-US")` returns English titles.
- Both locales include aliases that allow Chinese and English query matching.
- `createSlashMenuElement()` renders localized group labels, empty text, and footer text.
- `slashCommands({ locale: "en-US" })` uses English default commands when no custom commands are provided.
- Passing custom `commands` preserves custom command titles while localizing menu chrome.

Add Vue2 playground verification through build and browser checks:

- Default menu appears in Chinese.
- Switching Developer Panel language to English updates slash menu display.
- Chinese and English search terms still filter commands in both modes.

## Done When

- `markora()` with no locale renders Chinese slash menu text.
- `markora({ locale: "en-US" })` renders English slash command titles, group labels, empty state, and footer.
- `slashCommands.locale` can override the top-level locale for slash only.
- Existing `defaultSlashCommands` import remains source-compatible and Chinese by default.
- Vue2 playground exposes the locale switch and passes it through the public Markora API.
- Relevant typecheck, build, unit tests, and browser validation pass.

## Rollback

Rollback is limited to removing the i18n types, dictionaries, localized command factory, locale config plumbing, and Vue2 playground language control. Existing slash command insertion behavior should remain untouched.
