<template>
  <header class="playground-header">
    <div class="header-left">
      <button class="toolbar-icon-button" type="button" title="Toggle contents" @click="$emit('toggle-sidebar')">
        <span class="icon-panel" :class="{ 'icon-panel-open': sidebarOpen }" aria-hidden="true" />
      </button>
      <span class="brand">draftly</span>
    </div>

    <div class="header-actions">
      <span v-if="saveStatus !== 'idle'" class="save-status">{{ saveLabel }}</span>

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
            <span>{{ item.label }}</span>
            <span v-if="themePreference === item.value" class="checkmark" aria-hidden="true">check</span>
          </button>
        </div>
      </div>

      <div class="dropdown" :class="{ 'dropdown-open': modeMenuOpen }">
        <button class="toolbar-button" type="button" aria-haspopup="menu" @click.stop="toggleModeMenu">
          <span class="mode-dot" aria-hidden="true" />
          <span>{{ activeMode.label }}</span>
          <span class="chevron" aria-hidden="true">v</span>
        </button>
        <div v-if="modeMenuOpen" class="dropdown-menu mode-menu" role="menu">
          <div class="dropdown-label">Select Mode</div>
          <button
            v-for="item in modes"
            :key="item.value"
            type="button"
            class="dropdown-item"
            :class="{ 'dropdown-item-active': mode === item.value }"
            @click="selectMode(item.value)"
          >
            <span class="mode-item-icon">{{ item.icon }}</span>
            <span>{{ item.label }}</span>
            <span v-if="mode === item.value" class="checkmark" aria-hidden="true">check</span>
          </button>
        </div>
      </div>

      <button class="toolbar-button" type="button" title="Toggle developer panel" @click="$emit('toggle-devbar')">
        <span class="icon-panel" :class="{ 'icon-panel-open': devbarOpen }" aria-hidden="true" />
        <span>{{ devbarOpen ? "Hide Devbar" : "Show Devbar" }}</span>
      </button>
    </div>
  </header>
</template>

<script lang="ts">
import Vue from "vue";
import type { PlaygroundMode, SaveStatus, ThemePreference } from "@/types";

export default Vue.extend({
  name: "PlaygroundHeader",
  props: {
    mode: {
      type: String as () => PlaygroundMode,
      required: true,
    },
    saveStatus: {
      type: String as () => SaveStatus,
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
      type: String as () => ThemePreference,
      required: true,
    },
  },
  data() {
    return {
      modeMenuOpen: false,
      themeMenuOpen: false,
      modes: [
        { value: "live" as PlaygroundMode, label: "Live", icon: "edit" },
        { value: "view" as PlaygroundMode, label: "View", icon: "doc" },
        { value: "code" as PlaygroundMode, label: "Code", icon: "scan" },
        { value: "output" as PlaygroundMode, label: "Output", icon: "code" },
      ],
      themes: [
        { value: "system" as ThemePreference, label: "system" },
        { value: "light" as ThemePreference, label: "light" },
        { value: "dark" as ThemePreference, label: "dark" },
      ],
    };
  },
  computed: {
    activeMode(): { value: PlaygroundMode; label: string; icon: string } {
      return this.modes.find((item) => item.value === this.mode) || this.modes[0];
    },
    themeLabel(): string {
      return this.themePreference;
    },
    saveLabel(): string {
      return this.saveStatus === "saving" ? "Saving..." : "Saved";
    },
  },
  mounted() {
    document.addEventListener("click", this.closeMenus);
  },
  beforeDestroy() {
    document.removeEventListener("click", this.closeMenus);
  },
  methods: {
    closeMenus() {
      this.modeMenuOpen = false;
      this.themeMenuOpen = false;
    },
    toggleModeMenu() {
      this.modeMenuOpen = !this.modeMenuOpen;
      this.themeMenuOpen = false;
    },
    toggleThemeMenu() {
      this.themeMenuOpen = !this.themeMenuOpen;
      this.modeMenuOpen = false;
    },
    selectMode(mode: PlaygroundMode) {
      this.$emit("change-mode", mode);
      this.closeMenus();
    },
    selectTheme(theme: ThemePreference) {
      this.$emit("change-theme", theme);
      this.closeMenus();
    },
  },
});
</script>
