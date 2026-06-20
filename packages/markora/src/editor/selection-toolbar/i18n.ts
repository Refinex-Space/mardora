import type { MarkoraLocale } from "../i18n";
import type { SelectionToolbarBlockType } from "./types";

export type SelectionToolbarMessages = {
  buttons: {
    blockType: string;
    bold: string;
    italic: string;
    strike: string;
    underline: string;
    code: string;
    highlight: string;
    color: string;
    link: string;
    orderedList: string;
    unorderedList: string;
    taskList: string;
  };
  panels: {
    textColor: string;
    highlightColor: string;
  };
  link: {
    title: string;
    url: string;
    copy: string;
    copied: string;
    open: string;
    remove: string;
    invalid: string;
  };
  blockTypes: Record<SelectionToolbarBlockType, string>;
  colors: {
    defaultText: string;
    gray: string;
    red: string;
    orange: string;
    yellow: string;
    green: string;
    blue: string;
    purple: string;
    defaultHighlight: string;
    yellowHighlight: string;
    greenHighlight: string;
    blueHighlight: string;
    pinkHighlight: string;
    purpleHighlight: string;
  };
};

const selectionToolbarMessages: Record<MarkoraLocale, SelectionToolbarMessages> = {
  "zh-CN": {
    buttons: {
      blockType: "块类型",
      bold: "加粗",
      italic: "斜体",
      strike: "删除线",
      underline: "下划线",
      code: "行内代码",
      highlight: "高亮",
      color: "文字颜色",
      link: "链接",
      orderedList: "有序列表",
      unorderedList: "无序列表",
      taskList: "任务列表",
    },
    panels: {
      textColor: "文字颜色",
      highlightColor: "高亮颜色",
    },
    link: {
      title: "链接标题",
      url: "链接 URL",
      copy: "复制链接",
      copied: "已复制",
      open: "打开链接",
      remove: "移除链接",
      invalid: "请输入有效链接",
    },
    blockTypes: {
      text: "文本",
      "heading-1": "标题 1",
      "heading-2": "标题 2",
      "heading-3": "标题 3",
      "heading-4": "标题 4",
      "heading-5": "标题 5",
      "heading-6": "标题 6",
    },
    colors: {
      defaultText: "默认文字颜色",
      gray: "灰色",
      red: "红色",
      orange: "橙色",
      yellow: "黄色",
      green: "绿色",
      blue: "蓝色",
      purple: "紫色",
      defaultHighlight: "默认高亮",
      yellowHighlight: "黄色高亮",
      greenHighlight: "绿色高亮",
      blueHighlight: "蓝色高亮",
      pinkHighlight: "粉色高亮",
      purpleHighlight: "紫色高亮",
    },
  },
  "en-US": {
    buttons: {
      blockType: "Block type",
      bold: "Bold",
      italic: "Italic",
      strike: "Strikethrough",
      underline: "Underline",
      code: "Inline code",
      highlight: "Highlight",
      color: "Text color",
      link: "Link",
      orderedList: "Numbered list",
      unorderedList: "Bulleted list",
      taskList: "To-do list",
    },
    panels: {
      textColor: "Text color",
      highlightColor: "Highlight color",
    },
    link: {
      title: "Link title",
      url: "Link URL",
      copy: "Copy link",
      copied: "Copied",
      open: "Open link",
      remove: "Remove link",
      invalid: "Enter a valid link",
    },
    blockTypes: {
      text: "Text",
      "heading-1": "Heading 1",
      "heading-2": "Heading 2",
      "heading-3": "Heading 3",
      "heading-4": "Heading 4",
      "heading-5": "Heading 5",
      "heading-6": "Heading 6",
    },
    colors: {
      defaultText: "Default text color",
      gray: "Gray",
      red: "Red",
      orange: "Orange",
      yellow: "Yellow",
      green: "Green",
      blue: "Blue",
      purple: "Purple",
      defaultHighlight: "Default highlight",
      yellowHighlight: "Yellow highlight",
      greenHighlight: "Green highlight",
      blueHighlight: "Blue highlight",
      pinkHighlight: "Pink highlight",
      purpleHighlight: "Purple highlight",
    },
  },
};

export function getSelectionToolbarMessages(locale: MarkoraLocale): SelectionToolbarMessages {
  return selectionToolbarMessages[locale];
}
