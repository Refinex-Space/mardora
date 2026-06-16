<template>
  <header class="playground-header">
    <div class="header-left">
      <button class="toolbar-icon-button" type="button" title="Toggle contents" @click="$emit('toggle-sidebar')">
        <span class="icon-panel" :class="{ 'icon-panel-open': sidebarOpen }" aria-hidden="true" />
      </button>
      <span class="brand">markora</span>
    </div>

    <div class="header-actions">
      <span v-if="saveStatus !== 'idle'" class="save-status">{{ saveLabel }}</span>

      <div class="dropdown" :class="{ 'dropdown-open': languageMenuOpen }">
        <button class="toolbar-button" type="button" aria-haspopup="menu" @click.stop="toggleLanguageMenu">
          <span class="icon-languages" aria-hidden="true" v-html="languagesIcon" />
          <span>{{ languageLabel }}</span>
          <span class="chevron" aria-hidden="true">v</span>
        </button>
        <div v-if="languageMenuOpen" class="dropdown-menu compact-menu" role="menu">
          <button
            v-for="item in languageOptions"
            :key="item.value"
            type="button"
            class="dropdown-item"
            :class="{ 'dropdown-item-active': shellLocale === item.value }"
            @click="selectLanguage(item.value)"
          >
            <span>{{ item.label }}</span>
            <span v-if="shellLocale === item.value" class="checkmark" aria-hidden="true">check</span>
          </button>
        </div>
      </div>

      <div class="dropdown" :class="{ 'dropdown-open': themeMenuOpen }">
        <button class="toolbar-button" type="button" aria-haspopup="menu" @click.stop="toggleThemeMenu">
          <span class="icon-screen" aria-hidden="true" />
          <span>{{ themeLabel }}</span>
          <span class="chevron" aria-hidden="true">v</span>
        </button>
        <div v-if="themeMenuOpen" class="dropdown-menu compact-menu" role="menu">
          <button
            v-for="item in themes"
            :key="item.value"
            type="button"
            class="dropdown-item"
            :class="{ 'dropdown-item-active': themePreference === item.value }"
            @click="selectTheme(item.value)"
          >
            <span>{{ $t(item.key) }}</span>
            <span v-if="themePreference === item.value" class="checkmark" aria-hidden="true">check</span>
          </button>
        </div>
      </div>

      <div class="dropdown" :class="{ 'dropdown-open': modeMenuOpen }">
        <button class="toolbar-button" type="button" aria-haspopup="menu" @click.stop="toggleModeMenu">
          <span class="mode-dot" aria-hidden="true" />
          <span>{{ $t(activeMode.key) }}</span>
          <span class="chevron" aria-hidden="true">v</span>
        </button>
        <div v-if="modeMenuOpen" class="dropdown-menu mode-menu" role="menu">
          <div class="dropdown-label">{{ $t("header.selectMode") }}</div>
          <button
            v-for="item in modes"
            :key="item.value"
            type="button"
            class="dropdown-item"
            :class="{ 'dropdown-item-active': mode === item.value }"
            @click="selectMode(item.value)"
          >
            <span class="mode-item-icon">{{ item.icon }}</span>
            <span>{{ $t(item.key) }}</span>
            <span v-if="mode === item.value" class="checkmark" aria-hidden="true">check</span>
          </button>
        </div>
      </div>

      <button class="toolbar-button" type="button" title="Toggle developer panel" @click="$emit('toggle-devbar')">
        <span class="icon-panel" :class="{ 'icon-panel-open': devbarOpen }" aria-hidden="true" />
        <span>{{ devbarLabel }}</span>
      </button>
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { PlaygroundMode, SaveStatus, ThemePreference } from "@/types";
import { SHELL_LOCALE_OPTIONS, type ShellLocale } from "@/i18n";

const LANGUAGES_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>';

export default defineComponent({
  name: "PlaygroundHeader",
  props: {
    mode: {
      type: String as PropType<PlaygroundMode>,
      required: true,
    },
    saveStatus: {
      type: String as PropType<SaveStatus>,
      required: true,
    },
    sidebarOpen: {
      type: Boolean,
      required: true,
    },
    devbarOpen: {
      type: Boolean,
      required: true,
    },
    themePreference: {
      type: String as PropType<ThemePreference>,
      required: true,
    },
    shellLocale: {
      type: String as PropType<ShellLocale>,
      required: true,
    },
  },
  data() {
    return {
      modeMenuOpen: false,
      themeMenuOpen: false,
      languageMenuOpen: false,
      languagesIcon: LANGUAGES_ICON_SVG,
      languageOptions: SHELL_LOCALE_OPTIONS,
      modes: [
        { value: "live" as PlaygroundMode, key: "mode.live" as const, icon: "edit" },
        { value: "view" as PlaygroundMode, key: "mode.view" as const, icon: "doc" },
        { value: "code" as PlaygroundMode, key: "mode.code" as const, icon: "scan" },
        { value: "output" as PlaygroundMode, key: "mode.output" as const, icon: "code" },
      ],
      themes: [
        { value: "system" as ThemePreference, key: "theme.system" as const },
        { value: "light" as ThemePreference, key: "theme.light" as const },
        { value: "dark" as ThemePreference, key: "theme.dark" as const },
      ],
    };
  },
  computed: {
    activeMode(): { value: PlaygroundMode; key: "mode.live" | "mode.view" | "mode.code" | "mode.output"; icon: string } {
      return this.modes.find((item) => item.value === this.mode) || this.modes[0];
    },
    themeLabel(): string {
      const theme = this.themes.find((item) => item.value === this.themePreference);
      return theme ? this.$t(theme.key) : this.themePreference;
    },
    saveLabel(): string {
      return this.saveStatus === "saving" ? this.$t("header.saving") : this.$t("header.saved");
    },
    languageLabel(): string {
      return this.shellLocale === "zh" ? "中文" : "EN";
    },
    devbarLabel(): string {
      return this.devbarOpen ? this.$t("header.hideDevbar") : this.$t("header.showDevbar");
    },
  },
  mounted() {
    document.addEventListener("click", this.closeMenus);
  },
  beforeUnmount() {
    document.removeEventListener("click", this.closeMenus);
  },
  methods: {
    closeMenus() {
      this.modeMenuOpen = false;
      this.themeMenuOpen = false;
      this.languageMenuOpen = false;
    },
    toggleModeMenu() {
      this.modeMenuOpen = !this.modeMenuOpen;
      this.themeMenuOpen = false;
      this.languageMenuOpen = false;
    },
    toggleThemeMenu() {
      this.themeMenuOpen = !this.themeMenuOpen;
      this.modeMenuOpen = false;
      this.languageMenuOpen = false;
    },
    toggleLanguageMenu() {
      this.languageMenuOpen = !this.languageMenuOpen;
      this.modeMenuOpen = false;
      this.themeMenuOpen = false;
    },
    selectMode(mode: PlaygroundMode) {
      this.$emit("change-mode", mode);
      this.closeMenus();
    },
    selectTheme(theme: ThemePreference) {
      this.$emit("change-theme", theme);
      this.closeMenus();
    },
    selectLanguage(locale: ShellLocale) {
      this.$emit("change-locale", locale);
      this.closeMenus();
    },
  },
});
</script>
