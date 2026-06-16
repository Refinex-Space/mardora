# React 接入指南

本文面向 React 项目，目标是接入一个与 Markora React playground 同等质量的编辑器：支持富 Markdown 编辑、源码模式、预览模式、HTML/CSS 输出、插件开关、slash commands、附件上传、选区工具栏、主题切换、本地持久化和节点调试。

React playground 使用 `@uiw/react-codemirror` 封装 CodeMirror 生命周期。你也可以手动创建 `EditorView`，但大多数 React 项目使用 `@uiw/react-codemirror` 会更直接。

## 1. React 接入结论

| 项目     | 建议                                                                      |
| -------- | ------------------------------------------------------------------------- |
| 接入方式 | 使用 `@uiw/react-codemirror` 渲染编辑器。                                 |
| 状态同步 | React state 保存 Markdown 原文，`onChange` 更新当前文档。                 |
| 扩展管理 | 用 `useMemo` 生成 Markora extensions，避免每次输入重建。                  |
| 预览     | 用 `useEffect` 在 view/output 模式下调用 `preview()` 和 `generateCSS()`。 |
| 附件上传 | 用 `useCallback` 提供稳定 uploader。                                      |
| 资源清理 | 在 `useEffect` cleanup 中释放 `blob:` URL。                               |

## 2. 安装依赖

```shell
npm install markora
npm install @codemirror/commands @codemirror/lang-markdown @codemirror/language @codemirror/language-data @codemirror/state @codemirror/view
npm install @uiw/react-codemirror @uiw/codemirror-theme-github @codemirror/lang-html @codemirror/lang-css
```

Next.js App Router 中，编辑器组件必须是 client component：

```tsx
"use client";
```

## 3. 类型与默认配置

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror, { EditorView, Extension, ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markora, MarkoraNode, MarkoraPlugin, ThemeEnum } from "markora/editor";
import { allPlugins } from "markora/plugins";
import { generateCSS, preview } from "markora/preview";

type Content = {
  id: string;
  title: string;
  content: string;
};

type Mode = "live" | "view" | "code" | "output";
type PluginConfig = Record<string, boolean>;

type PlaygroundConfig = {
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
  features: {
    slashCommands: boolean;
    attachments: boolean;
    pasteDropUploads: boolean;
    selectionToolbar: boolean;
    tableOfContents: boolean;
  };
  plugins: PluginConfig;
};

const defaultPluginConfig: PluginConfig = Object.fromEntries(
  allPlugins.map((plugin) => [plugin.name.toLowerCase(), true])
);

const defaultConfig: PlaygroundConfig = {
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
  features: {
    slashCommands: true,
    attachments: true,
    pasteDropUploads: true,
    selectionToolbar: true,
    tableOfContents: true,
  },
  plugins: defaultPluginConfig,
};
```

## 4. 默认文档和持久化

```tsx
const STORAGE_KEY = "markora-playground-contents";
const STORAGE_CURRENT_KEY = "markora-playground-current";
const STORAGE_VERSION_KEY = "markora-playground-version";
const STORAGE_VERSION = 2;

const DEFAULT_CONTENTS: Content[] = [
  { id: "project-introduction", title: "项目介绍", content: projectIntroduction },
  { id: "vue2-guide", title: "Ve2 接入指南", content: vue2Guide },
  { id: "vue3-guide", title: "Vue3 接入指南", content: vue3Guide },
  { id: "react-guide", title: "React 接入指南", content: reactGuide },
];

const DEFAULT_CONTENT_IDS = new Set(DEFAULT_CONTENTS.map((content) => content.id));
```

| 字段                  | 作用               | 建议                                         |
| --------------------- | ------------------ | -------------------------------------------- |
| `STORAGE_VERSION`     | 默认文档版本。     | 默认文档标题或内容变化时递增。               |
| `DEFAULT_CONTENT_IDS` | 识别系统默认文档。 | 版本升级时替换默认文档，保留用户文档。       |
| `content`             | Markdown 原文。    | 生产系统保存它，不保存 EditorView 内部状态。 |

## 5. 主组件状态

```tsx
export function MarkoraReactEditor() {
  const [contents, setContents] = useState<Content[]>(DEFAULT_CONTENTS);
  const [currentContent, setCurrentContent] = useState(0);
  const [mode, setMode] = useState<Mode>("live");
  const [config, setConfig] = useState<PlaygroundConfig>(defaultConfig);
  const [nodes, setNodes] = useState<MarkoraNode[]>([]);
  const [output, setOutput] = useState<{ html: string; css: string } | null>(null);

  const editor = useRef<ReactCodeMirrorRef>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const theme = "light";
  const cmTheme = theme === "dark" ? githubDark : githubLight;
  const markoraTheme = theme === "dark" ? ThemeEnum.DARK : ThemeEnum.LIGHT;

  const activePlugins = useMemo<MarkoraPlugin[]>(() => {
    return allPlugins.filter((plugin) => {
      const name = plugin.name.toLowerCase();
      return config.plugins[name] ?? true;
    });
  }, [config.plugins]);
}
```

## 6. 附件上传

```tsx
const uploader = useCallback(async (file: File) => {
  // Demo 可以用 blob URL；生产环境必须改成真实上传接口。
  const url = URL.createObjectURL(file);
  objectUrlsRef.current.push(url);

  return {
    url,
    name: file.name,
    mimeType: file.type,
  };
}, []);

useEffect(() => {
  return () => {
    // 释放 demo 上传产生的 blob URL。
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    objectUrlsRef.current = [];
  };
}, []);
```

### 6.1 附件上传 API 表

| 属性                      | 默认值           | 说明                                                                            |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `attachments.enabled`     | `false`          | 是否启用附件能力。                                                              |
| `attachments.uploader`    | `undefined`      | 实际上传函数；未提供时 paste/drop 扩展不会注册，slash media 命令使用 fallback。 |
| `attachments.enablePaste` | `true`           | 是否处理剪贴板文件。                                                            |
| `attachments.enableDrop`  | `true`           | 是否处理拖拽文件。                                                              |
| `attachments.accept`      | 类型侧默认 `*/*` | 按 `image/video/audio/file` 限制 MIME 或后缀。                                  |

### 6.2 Markora 提供了什么

| 阶段     | Markora 行为                                               |
| -------- | ---------------------------------------------------------- |
| 文件来源 | 支持 slash 文件选择、粘贴、拖拽。                          |
| 上传前   | 插入 `markora-upload://task-id` 临时标记。                 |
| 上传中   | 调用 `uploader(file, context)`。                           |
| 上传成功 | 按附件类型替换为 Markdown 图片、音视频 HTML 或文件链接。   |
| 上传失败 | 替换为 `[Upload failed: name](markora-upload://task-id)`。 |

Markora 不提供对象存储、鉴权、文件扫描、断点续传、进度条或删除接口。需要这些能力时，业务侧应在 uploader 和自己的 UI 中实现。

## 7. 生成 Markora extensions

```tsx
const extensions = useMemo<Extension[]>(
  () =>
    markora({
      theme: markoraTheme,
      baseStyles: config.editor.baseStyles,
      plugins: activePlugins,
      disableViewPlugin: mode === "code",
      defaultKeybindings: config.editor.defaultKeybindings,
      history: config.editor.history,
      indentWithTab: config.editor.indentWithTab,
      highlightActiveLine: config.editor.highlightActiveLine,
      lineWrapping: config.editor.lineWrapping,
      slashCommands: {
        enabled: config.features.slashCommands,
      },
      selectionToolbar: {
        enabled: config.features.selectionToolbar,
      },
      toc: {
        enabled: mode === "live" && config.features.tableOfContents,
        storageKey: "markora-react:toc",
      },
      attachments: {
        enabled: config.features.attachments,
        uploader: config.features.attachments ? uploader : undefined,
        enablePaste: config.features.pasteDropUploads,
        enableDrop: config.features.pasteDropUploads,
        accept: {
          image: ["image/*"],
          video: ["video/*"],
          audio: ["audio/*"],
          file: ["*/*"],
        },
      },
      onNodesChange: (nextNodes) => {
        setNodes(nextNodes);
      },
    }),
  [activePlugins, config.editor, config.features, markoraTheme, mode, uploader]
);
```

不要把当前 Markdown 文本放入这个 `useMemo` 依赖。正文变化应通过 `CodeMirror value/onChange` 同步，否则每次输入都会重建扩展。

## 8. 渲染编辑、预览和输出

```tsx
const current = contents[currentContent];

return (
  <main className="markora-react-shell">
    {mode === "view" && output ? (
      <article className="markora-preview-host">
        <style>{output.css}</style>
        <div dangerouslySetInnerHTML={{ __html: output.html }} />
      </article>
    ) : mode === "output" && output ? (
      <div className="markora-output-grid">
        <CodeMirror
          value={output.html}
          theme={cmTheme}
          extensions={[html(), EditorView.lineWrapping, EditorView.editable.of(false)]}
          editable={false}
        />
        <CodeMirror
          value={output.css}
          theme={cmTheme}
          extensions={[css(), EditorView.lineWrapping, EditorView.editable.of(false)]}
          editable={false}
        />
      </div>
    ) : (
      <CodeMirror
        ref={editor}
        value={current.content}
        theme={cmTheme}
        extensions={extensions}
        basicSetup={false}
        onChange={(value) => {
          setContents((items) =>
            items.map((item, index) => (index === currentContent ? { ...item, content: value } : item))
          );
        }}
      />
    )}
  </main>
);
```

`basicSetup={false}` 用于避免 `@uiw/react-codemirror` 默认扩展与 Markora 组装的扩展重复。

## 9. 生成预览输出

```tsx
useEffect(() => {
  if (!["view", "output"].includes(mode)) return;

  let cancelled = false;

  (async () => {
    const markdown = contents[currentContent]?.content || "";

    const htmlOutput = await preview(markdown, {
      theme: markoraTheme,
      plugins: activePlugins,
      markdown: [],
      syntaxTheme: cmTheme,
      sanitize: config.preview.sanitize,
      wrapperTag: "div",
      wrapperClass: "markora-preview",
    });

    const cssOutput = generateCSS({
      theme: markoraTheme,
      plugins: activePlugins,
      wrapperClass: "markora-preview",
      includeBase: config.preview.includeBase,
      syntaxTheme: cmTheme,
    });

    if (!cancelled) {
      setOutput({ html: htmlOutput, css: cssOutput });
    }
  })();

  return () => {
    cancelled = true;
  };
}, [activePlugins, cmTheme, config.preview, contents, currentContent, markoraTheme, mode]);
```

| API                       | 默认值              | React 建议                        |
| ------------------------- | ------------------- | --------------------------------- |
| `preview.plugins`         | `[]`                | 使用 `activePlugins`。            |
| `preview.sanitize`        | `true`              | 用户内容保持开启。                |
| `preview.wrapperClass`    | `"markora-preview"` | 和 CSS 生成保持一致。             |
| `generateCSS.includeBase` | `true`              | 需要完全自定义 spacing 时再关闭。 |
| `generateCSS.syntaxTheme` | `undefined`         | 使用当前 CodeMirror theme。       |

## 10. Markora 配置速查

| 配置                       | 默认值           | React 建议                                |
| -------------------------- | ---------------- | ----------------------------------------- |
| `theme`                    | `ThemeEnum.AUTO` | 从主题状态映射为 `ThemeEnum.LIGHT/DARK`。 |
| `baseStyles`               | `true`           | 初次接入保持开启。                        |
| `plugins`                  | `[]`             | 传 `activePlugins`。                      |
| `disableViewPlugin`        | `false`          | `mode === "code"` 时设为 `true`。         |
| `defaultKeybindings`       | `true`           | 保持开启。                                |
| `history`                  | `true`           | 保持开启。                                |
| `indentWithTab`            | `true`           | 保持开启。                                |
| `highlightActiveLine`      | `true`           | 源码模式有效。                            |
| `lineWrapping`             | `true`           | 保持开启。                                |
| `slashCommands.enabled`    | `true`           | feature toggle 控制。                     |
| `selectionToolbar.enabled` | `true`           | feature toggle 控制。                     |
| `toc.enabled`              | `true`           | live 模式开启。                           |
| `attachments.enabled`      | `false`          | 有 uploader 后开启。                      |

## 11. 插件体系

React 接入不改变插件模型。自定义插件继承 `MarkoraPlugin`：

```tsx
import type { DecorationContext } from "markora/editor";
import { MarkoraPlugin } from "markora/editor";

class MentionPlugin extends MarkoraPlugin {
  readonly name = "mention";
  readonly version = "1.0.0";

  buildDecorations(ctx: DecorationContext): void {
    // 在这里扫描 ctx.view.state.doc。
    // 需要装饰时向 ctx.decorations 追加 Decoration.range(...)。
  }
}
```

| 插件方法              | 用途                     |
| --------------------- | ------------------------ |
| `getExtensions()`     | 添加 CodeMirror 扩展。   |
| `getMarkdownConfig()` | 添加 Markdown 解析扩展。 |
| `getKeymap()`         | 添加快捷键。             |
| `buildDecorations()`  | 编辑态 decoration。      |
| `renderToHTML()`      | preview HTML。           |
| `getPreviewStyles()`  | preview CSS。            |

## 12. 生产验收清单

- `extensions` 不随每次输入重建。
- `basicSetup={false}`，避免扩展重复。
- 编辑、源码、预览、输出模式都能切换。
- 附件上传成功、失败、超限和权限错误都有用户可见反馈。
- slash media 命令和 paste/drop 复用同一个 uploader。
- `preview()` 与 `generateCSS()` 使用同一组插件、主题和 syntax theme。
- `blob:` URL 在组件卸载时释放。
- 用户 Markdown 原文已保存到业务存储。
