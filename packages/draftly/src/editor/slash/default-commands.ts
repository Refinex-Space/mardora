import type { DraftlySlashCommand } from "./types";
import { buildSlashReplacement } from "./insertions";
import type { DraftlyAttachmentKind } from "../attachments";

function markdownCommand(
  command: Omit<DraftlySlashCommand, "run">,
  marker: string,
  cursorOffset: number = marker.length
): DraftlySlashCommand {
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

function mediaCommand(command: Omit<DraftlySlashCommand, "run">, kind: DraftlyAttachmentKind): DraftlySlashCommand {
  return {
    ...command,
    run: (context) => {
      if (context.requestAttachment?.(kind, context)) {
        return true;
      }

      const fallbackByKind: Record<DraftlyAttachmentKind, string> = {
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

export const defaultSlashCommands: DraftlySlashCommand[] = [
  markdownCommand({ id: "paragraph", group: "basic", title: "文本", aliases: ["text", "plain"], icon: "type", hint: "" }, "", 0),
  markdownCommand({ id: "heading-1", group: "basic", title: "标题 1", aliases: ["h1", "heading1"], icon: "heading-1", hint: "#" }, "# "),
  markdownCommand({ id: "heading-2", group: "basic", title: "标题 2", aliases: ["h2", "heading2"], icon: "heading-2", hint: "##" }, "## "),
  markdownCommand({ id: "heading-3", group: "basic", title: "标题 3", aliases: ["h3", "heading3"], icon: "heading-3", hint: "###" }, "### "),
  markdownCommand({ id: "heading-4", group: "basic", title: "标题 4", aliases: ["h4", "heading4"], icon: "heading-4", hint: "####" }, "#### "),
  markdownCommand({ id: "heading-5", group: "basic", title: "标题 5", aliases: ["h5", "heading5"], icon: "heading-5", hint: "#####" }, "##### "),
  markdownCommand({ id: "heading-6", group: "basic", title: "标题 6", aliases: ["h6", "heading6"], icon: "heading-6", hint: "######" }, "###### "),
  markdownCommand({ id: "quote", group: "basic", title: "引用", aliases: ["quote", "blockquote"], icon: "text-quote", hint: ">" }, "> "),
  markdownCommand({ id: "ordered-list", group: "basic", title: "有序列表", aliases: ["ol", "ordered"], icon: "list-ordered", hint: "1." }, "1. "),
  markdownCommand({ id: "unordered-list", group: "basic", title: "项目符号列表", aliases: ["ul", "bullet", "unordered"], icon: "list", hint: "-" }, "- "),
  markdownCommand({ id: "task-list", group: "basic", title: "待办清单", aliases: ["todo", "task", "check"], icon: "list-todo", hint: "[]" }, "- [ ] "),
  markdownCommand(
    { id: "table", group: "basic", title: "表格", aliases: ["table"], icon: "table", hint: "| |" },
    "| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n",
    2
  ),
  markdownCommand({ id: "divider", group: "basic", title: "分隔线", aliases: ["hr", "divider"], icon: "minus", hint: "---" }, "---\n"),
  markdownCommand({ id: "link", group: "basic", title: "链接", aliases: ["link", "url"], icon: "link", hint: "[]()" }, "[]()", 1),
  mediaCommand({ id: "file", group: "media", title: "文件", aliases: ["file"], icon: "file", hint: "file" }, "file"),
  mediaCommand({ id: "image", group: "media", title: "图片", aliases: ["image", "img", "tu"], icon: "image", hint: "img" }, "image"),
  mediaCommand({ id: "video", group: "media", title: "视频", aliases: ["video"], icon: "play", hint: "video" }, "video"),
  mediaCommand({ id: "audio", group: "media", title: "音频", aliases: ["audio"], icon: "music-2", hint: "audio" }, "audio"),
];
