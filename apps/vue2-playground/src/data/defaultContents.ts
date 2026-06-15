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
