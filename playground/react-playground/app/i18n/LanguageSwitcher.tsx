"use client";

import * as React from "react";
import { Check, Languages } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { SHELL_LOCALE_OPTIONS, useLocale } from "./LocaleContext";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-8">
        <Languages className="size-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <Languages className="size-4" />
              <span className="sr-only">{t("header.selectLanguage")}</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("header.selectLanguage")}</TooltipContent>
      </Tooltip>
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
