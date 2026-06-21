<template>
  <div class="playground-shell" :class="`theme-${theme}`">
    <PlaygroundHeader
      :mode="mode"
      :save-status="saveStatus"
      :devbar-open="devbarOpen"
      :theme-preference="themePreference"
      :shell-locale="shellLocale"
      :theme="theme"
      @toggle-devbar="devbarOpen = !devbarOpen"
      @change-mode="mode = $event"
      @change-theme="setThemePreference"
      @change-locale="setShellLocale"
    />

    <main class="playground-main">
      <div v-if="showBackdrop" class="backdrop" @click="closePanels" />

      <div class="sidebar-panel">
        <PlaygroundSidebar :contents="contents" :current-content="currentContent" @select-content="selectContent" />
      </div>

      <section class="editor-panel">
        <div class="editor-frame">
          <EditorPane
            v-if="currentDocument"
            :content="currentDocument"
            :mode="mode"
            :config="config"
            :show-nodes="showNodes"
            :theme="theme"
            @change-content="updateCurrentContent"
            @nodes-change="nodes = $event"
            @output-change="handleOutputChange"
          />
          <div v-else class="empty-state">
            <span>{{ $t("empty.noContentSelected") }}</span>
            <CreateContentDialog @create="createContent" />
          </div>
        </div>
      </section>

      <div class="devbar-panel" :class="devbarOpen ? 'panel-open' : 'panel-closed'">
        <PlaygroundDevbar
          :config="config"
          :show-nodes="showNodes"
          :nodes="nodes"
          :output-time="outputTime"
          @update-config="config = $event"
          @update-show-nodes="showNodes = $event"
        />
      </div>
    </main>

    <PlaygroundFooter :metrics="metrics" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import type { MardoraNode } from "mardora/editor";
import CreateContentDialog from "./CreateContentDialog.vue";
import PlaygroundDevbar from "./Devbar.vue";
import EditorPane from "./EditorPane.vue";
import PlaygroundFooter from "./Footer.vue";
import PlaygroundHeader from "./Header.vue";
import PlaygroundSidebar from "./Sidebar.vue";
import { loadPlaygroundSnapshot, relocalizeContents, savePlaygroundSnapshot } from "@/state/storage";
import { createDefaultConfig } from "@/state/playgroundConfig";
import { resolvePanelStateForViewport } from "@/state/panels";
import { createContentId, getContentMetrics } from "@/utils/contentMetrics";
import { setLocale as setShellLocaleStore, type ShellLocale } from "@/i18n";
import type {
  Content,
  ContentMetrics,
  PlaygroundConfig,
  PlaygroundMode,
  PreviewOutput,
  SaveStatus,
  ThemeMode,
  ThemePreference,
} from "@/types";

export default Vue.extend({
  name: "Playground",
  components: {
    CreateContentDialog,
    EditorPane,
    PlaygroundDevbar,
    PlaygroundFooter,
    PlaygroundHeader,
    PlaygroundSidebar,
  },
  data() {
    const snapshot = loadPlaygroundSnapshot();
    return {
      contents: snapshot.contents as Content[],
      currentContent: snapshot.currentContent,
      mode: "live" as PlaygroundMode,
      config: createDefaultConfig() as PlaygroundConfig,
      nodes: [] as MardoraNode[],
      output: null as PreviewOutput | null,
      outputTime: null as number | null,
      showNodes: false,
      saveStatus: "idle" as SaveStatus,
      devbarOpen: false,
      isDesktop: false,
      theme: "light" as ThemeMode,
      themePreference: "system" as ThemePreference,
      saveTimer: 0,
      savedTimer: 0,
    };
  },
  computed: {
    currentDocument(): Content | null {
      return this.currentContent >= 0 ? this.contents[this.currentContent] || null : null;
    },
    metrics(): ContentMetrics {
      return getContentMetrics(this.currentDocument?.content || "");
    },
    showBackdrop(): boolean {
      return !this.isDesktop && this.devbarOpen;
    },
    // Reads the reactive i18n store so this (and the watcher below) track locale changes.
    shellLocale(): ShellLocale {
      return (this as any).$i18nState.locale as ShellLocale;
    },
  },
  watch: {
    shellLocale(next: ShellLocale) {
      const result = relocalizeContents(this.contents, this.currentContent, next);
      this.contents = result.contents;
      this.currentContent = result.currentContent;
    },
  },
  mounted() {
    this.handleResize();
    this.syncSystemTheme();
    window.addEventListener("resize", this.handleResize);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", this.syncSystemTheme);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.handleResize);
    window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", this.syncSystemTheme);
    window.clearTimeout(this.saveTimer);
    window.clearTimeout(this.savedTimer);
  },
  methods: {
    handleResize() {
      const nextPanelState = resolvePanelStateForViewport(window.matchMedia("(min-width: 1280px)").matches, {
        isDesktop: this.isDesktop,
        devbarOpen: this.devbarOpen,
      });
      this.isDesktop = nextPanelState.isDesktop;
      this.devbarOpen = nextPanelState.devbarOpen;
    },
    syncSystemTheme() {
      if (this.themePreference !== "system") return;
      this.theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    },
    setThemePreference(preference: ThemePreference) {
      this.themePreference = preference;
      this.theme =
        preference === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : preference;
    },
    closePanels() {
      this.devbarOpen = false;
    },
    selectContent(index: number) {
      this.currentContent = index;
      this.saveNow();
    },
    setShellLocale(locale: ShellLocale) {
      setShellLocaleStore(locale);
    },
    createContent(title: string) {
      const nextContent: Content = {
        id: createContentId(),
        title,
        content: `# ${title}\n\n## Hello World`,
      };
      this.contents = [...this.contents, nextContent];
      this.currentContent = this.contents.length - 1;
      this.scheduleSave();
    },
    updateCurrentContent(content: string) {
      const current = this.currentDocument;
      if (!current) return;
      this.contents = this.contents.map((item) => (item.id === current.id ? { ...item, content } : item));
      this.scheduleSave();
    },
    handleOutputChange(payload: { output: PreviewOutput; outputTime: number | null }) {
      this.output = payload.output;
      this.outputTime = payload.outputTime;
    },
    scheduleSave() {
      window.clearTimeout(this.saveTimer);
      window.clearTimeout(this.savedTimer);
      this.saveStatus = "saving";
      this.saveTimer = window.setTimeout(() => {
        this.saveNow();
        this.saveStatus = "saved";
        this.savedTimer = window.setTimeout(() => {
          this.saveStatus = "idle";
        }, 2000);
      }, 500);
    },
    saveNow() {
      savePlaygroundSnapshot(this.contents, this.currentContent);
    },
  },
});
</script>
