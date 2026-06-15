# Vue2 Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vue 2.6 + Vue CLI 4 + Webpack 4 playground app that matches the current Draftly `/playground` capabilities.

**Architecture:** Add `apps/vue2-playground` as an isolated workspace app. It consumes built `draftly` package exports, manages CodeMirror 6 directly from Vue2 lifecycle hooks, and copies playground data/config locally so the React playground remains untouched.

**Tech Stack:** Vue 2.6.14, Vue CLI 4.5.19, Webpack 4, TypeScript, CodeMirror 6, Draftly package exports, localStorage, Jest through Vue CLI unit test plugin.

---

## File Structure

- Create `apps/vue2-playground/package.json`: Vue CLI app scripts and dependencies.
- Create `apps/vue2-playground/babel.config.js`: Vue CLI Babel preset.
- Create `apps/vue2-playground/tsconfig.json`: TypeScript config for Vue2 SFCs and tests.
- Create `apps/vue2-playground/vue.config.js`: Webpack 4 compatibility and workspace package resolution.
- Create `apps/vue2-playground/public/index.html`: Vue CLI HTML shell.
- Create `apps/vue2-playground/src/main.ts`: Vue app bootstrap.
- Create `apps/vue2-playground/src/App.vue`: App root that renders the playground.
- Create `apps/vue2-playground/src/shims-vue.d.ts`: Vue SFC typing.
- Create `apps/vue2-playground/src/types.ts`: Shared playground types.
- Create `apps/vue2-playground/src/data/md/what-is-draftly.ts`: Copied first default Markdown document.
- Create `apps/vue2-playground/src/data/md/walkthrough.ts`: Copied walkthrough Markdown document.
- Create `apps/vue2-playground/src/data/defaultContents.ts`: Copied default documents and storage version.
- Create `apps/vue2-playground/src/state/storage.ts`: localStorage load/save helpers.
- Create `apps/vue2-playground/src/state/playgroundConfig.ts`: default config and plugin toggle helpers.
- Create `apps/vue2-playground/src/utils/contentMetrics.ts`: word, line, and character counts.
- Create `apps/vue2-playground/src/components/playground/Playground.vue`: top-level state owner.
- Create `apps/vue2-playground/src/components/playground/Header.vue`: panel toggles, mode switch, save status.
- Create `apps/vue2-playground/src/components/playground/Sidebar.vue`: document list and document actions.
- Create `apps/vue2-playground/src/components/playground/CreateContentDialog.vue`: create-document form.
- Create `apps/vue2-playground/src/components/playground/EditorPane.vue`: CodeMirror editor, preview, output panes.
- Create `apps/vue2-playground/src/components/playground/Devbar.vue`: plugin/config toggles and AST view.
- Create `apps/vue2-playground/src/components/playground/Footer.vue`: counts.
- Create `apps/vue2-playground/tests/unit/storage.spec.ts`: persistence behavior tests.
- Create `apps/vue2-playground/tests/unit/playgroundConfig.spec.ts`: plugin/config defaults tests.
- Create `apps/vue2-playground/tests/unit/contentMetrics.spec.ts`: count behavior tests.
- Modify `README.md`: add Vue2 playground commands and relationship to the existing Next playground.
- Modify `turbo.json` only if Vue2 app build/lint tasks need output or cache metadata not already covered.

## Task 1: Scaffold Vue CLI 4 App Shell

**Files:**
- Create: `apps/vue2-playground/package.json`
- Create: `apps/vue2-playground/babel.config.js`
- Create: `apps/vue2-playground/tsconfig.json`
- Create: `apps/vue2-playground/vue.config.js`
- Create: `apps/vue2-playground/public/index.html`
- Create: `apps/vue2-playground/src/main.ts`
- Create: `apps/vue2-playground/src/App.vue`
- Create: `apps/vue2-playground/src/shims-vue.d.ts`

- [ ] **Step 1: Add the Vue2 package manifest**

Create `apps/vue2-playground/package.json` with this content:

```json
{
  "name": "vue2-playground",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vue-cli-service serve --port 3001",
    "serve": "vue-cli-service serve --port 3001",
    "build": "vue-cli-service build",
    "lint": "vue-cli-service lint",
    "test:unit": "vue-cli-service test:unit"
  },
  "dependencies": {
    "@codemirror/commands": "^6.10.1",
    "@codemirror/lang-css": "^6.3.1",
    "@codemirror/lang-html": "^6.4.11",
    "@codemirror/lang-markdown": "^6.5.0",
    "@codemirror/language": "^6.12.1",
    "@codemirror/language-data": "^6.5.2",
    "@codemirror/state": "^6.5.4",
    "@codemirror/view": "^6.39.11",
    "@uiw/codemirror-theme-github": "^4.25.4",
    "draftly": "workspace:*",
    "uuid": "^13.0.0",
    "vue": "2.6.14"
  },
  "devDependencies": {
    "@types/jest": "^29.5.14",
    "@types/uuid": "^10.0.0",
    "@vue/cli-plugin-babel": "4.5.19",
    "@vue/cli-plugin-eslint": "4.5.19",
    "@vue/cli-plugin-typescript": "4.5.19",
    "@vue/cli-plugin-unit-jest": "4.5.19",
    "@vue/cli-service": "4.5.19",
    "@vue/eslint-config-typescript": "^7.0.0",
    "@vue/test-utils": "^1.3.6",
    "babel-jest": "^26.6.3",
    "eslint": "^6.8.0",
    "eslint-plugin-vue": "^6.2.2",
    "ts-jest": "^26.5.6",
    "typescript": "^4.9.5",
    "vue-template-compiler": "2.6.14"
  }
}
```

- [ ] **Step 2: Add Vue CLI config files**

Create `apps/vue2-playground/babel.config.js`:

```js
module.exports = {
  presets: ["@vue/cli-plugin-babel/preset"],
};
```

Create `apps/vue2-playground/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "es2019",
    "module": "esnext",
    "strict": true,
    "jsx": "preserve",
    "importHelpers": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "baseUrl": ".",
    "types": ["webpack-env", "jest"],
    "paths": {
      "@/*": ["src/*"]
    },
    "lib": ["esnext", "dom", "dom.iterable", "scripthost"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "tests/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `apps/vue2-playground/vue.config.js`:

```js
const path = require("path");

module.exports = {
  transpileDependencies: ["draftly", "@codemirror", "@lezer", "style-mod", "uuid"],
  configureWebpack: {
    resolve: {
      symlinks: true,
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  },
};
```

- [ ] **Step 3: Add the Vue app entry files**

Create `apps/vue2-playground/public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
    <title>Draftly Vue2 Playground</title>
  </head>
  <body>
    <noscript>JavaScript is required to run Draftly Vue2 Playground.</noscript>
    <div id="app"></div>
  </body>
</html>
```

Create `apps/vue2-playground/src/main.ts`:

```ts
import Vue from "vue";
import App from "./App.vue";
import "./styles.css";

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount("#app");
```

Create `apps/vue2-playground/src/App.vue`:

```vue
<template>
  <Playground />
</template>

<script lang="ts">
import Vue from "vue";
import Playground from "./components/playground/Playground.vue";

export default Vue.extend({
  name: "App",
  components: {
    Playground,
  },
});
</script>
```

Create `apps/vue2-playground/src/shims-vue.d.ts`:

```ts
declare module "*.vue" {
  import Vue from "vue";

  export default Vue;
}
```

- [ ] **Step 4: Install workspace dependencies**

Run:

```bash
bun install
```

Expected: install completes and updates only the root `bun.lock`; no `apps/vue2-playground/package-lock.json` or `apps/vue2-playground/pnpm-lock.yaml` is created.

- [ ] **Step 5: Run the first shell build**

Run:

```bash
bun run --cwd apps/vue2-playground build
```

Expected: build fails because `Playground.vue` and `styles.css` do not exist yet. The failure confirms Vue CLI can start from the new app manifest.

- [ ] **Step 6: Commit the scaffold**

Run:

```bash
git add apps/vue2-playground/package.json apps/vue2-playground/babel.config.js apps/vue2-playground/tsconfig.json apps/vue2-playground/vue.config.js apps/vue2-playground/public/index.html apps/vue2-playground/src/main.ts apps/vue2-playground/src/App.vue apps/vue2-playground/src/shims-vue.d.ts bun.lock
git commit -m "feat(playground): scaffold vue2 playground app"
```

Expected: commit succeeds and does not include existing unrelated `README.md` changes unless they were created by this plan execution.

## Task 2: Add Shared Types, Default Content, and Pure State Helpers

**Files:**
- Create: `apps/vue2-playground/src/types.ts`
- Create: `apps/vue2-playground/src/data/md/what-is-draftly.ts`
- Create: `apps/vue2-playground/src/data/md/walkthrough.ts`
- Create: `apps/vue2-playground/src/data/defaultContents.ts`
- Create: `apps/vue2-playground/src/state/storage.ts`
- Create: `apps/vue2-playground/src/state/playgroundConfig.ts`
- Create: `apps/vue2-playground/src/utils/contentMetrics.ts`
- Create: `apps/vue2-playground/tests/unit/storage.spec.ts`
- Create: `apps/vue2-playground/tests/unit/playgroundConfig.spec.ts`
- Create: `apps/vue2-playground/tests/unit/contentMetrics.spec.ts`

- [ ] **Step 1: Add shared TypeScript types**

Create `apps/vue2-playground/src/types.ts`:

```ts
import type { DraftlyNode } from "draftly/editor";

export type PlaygroundMode = "live" | "view" | "code" | "output";
export type SaveStatus = "idle" | "saving" | "saved";
export type PluginConfig = Record<string, boolean>;

export interface Content {
  id: string;
  title: string;
  content: string;
}

export interface PlaygroundConfig {
  editor: {
    baseStyles: boolean;
    defaultKeybindings: boolean;
    history: boolean;
    indentWithTab: boolean;
    highlightActiveLine: boolean;
    lineWrapping: boolean;
  };
  preview: {
    includeBase: boolean;
    sanitize: boolean;
  };
  plugins: PluginConfig;
}

export interface PreviewOutput {
  html: string;
  css: string;
}

export interface PlaygroundStateSnapshot {
  contents: Content[];
  currentContent: number;
  version: number;
}

export type NodesChangeHandler = (nodes: DraftlyNode[]) => void;
```

- [ ] **Step 2: Copy default Markdown modules into the Vue2 app**

Run:

```bash
mkdir -p apps/vue2-playground/src/data/md
cp apps/web/app/data/md/what-id-draftly.ts apps/vue2-playground/src/data/md/what-is-draftly.ts
cp apps/web/app/data/md/walkthrough.ts apps/vue2-playground/src/data/md/walkthrough.ts
```

Expected: the two Vue2 files export the same default Markdown strings as the existing React playground files.

- [ ] **Step 3: Add default content registry**

Create `apps/vue2-playground/src/data/defaultContents.ts`:


```ts
import type { Content } from "@/types";
import whatIsDraftly from "./md/what-is-draftly";
import walkthrough from "./md/walkthrough";

export const STORAGE_VERSION = 1;

export const defaultContents: Content[] = [
  {
    id: "0",
    title: "What is Draftly?",
    content: whatIsDraftly,
  },
  {
    id: "1",
    title: "Walkthrough",
    content: walkthrough,
  },
];

export const defaultContentIds = new Set(defaultContents.map((content) => content.id));
```

- [ ] **Step 4: Add config helper tests**

Create `apps/vue2-playground/tests/unit/playgroundConfig.spec.ts`:

```ts
import { allPlugins } from "draftly/plugins";
import { createDefaultConfig, getActivePlugins } from "@/state/playgroundConfig";

describe("playgroundConfig", () => {
  it("enables every Draftly plugin by default", () => {
    const config = createDefaultConfig();

    for (const plugin of allPlugins) {
      expect(config.plugins[plugin.name.toLowerCase()]).toBe(true);
    }
  });

  it("filters inactive plugins", () => {
    const config = createDefaultConfig();
    const firstPlugin = allPlugins[0];
    config.plugins[firstPlugin.name.toLowerCase()] = false;

    const activePlugins = getActivePlugins(config.plugins);

    expect(activePlugins.some((plugin) => plugin.name === firstPlugin.name)).toBe(false);
  });
});
```

- [ ] **Step 5: Add config helpers**

Create `apps/vue2-playground/src/state/playgroundConfig.ts`:

```ts
import { allPlugins } from "draftly/plugins";
import type { DraftlyPlugin } from "draftly/editor";
import type { PlaygroundConfig, PluginConfig } from "@/types";

export function createDefaultPluginConfig(): PluginConfig {
  return Object.fromEntries(allPlugins.map((plugin) => [plugin.name.toLowerCase(), true]));
}

export function createDefaultConfig(): PlaygroundConfig {
  return {
    editor: {
      baseStyles: true,
      defaultKeybindings: true,
      history: true,
      indentWithTab: true,
      highlightActiveLine: true,
      lineWrapping: true,
    },
    preview: {
      includeBase: true,
      sanitize: true,
    },
    plugins: createDefaultPluginConfig(),
  };
}

export function getActivePlugins(pluginConfig: PluginConfig): DraftlyPlugin[] {
  return allPlugins.filter((plugin) => pluginConfig[plugin.name.toLowerCase()] !== false);
}
```

- [ ] **Step 6: Add storage tests**

Create `apps/vue2-playground/tests/unit/storage.spec.ts`:

```ts
import { defaultContents, STORAGE_VERSION } from "@/data/defaultContents";
import {
  loadPlaygroundSnapshot,
  STORAGE_CONTENTS_KEY,
  STORAGE_CURRENT_KEY,
  STORAGE_VERSION_KEY,
} from "@/state/storage";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("seeds default contents on first visit", () => {
    const snapshot = loadPlaygroundSnapshot();

    expect(snapshot.contents).toEqual(defaultContents);
    expect(snapshot.currentContent).toBe(0);
    expect(snapshot.version).toBe(STORAGE_VERSION);
    expect(localStorage.getItem(STORAGE_VERSION_KEY)).toBe(String(STORAGE_VERSION));
  });

  it("uses stored contents when versions match", () => {
    const stored = [{ id: "custom", title: "Custom", content: "# Custom" }];
    localStorage.setItem(STORAGE_CONTENTS_KEY, JSON.stringify(stored));
    localStorage.setItem(STORAGE_CURRENT_KEY, "0");
    localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));

    const snapshot = loadPlaygroundSnapshot();

    expect(snapshot.contents).toEqual(stored);
    expect(snapshot.currentContent).toBe(0);
  });

  it("refreshes default entries and preserves custom entries when version is stale", () => {
    const stored = [
      { id: "0", title: "Old Default", content: "# Old" },
      { id: "custom", title: "Custom", content: "# Custom" },
    ];
    localStorage.setItem(STORAGE_CONTENTS_KEY, JSON.stringify(stored));
    localStorage.setItem(STORAGE_CURRENT_KEY, "1");
    localStorage.setItem(STORAGE_VERSION_KEY, "0");

    const snapshot = loadPlaygroundSnapshot();

    expect(snapshot.contents[0]).toEqual(defaultContents[0]);
    expect(snapshot.contents.some((content) => content.id === "custom")).toBe(true);
    expect(snapshot.currentContent).toBe(0);
  });
});
```

- [ ] **Step 7: Add storage helpers**

Create `apps/vue2-playground/src/state/storage.ts`:

```ts
import { defaultContentIds, defaultContents, STORAGE_VERSION } from "@/data/defaultContents";
import type { Content, PlaygroundStateSnapshot } from "@/types";

export const STORAGE_CONTENTS_KEY = "draftly-vue2-playground-contents";
export const STORAGE_CURRENT_KEY = "draftly-vue2-playground-current";
export const STORAGE_VERSION_KEY = "draftly-vue2-playground-version";

function persistSnapshot(contents: Content[], currentContent: number): void {
  localStorage.setItem(STORAGE_CONTENTS_KEY, JSON.stringify(contents));
  localStorage.setItem(STORAGE_CURRENT_KEY, String(currentContent));
  localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
}

export function loadPlaygroundSnapshot(): PlaygroundStateSnapshot {
  const storedContents = localStorage.getItem(STORAGE_CONTENTS_KEY);
  const storedCurrent = localStorage.getItem(STORAGE_CURRENT_KEY);
  const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
  const versionMatches = storedVersion === String(STORAGE_VERSION);

  if (storedContents && versionMatches) {
    try {
      const contents = JSON.parse(storedContents) as Content[];
      const currentContent = Number.parseInt(storedCurrent || "0", 10);
      return {
        contents,
        currentContent: Number.isNaN(currentContent) ? 0 : currentContent,
        version: STORAGE_VERSION,
      };
    } catch {
      persistSnapshot(defaultContents, 0);
      return { contents: defaultContents, currentContent: 0, version: STORAGE_VERSION };
    }
  }

  if (storedContents && !versionMatches) {
    try {
      const contents = JSON.parse(storedContents) as Content[];
      const userContents = contents.filter((content) => !defaultContentIds.has(content.id));
      const mergedContents = [...defaultContents, ...userContents];
      persistSnapshot(mergedContents, 0);
      return { contents: mergedContents, currentContent: 0, version: STORAGE_VERSION };
    } catch {
      persistSnapshot(defaultContents, 0);
      return { contents: defaultContents, currentContent: 0, version: STORAGE_VERSION };
    }
  }

  persistSnapshot(defaultContents, 0);
  return { contents: defaultContents, currentContent: 0, version: STORAGE_VERSION };
}

export function savePlaygroundSnapshot(contents: Content[], currentContent: number): void {
  persistSnapshot(contents, currentContent);
}
```

- [ ] **Step 8: Add content metric tests**

Create `apps/vue2-playground/tests/unit/contentMetrics.spec.ts`:

```ts
import { getContentMetrics } from "@/utils/contentMetrics";

describe("contentMetrics", () => {
  it("counts words, lines, and characters", () => {
    expect(getContentMetrics("hello world\nsecond line")).toEqual({
      words: 4,
      lines: 2,
      chars: 23,
    });
  });

  it("returns zero counts for empty content", () => {
    expect(getContentMetrics("")).toEqual({
      words: 0,
      lines: 0,
      chars: 0,
    });
  });
});
```

- [ ] **Step 9: Add content metric helper**

Create `apps/vue2-playground/src/utils/contentMetrics.ts`:

```ts
export interface ContentMetrics {
  words: number;
  lines: number;
  chars: number;
}

export function getContentMetrics(content: string): ContentMetrics {
  if (!content) {
    return { words: 0, lines: 0, chars: 0 };
  }

  return {
    words: content.trim().split(/\s+/).filter(Boolean).length,
    lines: content.split("\n").length,
    chars: content.length,
  };
}
```

- [ ] **Step 10: Run unit tests**

Run:

```bash
bun run --cwd apps/vue2-playground test:unit -- --runInBand
```

Expected: all three unit test files pass.

- [ ] **Step 11: Commit pure state helpers**

Run:

```bash
git add apps/vue2-playground/src/types.ts apps/vue2-playground/src/data/md/what-is-draftly.ts apps/vue2-playground/src/data/md/walkthrough.ts apps/vue2-playground/src/data/defaultContents.ts apps/vue2-playground/src/state/storage.ts apps/vue2-playground/src/state/playgroundConfig.ts apps/vue2-playground/src/utils/contentMetrics.ts apps/vue2-playground/tests/unit/storage.spec.ts apps/vue2-playground/tests/unit/playgroundConfig.spec.ts apps/vue2-playground/tests/unit/contentMetrics.spec.ts
git commit -m "feat(playground): add vue2 playground state helpers"
```

Expected: commit succeeds with only Vue2 playground helper and test files.

## Task 3: Build Vue2 Playground Layout Components

**Files:**
- Create: `apps/vue2-playground/src/styles.css`
- Create: `apps/vue2-playground/src/components/playground/Playground.vue`
- Create: `apps/vue2-playground/src/components/playground/Header.vue`
- Create: `apps/vue2-playground/src/components/playground/Sidebar.vue`
- Create: `apps/vue2-playground/src/components/playground/CreateContentDialog.vue`
- Create: `apps/vue2-playground/src/components/playground/Devbar.vue`
- Create: `apps/vue2-playground/src/components/playground/Footer.vue`

- [ ] **Step 1: Add global layout styles**

Create `apps/vue2-playground/src/styles.css` with layout classes for:

- fixed-height app shell;
- header and footer bars;
- left sidebar and right devbar panels;
- central editor area;
- mode buttons, icon-text buttons, form controls, toggles, and empty state;
- responsive overlay panels below `1280px`;
- light and dark theme CSS variables.

Use class names referenced by the Vue components in this task: `.playground-shell`, `.playground-header`, `.playground-main`, `.sidebar-panel`, `.devbar-panel`, `.editor-panel`, `.footer-bar`, `.button`, `.button-active`, `.field`, `.toggle-row`, `.document-list`, `.document-item`, `.document-item-active`, `.empty-state`, `.code-output-grid`, `.node-list`.

- [ ] **Step 2: Add Header component**

Create `apps/vue2-playground/src/components/playground/Header.vue` with props:

```ts
mode: PlaygroundMode;
saveStatus: SaveStatus;
sidebarOpen: boolean;
devbarOpen: boolean;
```

Emit events:

```ts
"toggle-sidebar"
"toggle-devbar"
"change-mode" with PlaygroundMode
```

Render four mode buttons for `live`, `view`, `code`, and `output`, plus sidebar/devbar toggle buttons and save status text.

- [ ] **Step 3: Add Sidebar and CreateContentDialog components**

Create `Sidebar.vue` with props:

```ts
contents: Content[];
currentContent: number;
```

Emit events:

```ts
"select-content" with number
"create-content" with string
"delete-content" with string
"rename-content" with { id: string; title: string }
```

Create `CreateContentDialog.vue` as an inline form with local `title` state. Emit `"create"` with a trimmed title. Clear the field after successful emit.

- [ ] **Step 4: Add Devbar component**

Create `Devbar.vue` with props:

```ts
config: PlaygroundConfig;
showNodes: boolean;
nodes: DraftlyNode[];
outputTime: number | null;
```

Emit events:

```ts
"update-config" with PlaygroundConfig
"update-show-nodes" with boolean
```

Render editor option checkboxes, preview option checkboxes, plugin checkboxes, output timing, and a JSON AST panel when `showNodes` is true.

- [ ] **Step 5: Add Footer component**

Create `Footer.vue` with prop:

```ts
metrics: ContentMetrics;
```

Render words, lines, and characters using compact labels.

- [ ] **Step 6: Add top-level Playground state without CodeMirror**

Create `Playground.vue` that:

- loads initial state with `loadPlaygroundSnapshot()`;
- creates default config with `createDefaultConfig()`;
- supports selecting, creating, deleting, and renaming documents;
- debounces localStorage saves using a `saveTimeout`;
- computes current content and metrics;
- renders Header, Sidebar, a temporary central placeholder, Devbar, and Footer.

The temporary central placeholder text should be `Editor integration pending`.

- [ ] **Step 7: Run lint on layout components**

Run:

```bash
bun run --cwd apps/vue2-playground lint
```

Expected: lint passes for scaffold and layout components. If the CLI prompts to fix issues, rerun with `bun run --cwd apps/vue2-playground lint -- --fix`, inspect the diff, then rerun lint without `--fix`.

- [ ] **Step 8: Commit layout components**

Run:

```bash
git add apps/vue2-playground/src/styles.css apps/vue2-playground/src/components/playground/Playground.vue apps/vue2-playground/src/components/playground/Header.vue apps/vue2-playground/src/components/playground/Sidebar.vue apps/vue2-playground/src/components/playground/CreateContentDialog.vue apps/vue2-playground/src/components/playground/Devbar.vue apps/vue2-playground/src/components/playground/Footer.vue
git commit -m "feat(playground): add vue2 playground layout"
```

Expected: commit succeeds with no generated build output.

## Task 4: Add CodeMirror Editor, Preview, and Output Modes

**Files:**
- Create: `apps/vue2-playground/src/components/playground/EditorPane.vue`
- Modify: `apps/vue2-playground/src/components/playground/Playground.vue`
- Modify: `apps/vue2-playground/src/styles.css`

- [ ] **Step 1: Add EditorPane component contract**

Create `EditorPane.vue` with props:

```ts
content: Content | null;
mode: PlaygroundMode;
config: PlaygroundConfig;
showNodes: boolean;
theme: "light" | "dark";
```

Emit events:

```ts
"change-content" with string
"nodes-change" with DraftlyNode[]
"output-change" with { output: PreviewOutput; outputTime: number | null }
```

- [ ] **Step 2: Implement rich and raw editor modes**

In `EditorPane.vue`, create an `EditorView` in `mounted`. Use `EditorState.create()` with these extensions:

```ts
draftly({
  theme: this.theme === "dark" ? ThemeEnum.DARK : ThemeEnum.LIGHT,
  baseStyles: this.config.editor.baseStyles,
  plugins: getActivePlugins(this.config.plugins),
  markdown: [],
  extensions: [],
  keymap: [],
  disableViewPlugin: this.mode === "code",
  defaultKeybindings: this.config.editor.defaultKeybindings,
  history: this.config.editor.history,
  indentWithTab: this.config.editor.indentWithTab,
  highlightActiveLine: this.config.editor.highlightActiveLine,
  lineWrapping: this.config.editor.lineWrapping,
  onNodesChange: (nodes) => {
    if (this.showNodes) {
      this.$emit("nodes-change", nodes);
    }
  },
})
```

Add a CodeMirror update listener that emits `"change-content"` when the document changes.

- [ ] **Step 3: Implement editor lifecycle**

In `EditorPane.vue`:

- destroy `editorView`, `htmlView`, and `cssView` in `beforeDestroy`;
- rebuild editor instances when `mode`, `theme`, `config`, `showNodes`, or `content.id` changes;
- dispatch document updates when the parent content changes but the active document id is unchanged;
- avoid creating editor instances in `view` mode.

- [ ] **Step 4: Implement preview mode**

When `mode === "view"`, call:

```ts
const html = await preview(markdown, {
  theme: this.theme === "dark" ? ThemeEnum.DARK : ThemeEnum.LIGHT,
  plugins: getActivePlugins(this.config.plugins),
  markdown: [],
  syntaxTheme: this.theme === "dark" ? githubDark : githubLight,
  sanitize: this.config.preview.sanitize,
  wrapperTag: "div",
  wrapperClass: "draftly-preview",
});

const css = generateCSS({
  theme: this.theme === "dark" ? ThemeEnum.DARK : ThemeEnum.LIGHT,
  plugins: getActivePlugins(this.config.plugins),
  wrapperClass: "draftly-preview",
  includeBase: this.config.preview.includeBase,
  syntaxTheme: this.theme === "dark" ? githubDark : githubLight,
});
```

Render the CSS with a `<style>` tag and the HTML with `v-html`.

- [ ] **Step 5: Implement output mode**

When `mode === "output"`, generate the same HTML and CSS as preview mode. Render two read-only CodeMirror instances:

- first pane: generated HTML with `html()` and `EditorView.lineWrapping`;
- second pane: generated CSS with `css()` and `EditorView.lineWrapping`.

Emit `"output-change"` with generated output and elapsed milliseconds from `performance.now()`.

- [ ] **Step 6: Wire EditorPane into Playground**

Replace the temporary placeholder in `Playground.vue` with `EditorPane`. Wire:

- current content prop;
- mode/config/showNodes/theme props;
- content update event to debounced save;
- nodes update event to `nodes`;
- output update event to `output` and `outputTime`.

- [ ] **Step 7: Build Draftly before testing the app**

Run:

```bash
bun run --cwd packages/draftly build
```

Expected: `packages/draftly/dist` is regenerated successfully.

- [ ] **Step 8: Run app build**

Run:

```bash
bun run --cwd apps/vue2-playground build
```

Expected: Vue CLI production build succeeds and writes `apps/vue2-playground/dist`, which remains ignored by git.

- [ ] **Step 9: Commit editor integration**

Run:

```bash
git add apps/vue2-playground/src/components/playground/EditorPane.vue apps/vue2-playground/src/components/playground/Playground.vue apps/vue2-playground/src/styles.css packages/draftly/dist
git commit -m "feat(playground): integrate draftly in vue2 playground"
```

Expected: commit succeeds. If `packages/draftly/dist` is ignored or unchanged, leave it out of the commit.

## Task 5: Complete UX Parity and Responsive Behavior

**Files:**
- Modify: `apps/vue2-playground/src/components/playground/Playground.vue`
- Modify: `apps/vue2-playground/src/components/playground/Header.vue`
- Modify: `apps/vue2-playground/src/components/playground/Sidebar.vue`
- Modify: `apps/vue2-playground/src/components/playground/Devbar.vue`
- Modify: `apps/vue2-playground/src/components/playground/EditorPane.vue`
- Modify: `apps/vue2-playground/src/styles.css`

- [ ] **Step 1: Match initial panel behavior**

In `Playground.vue`, open sidebar and devbar by default only when `window.matchMedia("(min-width: 1280px)").matches` is true.

- [ ] **Step 2: Add mobile backdrop behavior**

In `Playground.vue`, render a backdrop when either side panel is open below desktop width. Clicking the backdrop closes both panels.

- [ ] **Step 3: Add no-content state**

When `contents.length === 0` or `currentContent === -1`, show an empty state in the editor panel with text `No Content Selected` and the create-document form.

- [ ] **Step 4: Verify document actions**

Run the dev server:

```bash
bun run --cwd apps/vue2-playground dev
```

Expected: Vue CLI serves the app at `http://localhost:3001`.

Manual checks:

- create a document named `Scratch`;
- rename it to `Scratch Renamed`;
- delete it;
- select `What is Draftly?`;
- reload the page and confirm the selected document persists.

- [ ] **Step 5: Verify mode parity**

At `http://localhost:3001`, check:

- `live` mode renders Draftly rich editing;
- `code` mode shows raw Markdown editing;
- `view` mode renders generated preview HTML;
- `output` mode shows generated HTML and CSS.

- [ ] **Step 6: Verify Devbar parity**

At `http://localhost:3001`, check:

- toggling a plugin changes editor or preview behavior for content using that plugin;
- editor config toggles update the editor after rebuild;
- preview `sanitize` and `includeBase` toggles affect output;
- enabling AST display shows JSON nodes after editing.

- [ ] **Step 7: Verify responsive behavior**

Use browser widths around `390px`, `768px`, and `1440px`. Check:

- side panels do not overlap incoherently with header/footer;
- mobile backdrop closes panels;
- editor area remains usable;
- buttons and labels do not overflow their containers.

- [ ] **Step 8: Commit UX parity refinements**

Run:

```bash
git add apps/vue2-playground/src/components/playground/Playground.vue apps/vue2-playground/src/components/playground/Header.vue apps/vue2-playground/src/components/playground/Sidebar.vue apps/vue2-playground/src/components/playground/Devbar.vue apps/vue2-playground/src/components/playground/EditorPane.vue apps/vue2-playground/src/styles.css
git commit -m "feat(playground): complete vue2 playground parity"
```

Expected: commit succeeds with only Vue2 playground source changes.

## Task 6: Add README Instructions and Final Verification

**Files:**
- Modify: `README.md`
- Modify: `turbo.json` only if required by observed verification output

- [ ] **Step 1: Add README section**

In `README.md`, add a subsection under local development explaining:

````md
### Vue2 Playground

The repository also includes `apps/vue2-playground`, a Vue 2.6 + Vue CLI 4 + Webpack 4 compatibility playground. It mirrors the main `/playground` capabilities but is implemented independently from the Next.js app.

Build Draftly first:

```bash
bun run --cwd packages/draftly build
```

Then start the Vue2 playground:

```bash
cd apps/vue2-playground
npm run dev
```

The Vue CLI dev server listens on `http://localhost:3001`.

Useful commands:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vue CLI development server. |
| `npm run build` | Build the Vue2 playground. |
| `npm run lint` | Lint the Vue2 playground. |
| `npm run test:unit` | Run Vue2 playground unit tests. |
````

Preserve unrelated existing README edits by applying this section around the current local-development content rather than rewriting the file.

- [ ] **Step 2: Run unit tests**

Run:

```bash
bun run --cwd apps/vue2-playground test:unit -- --runInBand
```

Expected: all unit tests pass.

- [ ] **Step 3: Run Vue2 lint**

Run:

```bash
bun run --cwd apps/vue2-playground lint
```

Expected: lint passes.

- [ ] **Step 4: Run package build**

Run:

```bash
bun run --cwd packages/draftly build
```

Expected: Draftly package build succeeds.

- [ ] **Step 5: Run Vue2 production build**

Run:

```bash
bun run --cwd apps/vue2-playground build
```

Expected: Vue CLI production build succeeds.

- [ ] **Step 6: Run root build if Turbo discovers the new app cleanly**

Run:

```bash
bun run build
```

Expected: Turbo builds the repository. If this fails only because Vue CLI 4 does not support the root build environment, capture the exact failure, keep `apps/vue2-playground build` as the scoped gate, and document the reason in the final delivery.

- [ ] **Step 7: Browser verification**

Run:

```bash
bun run --cwd apps/vue2-playground dev
```

Open `http://localhost:3001` and verify:

- document create/select/rename/delete;
- localStorage persistence after reload;
- `live`, `view`, `code`, and `output` modes;
- plugin toggles;
- editor config toggles;
- preview config toggles;
- AST display;
- output timing;
- mobile and desktop layouts.

- [ ] **Step 8: Check for forbidden lockfiles and generated output**

Run:

```bash
test ! -f apps/vue2-playground/package-lock.json
test ! -f apps/vue2-playground/pnpm-lock.yaml
git status --short
```

Expected: no app-local lockfile exists; `dist` and build outputs are not staged.

- [ ] **Step 9: Commit docs and final verification fixes**

Run:

```bash
git add README.md turbo.json apps/vue2-playground
git commit -m "docs(playground): document vue2 playground workflow"
```

Expected: commit succeeds. If `turbo.json` did not change, omit it from `git add`.

## Self-Review Checklist

- Spec coverage: Tasks cover isolated Vue2 app creation, Vue 2.6 + Vue CLI 4 + Webpack 4 dependencies, package build consumption, full playground parity, separate storage keys, README documentation, and scoped verification.
- Reserved marker scan: After Task 2, search `apps/vue2-playground` for unfinished-work markers and replace any match with finished source before committing.
- Type consistency: `PlaygroundMode`, `PlaygroundConfig`, `Content`, `PreviewOutput`, `PluginConfig`, and `SaveStatus` are defined in `src/types.ts` and reused by components and helpers.
- Rollback: revert the implementation commits, remove `apps/vue2-playground`, remove the README subsection, and remove any Vue2-specific Turbo metadata.
