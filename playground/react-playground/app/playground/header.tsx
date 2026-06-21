import { Button } from "@workspace/ui/components/button";
import {
  Check,
  FileCodeCornerIcon,
  FilePenLineIcon,
  FileTextIcon,
  GalleryHorizontalEnd,
  Loader2,
  ScanTextIcon,
} from "lucide-react";
import React, { Dispatch, SetStateAction } from "react";
import type { SaveStatus } from "./page";
import { ThemeSwitcher } from "@/components/providers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { LanguageSwitcher } from "../i18n/LanguageSwitcher";
import { useLocale } from "../i18n/LocaleContext";
import { LOGO_DARK_SVG, LOGO_LIGHT_SVG } from "../brand/logo";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

const modeKeys = {
  live: "mode.live",
  view: "mode.view",
  code: "mode.code",
  output: "mode.output",
} as const;

type ModeValue = keyof typeof modeKeys;

const modes: { value: ModeValue; key: keyof typeof modeKeys; icon: typeof FilePenLineIcon }[] = [
  { value: "live", key: "live", icon: FilePenLineIcon },
  { value: "view", key: "view", icon: FileTextIcon },
  { value: "code", key: "code", icon: ScanTextIcon },
  { value: "output", key: "output", icon: FileCodeCornerIcon },
];

type Props = {
  devbarOpen: boolean;
  setDevbarOpen: Dispatch<SetStateAction<boolean>>;
  saveStatus: SaveStatus;
  mode: "live" | "view" | "code" | "output";
  setMode: Dispatch<SetStateAction<"live" | "view" | "code" | "output">>;
};

export default function Header({
  devbarOpen,
  setDevbarOpen,
  saveStatus,
  mode,
  setMode,
}: Props) {
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme?.includes("dark");
  const logo = isDark ? LOGO_DARK_SVG : LOGO_LIGHT_SVG;

  return (
    <header className="h-12 w-full flex items-center justify-between py-1 px-4 overflow-y-auto">
      <div className="flex items-center gap-3">
        {/* Theme-aware inline logo */}
        <span className="size-7 inline-block" dangerouslySetInnerHTML={{ __html: logo }} aria-hidden="true" />
        <span className="text-xl font-mono">Mardora</span>
      </div>
      <div className="flex items-center gap-1">
        {saveStatus !== "idle" && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-1">
            {saveStatus === "saving" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span className="hidden sm:inline">{t("header.saving")}</span>
              </>
            ) : (
              <>
                <Check className="size-3.5 text-green-500" />
                <span className="hidden sm:inline">{t("header.saved")}</span>
              </>
            )}
          </div>
        )}
        <LanguageSwitcher />
        <ThemeSwitcher />
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <GalleryHorizontalEnd className="size-4" />
                  <span className="sr-only">{t("header.selectMode")}</span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("header.selectMode")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            <DropdownMenuLabel>{t("header.selectMode")}</DropdownMenuLabel>
            {modes.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => setMode(option.value)}>
                <option.icon className="size-4" />
                <span>{t(modeKeys[option.value])}</span>
                {mode === option.value && <Check className="size-4 ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => setDevbarOpen(!devbarOpen)}>
              <PanelRightIcon className="size-6" />
              <span className="sr-only">{devbarOpen ? t("header.hideDevbar") : t("header.showDevbar")}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{devbarOpen ? t("header.hideDevbar") : t("header.showDevbar")}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

function PanelRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 68 50"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="24"
        y="11"
        width="28"
        height="26"
        rx="5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M45 18V30"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
