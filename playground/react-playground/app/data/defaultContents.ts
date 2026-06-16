import type { Content } from "../playground/types";
import type { ShellLocale } from "../i18n/LocaleContext";

// Central registry of the built-in sample documents. Each entry has a stable id
// and a per-locale title + body. The shell language switcher swaps these entries
// (by id) when the locale changes; user-created documents are never touched here.

export const DEFAULT_CONTENT_IDS = [
  "project-introduction",
  "vue2-guide",
  "vue3-guide",
  "react-guide",
] as const;

type DocBundle = {
  projectIntroduction: { zh: string; en: string };
  vue2Guide: { zh: string; en: string };
  vue3Guide: { zh: string; en: string };
  reactGuide: { zh: string; en: string };
};

const TITLES: Record<(typeof DEFAULT_CONTENT_IDS)[number], Record<ShellLocale, string>> = {
  "project-introduction": { zh: "项目介绍", en: "Project Introduction" },
  "vue2-guide": { zh: "Vue2 接入指南", en: "Vue 2 Integration Guide" },
  "vue3-guide": { zh: "Vue3 接入指南", en: "Vue 3 Integration Guide" },
  "react-guide": { zh: "React 接入指南", en: "React Integration Guide" },
};

export function buildDefaultContents(locale: ShellLocale, bundle: DocBundle): Content[] {
  const pick = (entry: { zh: string; en: string }) => entry[locale];
  return [
    {
      id: "project-introduction",
      title: TITLES["project-introduction"][locale],
      content: pick(bundle.projectIntroduction),
    },
    {
      id: "vue2-guide",
      title: TITLES["vue2-guide"][locale],
      content: pick(bundle.vue2Guide),
    },
    {
      id: "vue3-guide",
      title: TITLES["vue3-guide"][locale],
      content: pick(bundle.vue3Guide),
    },
    {
      id: "react-guide",
      title: TITLES["react-guide"][locale],
      content: pick(bundle.reactGuide),
    },
  ];
}
