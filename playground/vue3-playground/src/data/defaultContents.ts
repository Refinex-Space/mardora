import type { Content } from "@/types";
import type { ShellLocale } from "@/i18n";
import projectIntroductionZh from "./md/project-introduction";
import reactGuideZh from "./md/react-guide";
import vue2GuideZh from "./md/vue2-guide";
import vue3GuideZh from "./md/vue3-guide";
import projectIntroductionEn from "./md/project-introduction.en";
import reactGuideEn from "./md/react-guide.en";
import vue2GuideEn from "./md/vue2-guide.en";
import vue3GuideEn from "./md/vue3-guide.en";

export const STORAGE_VERSION = 3;

export const defaultContentIds = new Set([
  "project-introduction",
  "vue2-guide",
  "vue3-guide",
  "react-guide",
]);

const TITLES: Record<string, Record<ShellLocale, string>> = {
  "project-introduction": { zh: "项目介绍", en: "Project Introduction" },
  "vue2-guide": { zh: "Vue2 接入指南", en: "Vue 2 Integration Guide" },
  "vue3-guide": { zh: "Vue3 接入指南", en: "Vue 3 Integration Guide" },
  "react-guide": { zh: "React 接入指南", en: "React Integration Guide" },
};

type DocBundle = {
  "project-introduction": { zh: string; en: string };
  "vue2-guide": { zh: string; en: string };
  "vue3-guide": { zh: string; en: string };
  "react-guide": { zh: string; en: string };
};

const bundle: DocBundle = {
  "project-introduction": { zh: projectIntroductionZh, en: projectIntroductionEn },
  "vue2-guide": { zh: vue2GuideZh, en: vue2GuideEn },
  "vue3-guide": { zh: vue3GuideZh, en: vue3GuideEn },
  "react-guide": { zh: reactGuideZh, en: reactGuideEn },
};

export function buildDefaultContents(locale: ShellLocale): Content[] {
  return (
    ["project-introduction", "vue2-guide", "vue3-guide", "react-guide"] as const
  ).map((id) => ({
    id,
    title: TITLES[id][locale],
    content: bundle[id][locale],
  }));
}

export const defaultContents: Content[] = buildDefaultContents("zh");
