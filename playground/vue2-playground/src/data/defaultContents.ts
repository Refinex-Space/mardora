import type { Content } from "@/types";
import projectIntroduction from "./md/project-introduction";
import reactGuide from "./md/react-guide";
import vue2Guide from "./md/vue2-guide";
import vue3Guide from "./md/vue3-guide";

export const STORAGE_VERSION = 2;

export const defaultContents: Content[] = [
  {
    id: "project-introduction",
    title: "项目介绍",
    content: projectIntroduction,
  },
  {
    id: "vue2-guide",
    title: "Ve2 接入指南",
    content: vue2Guide,
  },
  {
    id: "vue3-guide",
    title: "Vue3 接入指南",
    content: vue3Guide,
  },
  {
    id: "react-guide",
    title: "React 接入指南",
    content: reactGuide,
  },
];

export const defaultContentIds = new Set(defaultContents.map((content) => content.id));
