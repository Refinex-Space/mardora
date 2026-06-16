import React from "react";
import { useLocale } from "../i18n/LocaleContext";

type Props = {
  counts: {
    words: number;
    lines: number;
    char: number;
  };
};

export default function Footer({ counts }: Props) {
  const { t } = useLocale();
  return (
    <footer className="h-10 w-full py-1 px-8 flex items-center justify-between gap-6 font-mono text-sm text-muted-foreground">
      <div></div>
      <div className="flex items-center gap-4">
        <span>{t("footer.words")}: {counts.words}</span>
        <span>•</span>
        <span>{t("footer.lines")}: {counts.lines}</span>
        <span>•</span>
        <span>{t("footer.chars")}: {counts.char}</span>
      </div>
    </footer>
  );
}
