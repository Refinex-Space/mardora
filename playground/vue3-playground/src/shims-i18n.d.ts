import type { ComputedRef } from "vue";
import type { MessageKey, ShellLocale } from "@/i18n";

declare module "vue" {
  export interface ComponentCustomProperties {
    $t: (key: MessageKey, vars?: Record<string, string | number>) => string;
    $locale: ComputedRef<ShellLocale>;
    $setLocale: (locale: ShellLocale) => void;
  }
}
