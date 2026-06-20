<template>
  <header class="playground-header">
    <div class="header-left">
      <button
        class="toolbar-icon-button"
        type="button"
        :title="$t('header.toggleSidebar')"
        :aria-label="$t('header.toggleSidebar')"
        @click="$emit('toggle-sidebar')"
      >
        <span class="icon-svg" aria-hidden="true" v-html="icons.panelLeftClose" />
      </button>
      <span class="brand-logo" aria-hidden="true" v-html="logo" />
      <span class="brand-title">Mardora</span>
    </div>

    <div class="header-actions">
      <span v-if="saveStatus !== 'idle'" class="save-status">{{ saveLabel }}</span>

      <div class="dropdown" :class="{ 'dropdown-open': languageMenuOpen }">
        <button
          class="toolbar-icon-button"
          type="button"
          :title="$t('header.selectLanguage')"
          :aria-label="$t('header.selectLanguage')"
          aria-haspopup="menu"
          @click.stop="toggleLanguageMenu"
        >
          <span class="icon-svg" aria-hidden="true" v-html="icons.languages" />
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
        <button
          class="toolbar-icon-button"
          type="button"
          :title="$t('header.selectTheme')"
          :aria-label="$t('header.selectTheme')"
          aria-haspopup="menu"
          @click.stop="toggleThemeMenu"
        >
          <span class="icon-svg" aria-hidden="true" v-html="icons.palette" />
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
        <button
          class="toolbar-icon-button"
          type="button"
          :title="$t('header.selectMode')"
          :aria-label="$t('header.selectMode')"
          aria-haspopup="menu"
          @click.stop="toggleModeMenu"
        >
          <span class="icon-svg" aria-hidden="true" v-html="icons.galleryHorizontalEnd" />
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

      <button
        class="toolbar-icon-button"
        type="button"
        :title="devbarLabel"
        :aria-label="devbarLabel"
        @click="$emit('toggle-devbar')"
      >
        <span class="icon-svg" aria-hidden="true" v-html="icons.panelRightClose" />
      </button>
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { PlaygroundMode, SaveStatus, ThemePreference, ThemeMode } from "@/types";
import { SHELL_LOCALE_OPTIONS, type ShellLocale } from "@/i18n";
import { LOGO_DARK_SVG, LOGO_LIGHT_SVG } from "@/brand/logo";

// lucide-style 16px icons (stroke = currentColor).
const icon = (paths: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICONS = {
  languages: icon(
    '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>'
  ),
  palette: icon(
    '<path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z"/><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>'
  ),
  galleryHorizontalEnd: icon(
    '<path d="M2 7v10"/><path d="M6 5v14"/><rect width="12" height="18" x="10" y="3" rx="2"/>'
  ),
  panelLeftClose: icon(
    '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>'
  ),
  panelRightClose: icon(
    '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/><path d="m8 9 3 3-3 3"/>'
  ),
};

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
    theme: {
      type: String as PropType<ThemeMode>,
      required: true,
    },
  },
  data() {
    return {
      modeMenuOpen: false,
      themeMenuOpen: false,
      languageMenuOpen: false,
      icons: ICONS,
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
    logo(): string {
      return this.theme === "dark" ? LOGO_DARK_SVG : LOGO_LIGHT_SVG;
    },
    saveLabel(): string {
      return this.saveStatus === "saving" ? this.$t("header.saving") : this.$t("header.saved");
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
