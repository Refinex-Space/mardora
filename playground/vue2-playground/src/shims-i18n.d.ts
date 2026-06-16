import type { MessageKey, ShellLocale } from "@/i18n";

declare module "vue/types/vue" {
  interface Vue {
    $t: (key: MessageKey, vars?: Record<string, string | number>) => string;
    $i18nState: { locale: ShellLocale };
    $setLocale: (locale: ShellLocale) => void;
  }
}
