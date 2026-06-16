"use client";

import * as React from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { SHELL_LOCALE_OPTIONS, useLocale } from "./LocaleContext";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Short label shown next to the icon.
  const shortLabel = locale === "zh" ? "中文" : "EN";

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-8">
        <Languages className="size-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Languages className="size-4" />
          <span className="hidden sm:inline">{shortLabel}</span>
          <ChevronDown className="size-4 ml-auto" />
          <span className="sr-only">{t("header.selectLanguage")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{t("header.selectLanguage")}</DropdownMenuLabel>
        {SHELL_LOCALE_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setLocale(option.value)}>
            {option.label}
            {locale === option.value && <Check className="size-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
