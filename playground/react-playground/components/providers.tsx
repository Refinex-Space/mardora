"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { Button } from "@workspace/ui/components/button";
import { Palette, Monitor, Sun, Moon, Check } from "lucide-react";

// =============================================
// THEME CONFIGURATION - Edit themes here
// =============================================
export const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Monitor },
  { value: "default-light", label: "Light", icon: Sun },
  { value: "default-dark", label: "Dark", icon: Moon },
] as const;

// Extract theme values for the provider
const themeValues = THEME_OPTIONS.map((t) => t.value);
// Map theme values to CSS class names
// Include "dark" and "light" mappings for system theme resolution
const themeClassMap: Record<string, string> = {
  "default-light": "default-light",
  "default-dark": "default-dark",
  dark: "default-dark", // System theme resolves to "dark"
  light: "default-light", // System theme resolves to "light"
};

// =============================================
// Theme Switcher Component (icon-only)
// =============================================
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-8">
        <Palette className="size-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <Palette className="size-4" />
              <span className="sr-only">Select Theme</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Select Theme</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => setTheme(option.value)}>
            <option.icon className="size-4" />
            {option.label}
            {theme === option.value && <Check className="size-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================
// Providers Component
// =============================================
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="mardora-theme"
      disableTransitionOnChange
      enableColorScheme
      themes={themeValues}
      value={themeClassMap}
    >
      {children}
    </NextThemesProvider>
  );
}
