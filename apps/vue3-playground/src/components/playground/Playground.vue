<template>
  <div class="playground-shell" :class="`theme-${theme}`">
    <PlaygroundHeader
      :mode="mode"
      :save-status="saveStatus"
      :sidebar-open="sidebarOpen"
      :devbar-open="devbarOpen"
      :theme-preference="themePreference"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
      @toggle-devbar="devbarOpen = !devbarOpen"
      @change-mode="mode = $event"
      @change-theme="setThemePreference"
    />

    <main class="playground-main">
      <div v-if="showBackdrop" class="backdrop" @click="closePanels" />

      <div class="sidebar-panel" :class="sidebarOpen ? 'panel-open' : 'panel-closed'">
        <PlaygroundSidebar
          :contents="contents"
          :current-content="currentContent"
          @select-content="selectContent"
          @create-content="createContent"
          @delete-content="deleteContent"
          @rename-content="renameContent"
        />
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
            <span>No Content Selected</span>
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
import { defineComponent } from "vue";
import type { DraftlyNode } from "draftly/editor";
import CreateContentDialog from "./CreateContentDialog.vue";
import PlaygroundDevbar from "./Devbar.vue";
import EditorPane from "./EditorPane.vue";
import PlaygroundFooter from "./Footer.vue";
import PlaygroundHeader from "./Header.vue";
import PlaygroundSidebar from "./Sidebar.vue";
import { loadPlaygroundSnapshot, savePlaygroundSnapshot } from "@/state/storage";
import { createDefaultConfig } from "@/state/playgroundConfig";
import { createContentId, getContentMetrics } from "@/utils/contentMetrics";
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

interface RenamePayload {
  id: string;
  title: string;
}

export default defineComponent({
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
      nodes: [] as DraftlyNode[],
      output: null as PreviewOutput | null,
      outputTime: null as number | null,
      showNodes: false,
      saveStatus: "idle" as SaveStatus,
      sidebarOpen: false,
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
      return !this.isDesktop && (this.sidebarOpen || this.devbarOpen);
    },
  },
  mounted() {
    this.handleResize();
    this.syncSystemTheme();
    window.addEventListener("resize", this.handleResize);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", this.syncSystemTheme);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.handleResize);
    window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", this.syncSystemTheme);
    window.clearTimeout(this.saveTimer);
    window.clearTimeout(this.savedTimer);
  },
  methods: {
    handleResize() {
      this.isDesktop = window.matchMedia("(min-width: 1280px)").matches;
      if (this.isDesktop) {
        this.sidebarOpen = true;
        this.devbarOpen = true;
      }
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
      this.sidebarOpen = false;
      this.devbarOpen = false;
    },
    selectContent(index: number) {
      this.currentContent = index;
      this.saveNow();
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
    deleteContent(id: string) {
      const index = this.contents.findIndex((content) => content.id === id);
      if (index === -1) return;

      this.contents = this.contents.filter((content) => content.id !== id);
      if (this.contents.length === 0) {
        this.currentContent = -1;
      } else if (this.currentContent >= index) {
        this.currentContent = Math.max(0, this.currentContent - 1);
      }
      this.scheduleSave();
    },
    renameContent(payload: RenamePayload) {
      this.contents = this.contents.map((content) =>
        content.id === payload.id ? { ...content, title: payload.title } : content
      );
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
