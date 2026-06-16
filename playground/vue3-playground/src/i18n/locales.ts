// Shell UI locale model + message dictionary for the Vue 3 playground.
// Independent of the Markora editor's own i18n (config.locale).
// Covers only the playground shell: Header, Sidebar, Devbar, Footer, dialogs.

export type ShellLocale = "zh" | "en";

export const SHELL_LOCALE_OPTIONS: { value: ShellLocale; label: string }[] = [
  { value: "zh", label: "中文" },
  { value: "en", label: "English" },
];

export const DEFAULT_SHELL_LOCALE: ShellLocale = "zh";

export const SHELL_LOCALE_STORAGE_KEY = "markora-vue3-playground-locale";

export type MessageKey =
  | "header.selectMode"
  | "header.selectTheme"
  | "header.selectLanguage"
  | "header.saving"
  | "header.saved"
  | "header.hideDevbar"
  | "header.showDevbar"
  | "mode.live"
  | "mode.view"
  | "mode.code"
  | "mode.output"
  | "theme.system"
  | "theme.light"
  | "theme.dark"
  | "sidebar.contents"
  | "sidebar.noContents"
  | "sidebar.createContent"
  | "sidebar.rename"
  | "sidebar.delete"
  | "sidebar.renamePrompt"
  | "dialog.create.title"
  | "dialog.create.description"
  | "dialog.create.placeholder"
  | "dialog.create.cancel"
  | "dialog.create.confirm"
  | "devbar.title"
  | "devbar.outputTime"
  | "devbar.editorOptions"
  | "devbar.previewOptions"
  | "devbar.featureOptions"
  | "devbar.plugins"
  | "devbar.nodes"
  | "devbar.nodesHint"
  | "devbar.contentWidth"
  | "devbar.contentWidthDesc"
  | "devbar.contentWidthRegular"
  | "devbar.contentWidthWide"
  | "devbar.language"
  | "devbar.languageDesc"
  | "opt.baseStyles.label"
  | "opt.baseStyles.desc"
  | "opt.defaultKeybindings.label"
  | "opt.defaultKeybindings.desc"
  | "opt.history.label"
  | "opt.history.desc"
  | "opt.indentWithTab.label"
  | "opt.indentWithTab.desc"
  | "opt.highlightActiveLine.label"
  | "opt.highlightActiveLine.desc"
  | "opt.lineWrapping.label"
  | "opt.lineWrapping.desc"
  | "opt.includeBase.label"
  | "opt.includeBase.desc"
  | "opt.sanitize.label"
  | "opt.sanitize.desc"
  | "opt.slashCommands.label"
  | "opt.slashCommands.desc"
  | "opt.attachments.label"
  | "opt.attachments.desc"
  | "opt.pasteDropUploads.label"
  | "opt.pasteDropUploads.desc"
  | "opt.tableOfContents.label"
  | "opt.tableOfContents.desc"
  | "opt.plugin.desc"
  | "footer.words"
  | "footer.lines"
  | "footer.chars"
  | "empty.noContentSelected"
  | "empty.create"
  | "common.loading";

type Dict = Record<MessageKey, string>;

const zh: Dict = {
  "header.selectMode": "选择模式",
  "header.selectTheme": "选择主题",
  "header.selectLanguage": "选择语言",
  "header.saving": "保存中…",
  "header.saved": "已保存",
  "header.hideDevbar": "隐藏开发面板",
  "header.showDevbar": "显示开发面板",

  "mode.live": "实时",
  "mode.view": "预览",
  "mode.code": "源码",
  "mode.output": "输出",

  "theme.system": "跟随系统",
  "theme.light": "浅色",
  "theme.dark": "深色",

  "sidebar.contents": "文档列表",
  "sidebar.noContents": "暂无文档",
  "sidebar.createContent": "新建文档",
  "sidebar.rename": "重命名",
  "sidebar.delete": "删除",
  "sidebar.renamePrompt": "重命名文档",

  "dialog.create.title": "新建文档",
  "dialog.create.description": "请输入新文档的标题。",
  "dialog.create.placeholder": "文档标题",
  "dialog.create.cancel": "取消",
  "dialog.create.confirm": "创建",

  "devbar.title": "开发面板",
  "devbar.outputTime": "输出生成耗时 {ms}ms",
  "devbar.editorOptions": "编辑器选项",
  "devbar.previewOptions": "预览选项",
  "devbar.featureOptions": "功能选项",
  "devbar.plugins": "插件",
  "devbar.nodes": "节点",
  "devbar.nodesHint": "（隐藏以提升性能）",
  "devbar.contentWidth": "内容宽度",
  "devbar.contentWidthDesc": "调整实时与预览的内容宽度",
  "devbar.contentWidthRegular": "常规",
  "devbar.contentWidthWide": "宽屏",
  "devbar.language": "语言",
  "devbar.languageDesc": "调整 Markora 编辑器内置 UI 文案",

  "opt.baseStyles.label": "基础样式",
  "opt.baseStyles.desc": "包含默认编辑器样式",
  "opt.defaultKeybindings.label": "默认快捷键",
  "opt.defaultKeybindings.desc": "启用标准键盘快捷键",
  "opt.history.label": "历史记录",
  "opt.history.desc": "启用撤销 / 重做",
  "opt.indentWithTab.label": "Tab 缩进",
  "opt.indentWithTab.desc": "使用 Tab 键缩进",
  "opt.highlightActiveLine.label": "高亮当前行",
  "opt.highlightActiveLine.desc": "高亮显示当前行",
  "opt.lineWrapping.label": "自动换行",
  "opt.lineWrapping.desc": "长行自动折行",
  "opt.includeBase.label": "基础 CSS",
  "opt.includeBase.desc": "包含基础预览样式",
  "opt.sanitize.label": "净化 HTML",
  "opt.sanitize.desc": "净化 HTML 输出以提升安全性",
  "opt.slashCommands.label": "斜杠命令",
  "opt.slashCommands.desc": "行首输入斜杠打开命令菜单",
  "opt.attachments.label": "附件",
  "opt.attachments.desc": "通过媒体命令选择本地文件",
  "opt.pasteDropUploads.label": "粘贴 / 拖拽上传",
  "opt.pasteDropUploads.desc": "使用 mock uploader 上传粘贴或拖拽的文件",
  "opt.tableOfContents.label": "目录",
  "opt.tableOfContents.desc": "显示右侧内置文档大纲",
  "opt.plugin.desc": "启用 {name} 插件",

  "footer.words": "词数",
  "footer.lines": "行数",
  "footer.chars": "字符",

  "empty.noContentSelected": "未选择文档",
  "empty.create": "新建",
  "common.loading": "加载中…",
};

const en: Dict = {
  "header.selectMode": "Select Mode",
  "header.selectTheme": "Select Theme",
  "header.selectLanguage": "Select Language",
  "header.saving": "Saving…",
  "header.saved": "Saved",
  "header.hideDevbar": "Hide Devbar",
  "header.showDevbar": "Show Devbar",

  "mode.live": "Live",
  "mode.view": "View",
  "mode.code": "Code",
  "mode.output": "Output",

  "theme.system": "System",
  "theme.light": "Light",
  "theme.dark": "Dark",

  "sidebar.contents": "Contents",
  "sidebar.noContents": "No contents yet",
  "sidebar.createContent": "Create Content",
  "sidebar.rename": "Rename",
  "sidebar.delete": "Delete",
  "sidebar.renamePrompt": "Rename document",

  "dialog.create.title": "Create Content",
  "dialog.create.description": "Enter a title for the new document.",
  "dialog.create.placeholder": "Content title",
  "dialog.create.cancel": "Cancel",
  "dialog.create.confirm": "Create",

  "devbar.title": "Developer Panel",
  "devbar.outputTime": "Output generated in {ms}ms",
  "devbar.editorOptions": "Editor Options",
  "devbar.previewOptions": "Preview Options",
  "devbar.featureOptions": "Feature Options",
  "devbar.plugins": "Plugins",
  "devbar.nodes": "Nodes",
  "devbar.nodesHint": "(Hide for performance)",
  "devbar.contentWidth": "Content Width",
  "devbar.contentWidthDesc": "Adjust Live and View content width",
  "devbar.contentWidthRegular": "Regular",
  "devbar.contentWidthWide": "Wide",
  "devbar.language": "Language",
  "devbar.languageDesc": "Adjust Markora-owned editor UI text",

  "opt.baseStyles.label": "Base Styles",
  "opt.baseStyles.desc": "Include default editor styles",
  "opt.defaultKeybindings.label": "Default Keybindings",
  "opt.defaultKeybindings.desc": "Enable standard keyboard shortcuts",
  "opt.history.label": "History",
  "opt.history.desc": "Enable undo/redo support",
  "opt.indentWithTab.label": "Indent with Tab",
  "opt.indentWithTab.desc": "Use Tab key for indentation",
  "opt.highlightActiveLine.label": "Highlight Active Line",
  "opt.highlightActiveLine.desc": "Highlight the current line",
  "opt.lineWrapping.label": "Line Wrapping",
  "opt.lineWrapping.desc": "Wrap long lines",
  "opt.includeBase.label": "Include Base CSS",
  "opt.includeBase.desc": "Include base preview styles",
  "opt.sanitize.label": "Sanitize HTML",
  "opt.sanitize.desc": "Sanitize HTML output for security",
  "opt.slashCommands.label": "Slash Commands",
  "opt.slashCommands.desc": "Open the command menu with line-start slash input",
  "opt.attachments.label": "Attachments",
  "opt.attachments.desc": "Enable local file selection through media commands",
  "opt.pasteDropUploads.label": "Paste/Drop Uploads",
  "opt.pasteDropUploads.desc": "Upload pasted or dropped files with the mock uploader",
  "opt.tableOfContents.label": "Table of Contents",
  "opt.tableOfContents.desc": "Show the built-in right-side document outline",
  "opt.plugin.desc": "Enable {name} plugin",

  "footer.words": "Words",
  "footer.lines": "Lines",
  "footer.chars": "Char",

  "empty.noContentSelected": "No Content Selected",
  "empty.create": "Create New",
  "common.loading": "Loading…",
};

export const messages: Record<ShellLocale, Dict> = { zh, en };

export function translate(
  locale: ShellLocale,
  key: MessageKey,
  vars?: Record<string, string | number>
): string {
  const template = messages[locale][key] ?? messages[DEFAULT_SHELL_LOCALE][key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}
