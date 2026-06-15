# Slash Commands and Attachments Design

## Goal

Add a Notion-like slash command menu to Draftly so users can type `/` at the start of an empty block or line-start query to insert common Markdown structures without memorizing syntax.

The feature also establishes a browser attachment protocol for images, files, video, and audio. The same protocol must power slash media commands, local file selection, clipboard paste, drag-and-drop, and future external insertion APIs.

## Context

The repository contains:

- `packages/draftly`: the framework-agnostic core package built on CodeMirror 6 extensions and Draftly plugins.
- `apps/web`: the React/Next.js playground.
- `apps/vue2-playground`: the Vue 2.6 + Vue CLI 4 + Webpack 4 playground.

Draftly currently renders images, links, tables, lists, quotes, horizontal rules, and other Markdown blocks through plugins. It does not currently provide a slash command layer, a file upload protocol, paste/drop upload handling, or a framework-independent attachment API.

## Constraints

- Implement the editor capability in `packages/draftly`, not inside a specific playground.
- Keep the core package framework-agnostic. Do not depend on React, Vue, Radix, or any playground UI library.
- Do not add OSS, MinIO, or backend SDK dependencies to the core package.
- The core upload protocol calls an integration-provided uploader and never stores or transmits files on its own.
- React and Vue2 playgrounds must both use the same public API.
- Playground upload behavior uses `blob:` URLs only as a local mock uploader.
- Slash menu UI must be compact and Notion-like: dense rows, a fixed icon column, subtle grouping, weak metadata, and light right-side syntax hints.
- The first implementation must remain focused on slash commands and attachments. It must not introduce a full asset manager, upload persistence, or media library.

## Recommended Approach

Use two separate framework-agnostic CodeMirror extensions:

- `slashCommands(config)`: handles trigger detection, search filtering, menu state, keyboard navigation, mouse selection, and command execution.
- `attachments(config)`: handles file selection, paste, drop, upload state, placeholder insertion, success replacement, and failure replacement.

The existing `draftly(config)` entry point composes both extensions through optional configuration.

This keeps command UI and attachment processing reusable across React, Vue2, Vue3, and vanilla CodeMirror integrations while leaving upload transport to the application.

## Public API

`DraftlyConfig` gains optional slash command and attachment sections:

```ts
draftly({
  slashCommands: {
    enabled: true,
    commands: defaultSlashCommands,
  },
  attachments: {
    enabled: true,
    uploader: async (file, context) => ({
      url: "...",
      name: file.name,
      mimeType: file.type,
    }),
    accept: {
      image: ["image/*"],
      video: ["video/*"],
      audio: ["audio/*"],
      file: ["*/*"],
    },
  },
});
```

The exact names may be refined during implementation, but the design contract is:

- integrators pass one uploader function;
- commands and paste/drop/file picker share the same attachment pipeline;
- command definitions are data-driven and overrideable;
- both extensions can be disabled independently.

## Slash Commands

The first version includes two command groups.

### Basic Blocks

- Text: remove the slash query and leave a normal text line.
- Heading 1-6: insert `# ` through `###### `.
- Quote: insert `> `.
- Ordered list: insert `1. `.
- Unordered list: insert `- `.
- Task list: insert `- [ ] `.
- Table: insert a minimal editable Markdown table template.
- Divider: insert `---` and move the cursor to the next line.
- Link: insert `[]()` and place the cursor where continued editing is most useful.

### Media

- File: open file selection, upload, then insert `[filename](url)`.
- Image: open image selection, upload, then insert `![filename](url)`.
- Video: open video selection, upload, then insert `<video src="url" controls></video>`.
- Audio: open audio selection, upload, then insert `<audio src="url" controls></audio>`.

## Trigger Behavior

- The menu opens only on an empty line or line-start `/query`.
- A slash typed in the middle of body text does not open the menu.
- Chinese and English query text both filter commands.
- `ArrowDown` and `ArrowUp` move the active item.
- `Enter` executes the active item.
- `Esc` closes the menu and preserves the typed slash query.
- Mouse click executes a command.
- No-match state shows a compact empty result instead of deleting input.
- Command execution replaces the line-start slash query through the cursor.
- All command insertions must go through CodeMirror transactions so undo/redo works.
- Live and code modes can both enable slash commands. View and output modes do not enable editing interactions.

## Attachment Protocol

The core attachment protocol uses the browser `File` object and an integration-provided uploader.

```ts
type DraftlyAttachmentKind = "image" | "video" | "audio" | "file";

type DraftlyAttachmentUploadSource = "slash" | "paste" | "drop" | "api";

type DraftlyAttachmentUploadContext = {
  kind: DraftlyAttachmentKind;
  source: DraftlyAttachmentUploadSource;
  documentText: string;
  selection: { from: number; to: number };
};

type DraftlyAttachmentUploadResult = {
  url: string;
  name?: string;
  title?: string;
  mimeType?: string;
};

type DraftlyAttachmentUploader = (
  file: File,
  context: DraftlyAttachmentUploadContext
) => Promise<DraftlyAttachmentUploadResult>;
```

The core extension determines the default attachment kind from command intent, MIME type, or extension. The uploader remains responsible for real validation, storage, authorization, and URL generation.

## Attachment Behavior

All attachment entry points use the same pipeline:

- slash media command file selection;
- clipboard paste;
- drag-and-drop;
- future programmatic insertion API.

When an upload starts:

- insert a task-specific placeholder at the current insertion point;
- associate the placeholder with a stable task id;
- start the uploader;
- replace only that placeholder when the upload resolves.

When an upload succeeds:

- image becomes `![name](url "title")` when a title exists, otherwise `![name](url)`;
- video becomes `<video src="url" controls></video>`;
- audio becomes `<audio src="url" controls></audio>`;
- file becomes `[name](url)`.

When an upload fails:

- replace the placeholder with a visible failure marker that includes the file name;
- preserve enough information for a future retry action;
- let users undo or delete the failed marker.

When users delete a placeholder before upload completion:

- the completion callback must not insert a detached result elsewhere.

For multiple pasted or dropped files:

- insert placeholders in input order;
- uploads may run concurrently;
- each result replaces its own placeholder.

## UI Design

The menu should follow the confirmed compact Notion-like direction:

- small floating panel near the cursor;
- white background, rounded corners, light border, soft shadow;
- dense command rows;
- fixed-width icon column;
- command title as the dominant text;
- minimal or no per-row description in the default layout;
- muted right-side syntax hints such as `#`, `##`, `1.`, `[]()`, `img`, `video`;
- group labels for basic blocks and media;
- visible active item highlight;
- subtle scrollbar when content exceeds the menu height;
- bottom close row or compact keyboard hint with `esc`.

Icons should be meaningful for block type. If the core implementation does not introduce an icon library, use text/SVG/CSS primitives that are compact and stable. Playground-specific icon systems must not leak into the core package.

## React Playground Integration

The React playground enables the feature through the `draftly()` config in `apps/web/app/playground/page.tsx`.

It provides a mock uploader that returns `URL.createObjectURL(file)`.

The playground should:

- expose feature toggles in the devbar for slash commands, attachments, and paste/drop uploads if practical;
- release created object URLs on cleanup where feasible;
- show the same compact menu style as the core default UI;
- document that `blob:` URLs are local mock behavior and not production storage.

## Vue2 Playground Integration

The Vue2 playground enables the same feature through `draftly()` config in `apps/vue2-playground/src/components/playground/EditorPane.vue`.

It provides a Vue2-compatible mock uploader that returns `URL.createObjectURL(file)`.

The Vue2 integration must not fork command behavior. If TypeScript 4 or Vue CLI 4 exposes type compatibility issues, fix the core package exports rather than expanding Vue2-only shims unless a shim is unavoidable.

## Documentation

Update Draftly documentation and walkthrough content to explain:

- slash command trigger behavior;
- default command list;
- attachment uploader protocol;
- paste/drop/file picker behavior;
- media insertion formats;
- playground mock uploader limitations;
- production integration guidance for backend, OSS, or MinIO upload implementations.

## Verification

Implementation is complete only when the following are verified.

Core checks:

- slash trigger opens on empty line and line-start `/query`;
- slash trigger does not open in the middle of body text;
- Chinese and English search terms filter commands;
- keyboard navigation and selection work;
- basic block commands insert expected Markdown;
- media commands enter the attachment flow;
- successful upload replaces the correct placeholder;
- failed upload leaves a visible failure marker;
- deleted placeholders are not resurrected by async upload completion;
- multi-file paste/drop preserves insertion order and task-specific replacement.

Repository checks:

- `packages/draftly` lint/typecheck/build as applicable;
- React playground lint/build;
- Vue2 playground lint/unit/build;
- browser verification for React playground;
- browser verification for Vue2 playground.

## Risks

- Upload state is asynchronous and can race with user edits. Stable task ids and placeholder lookup are required.
- HTML video/audio output must be validated against the existing preview sanitization behavior.
- Core DOM UI must stay framework-agnostic without becoming hard to theme.
- Vue2 + Vue CLI 4 may expose type or transpilation issues with new package exports.
- `blob:` URLs in playgrounds are non-persistent and must be documented as mock behavior.

## Rollback

Rollback consists of:

- removing the new slash command and attachment core modules;
- removing their exports and `DraftlyConfig` fields;
- removing React and Vue2 playground configuration for these features;
- removing documentation and walkthrough sections added for slash commands and attachments.
