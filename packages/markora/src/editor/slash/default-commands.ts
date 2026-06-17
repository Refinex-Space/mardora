import type { MarkoraSlashCommand } from "./types";
import { buildSlashReplacement } from "./insertions";
import type { MarkoraAttachmentKind } from "../attachments";
import type { MarkoraLocale } from "../i18n";

type LocalizedSlashCommandCopy = {
  title: string;
  aliases: string[];
};

const commandCopy: Record<MarkoraLocale, Record<string, LocalizedSlashCommandCopy>> = {
  "zh-CN": {
    paragraph: { title: "文本", aliases: ["text", "plain", "wenben"] },
    "heading-1": { title: "标题 1", aliases: ["h1", "heading", "heading1", "biaoti", "标题"] },
    "heading-2": { title: "标题 2", aliases: ["h2", "heading", "heading2", "biaoti", "标题"] },
    "heading-3": { title: "标题 3", aliases: ["h3", "heading", "heading3", "biaoti", "标题"] },
    "heading-4": { title: "标题 4", aliases: ["h4", "heading", "heading4", "biaoti", "标题"] },
    "heading-5": { title: "标题 5", aliases: ["h5", "heading", "heading5", "biaoti", "标题"] },
    "heading-6": { title: "标题 6", aliases: ["h6", "heading", "heading6", "biaoti", "标题"] },
    quote: { title: "引用", aliases: ["quote", "blockquote", "yinyong"] },
    "ordered-list": { title: "有序列表", aliases: ["ol", "ordered", "numbered", "youxu", "有序"] },
    "unordered-list": { title: "项目符号列表", aliases: ["ul", "bullet", "unordered", "bulleted", "wuxu", "无序"] },
    "task-list": { title: "待办清单", aliases: ["todo", "task", "check", "daiban", "待办"] },
    table: { title: "表格", aliases: ["table", "biaoge"] },
    divider: { title: "分隔线", aliases: ["hr", "divider", "line", "fengexian", "分隔"] },
    link: { title: "链接", aliases: ["link", "url", "lianjie"] },
    file: { title: "文件", aliases: ["file", "wenjian"] },
    image: { title: "图片", aliases: ["image", "img", "tu", "tupian", "图片"] },
    video: { title: "视频", aliases: ["video", "shipin"] },
    audio: { title: "音频", aliases: ["audio", "music", "yinpin"] },
  },
  "en-US": {
    paragraph: { title: "Text", aliases: ["文本", "text", "plain", "wenben"] },
    "heading-1": { title: "Heading 1", aliases: ["标题", "h1", "heading", "heading1", "biaoti"] },
    "heading-2": { title: "Heading 2", aliases: ["标题", "h2", "heading", "heading2", "biaoti"] },
    "heading-3": { title: "Heading 3", aliases: ["标题", "h3", "heading", "heading3", "biaoti"] },
    "heading-4": { title: "Heading 4", aliases: ["标题", "h4", "heading", "heading4", "biaoti"] },
    "heading-5": { title: "Heading 5", aliases: ["标题", "h5", "heading", "heading5", "biaoti"] },
    "heading-6": { title: "Heading 6", aliases: ["标题", "h6", "heading", "heading6", "biaoti"] },
    quote: { title: "Quote", aliases: ["引用", "quote", "blockquote", "yinyong"] },
    "ordered-list": { title: "Numbered list", aliases: ["有序", "ol", "ordered", "numbered", "youxu"] },
    "unordered-list": { title: "Bulleted list", aliases: ["无序", "ul", "bullet", "unordered", "bulleted", "wuxu"] },
    "task-list": { title: "To-do list", aliases: ["待办", "todo", "task", "check", "daiban"] },
    table: { title: "Table", aliases: ["表格", "table", "biaoge"] },
    divider: { title: "Divider", aliases: ["分隔", "hr", "divider", "line", "fengexian"] },
    link: { title: "Link", aliases: ["链接", "link", "url", "lianjie"] },
    file: { title: "File", aliases: ["文件", "file", "wenjian"] },
    image: { title: "Image", aliases: ["图片", "image", "img", "tu", "tupian"] },
    video: { title: "Video", aliases: ["视频", "video", "shipin"] },
    audio: { title: "Audio", aliases: ["音频", "audio", "music", "yinpin"] },
  },
};

function commandMeta(
  locale: MarkoraLocale,
  id: string,
  group: MarkoraSlashCommand["group"],
  icon: string,
  hint: string
): Omit<MarkoraSlashCommand, "run"> {
  const copy = commandCopy[locale][id];
  if (!copy) {
    throw new Error(`Missing slash command copy: ${locale}:${id}`);
  }

  return {
    id,
    group,
    title: copy.title,
    aliases: copy.aliases,
    icon,
    hint,
  };
}

function markdownCommand(
  command: Omit<MarkoraSlashCommand, "run">,
  marker: string,
  cursorOffset: number = marker.length
): MarkoraSlashCommand {
  return {
    ...command,
    run: ({ view, queryRange }) => {
      const replacement = buildSlashReplacement({ marker, cursorOffset }, { ...queryRange, query: "" });
      view.dispatch({
        changes: replacement.changes,
        selection: { anchor: replacement.selectionAnchor },
        scrollIntoView: true,
      });
      view.focus();
      return true;
    },
  };
}

function mediaCommand(command: Omit<MarkoraSlashCommand, "run">, kind: MarkoraAttachmentKind): MarkoraSlashCommand {
  return {
    ...command,
    run: (context) => {
      if (context.requestAttachment?.(kind, context)) {
        return true;
      }

      const fallbackByKind: Record<MarkoraAttachmentKind, string> = {
        image: "![image](url)",
        video: '<video src="url" controls></video>',
        audio: '<audio src="url" controls></audio>',
        file: "[filename](url)",
      };
      const fallback = fallbackByKind[kind];
      const replacement = buildSlashReplacement(
        { marker: fallback, cursorOffset: kind === "file" ? 1 : fallback.indexOf("url") },
        { ...context.queryRange, query: "" }
      );

      context.view.dispatch({
        changes: replacement.changes,
        selection: { anchor: replacement.selectionAnchor },
        scrollIntoView: true,
      });
      context.view.focus();
      return true;
    },
  };
}

export function getDefaultSlashCommands(locale: MarkoraLocale = "zh-CN"): MarkoraSlashCommand[] {
  return [
    markdownCommand(commandMeta(locale, "paragraph", "basic", "type", ""), "", 0),
    markdownCommand(commandMeta(locale, "heading-1", "basic", "heading-1", "#"), "# "),
    markdownCommand(commandMeta(locale, "heading-2", "basic", "heading-2", "##"), "## "),
    markdownCommand(commandMeta(locale, "heading-3", "basic", "heading-3", "###"), "### "),
    markdownCommand(commandMeta(locale, "heading-4", "basic", "heading-4", "####"), "#### "),
    markdownCommand(commandMeta(locale, "heading-5", "basic", "heading-5", "#####"), "##### "),
    markdownCommand(commandMeta(locale, "heading-6", "basic", "heading-6", "######"), "###### "),
    markdownCommand(commandMeta(locale, "quote", "basic", "text-quote", ">"), "> "),
    markdownCommand(commandMeta(locale, "ordered-list", "basic", "list-ordered", "1."), "1. "),
    markdownCommand(commandMeta(locale, "unordered-list", "basic", "list", "-"), "- "),
    markdownCommand(commandMeta(locale, "task-list", "basic", "list-todo", "[]"), "- [ ] "),
    markdownCommand(
      commandMeta(locale, "table", "basic", "table", "| |"),
      "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n",
      2
    ),
    markdownCommand(commandMeta(locale, "divider", "basic", "minus", "---"), "---\n"),
    markdownCommand(commandMeta(locale, "link", "basic", "link", "[]()"), "[]()", 1),
    mediaCommand(commandMeta(locale, "file", "media", "file", "file"), "file"),
    mediaCommand(commandMeta(locale, "image", "media", "image", "img"), "image"),
    mediaCommand(commandMeta(locale, "video", "media", "play", "video"), "video"),
    mediaCommand(commandMeta(locale, "audio", "media", "music-2", "audio"), "audio"),
  ];
}

export const defaultSlashCommands: MarkoraSlashCommand[] = getDefaultSlashCommands("zh-CN");
