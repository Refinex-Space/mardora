<template>
  <div class="editor-host">
    <div v-if="!content" class="empty-state">
      <span>No Content Selected</span>
    </div>

    <div v-else-if="mode === 'view'" class="preview-with-toc">
      <div ref="previewHost" class="preview-host" @scroll="syncPreviewTocActive">
        <div v-html="previewOutput.html" />
      </div>
      <aside v-if="config.features.tableOfContents" class="vue2-preview-toc">
        <div class="vue2-preview-toc-header">
          <span>目录</span>
        </div>
        <nav class="vue2-preview-toc-list" aria-label="Document table of contents">
          <button
            v-for="item in previewToc"
            :key="item.id"
            type="button"
            class="vue2-preview-toc-item"
            :class="{ 'vue2-preview-toc-item-active': item.active }"
            :data-level="item.level"
            :title="item.text"
            @click="jumpPreviewToc(item.id)"
          >
            {{ item.text }}
          </button>
          <div v-if="previewToc.length === 0" class="vue2-preview-toc-empty">暂无目录</div>
        </nav>
      </aside>
    </div>

    <div v-else-if="mode === 'output'" class="code-output-grid">
      <div ref="htmlOutputHost" class="code-output-cell" />
      <div ref="cssOutputHost" class="code-output-cell" />
    </div>

    <div v-else ref="editorHost" class="editor-host" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { githubDark, githubLight } from "@uiw/codemirror-theme-github";
import type { DraftlyNode, DraftlyTocItem } from "draftly/editor";
import { draftly, ThemeEnum } from "draftly/editor";
import { extractPreviewTocFromMarkdown, generateCSS, preview } from "draftly/preview";
import { getActivePlugins } from "@/state/playgroundConfig";
import type { Content, PlaygroundConfig, PlaygroundMode, PreviewOutput, ThemeMode } from "@/types";

export default Vue.extend({
  name: "EditorPane",
  props: {
    content: {
      type: Object as () => Content | null,
      default: null,
    },
    mode: {
      type: String as () => PlaygroundMode,
      required: true,
    },
    config: {
      type: Object as () => PlaygroundConfig,
      required: true,
    },
    showNodes: {
      type: Boolean,
      required: true,
    },
    theme: {
      type: String as () => ThemeMode,
      required: true,
    },
  },
  data() {
    return {
      editorView: null as EditorView | null,
      htmlView: null as EditorView | null,
      cssView: null as EditorView | null,
      previewStyleElement: null as HTMLStyleElement | null,
      previewOutput: { html: "", css: "" } as PreviewOutput,
      internalUpdate: false,
      renderRequest: 0,
      objectUrls: [] as string[],
      previewToc: [] as DraftlyTocItem[],
    };
  },
  mounted() {
    this.rebuildForMode();
  },
  beforeDestroy() {
    this.destroyViews();
    this.revokeObjectUrls();
  },
  watch: {
    mode() {
      this.rebuildForMode();
    },
    theme() {
      this.rebuildForMode();
    },
    showNodes() {
      this.rebuildForMode();
    },
    config: {
      deep: true,
      handler() {
        this.rebuildForMode();
      },
    },
    content: {
      deep: true,
      handler(nextContent: Content | null, previousContent: Content | null) {
        if (!nextContent) {
          this.destroyViews();
          return;
        }

        if (!previousContent || nextContent.id !== previousContent.id) {
          this.rebuildForMode();
          return;
        }

        if (this.editorView && nextContent.content !== this.editorView.state.doc.toString()) {
          this.internalUpdate = true;
          this.editorView.dispatch({
            changes: {
              from: 0,
              to: this.editorView.state.doc.length,
              insert: nextContent.content,
            },
          });
          this.internalUpdate = false;
        }

        if (this.mode === "view" || this.mode === "output") {
          this.renderPreview();
        }
      },
    },
  },
  methods: {
    cmTheme() {
      return this.theme === "dark" ? githubDark : githubLight;
    },
    draftlyTheme() {
      return this.theme === "dark" ? ThemeEnum.DARK : ThemeEnum.LIGHT;
    },
    destroyViews() {
      if (this.editorView) {
        this.editorView.destroy();
        this.editorView = null;
      }
      if (this.htmlView) {
        this.htmlView.destroy();
        this.htmlView = null;
      }
      if (this.cssView) {
        this.cssView.destroy();
        this.cssView = null;
      }
      if (this.previewStyleElement) {
        this.previewStyleElement.remove();
        this.previewStyleElement = null;
      }
      this.previewToc = [];
    },
    revokeObjectUrls() {
      for (const url of this.objectUrls) {
        URL.revokeObjectURL(url);
      }
      this.objectUrls = [];
    },
    async mockUploader(file: File) {
      const url = URL.createObjectURL(file);
      this.objectUrls.push(url);
      return {
        url,
        name: file.name,
        mimeType: file.type,
      };
    },
    rebuildForMode() {
      this.$nextTick(() => {
        this.destroyViews();
        if (!this.content) return;

        if (this.mode === "view" || this.mode === "output") {
          this.renderPreview();
          return;
        }

        this.createEditorView();
      });
    },
    createEditorView() {
      const parent = this.$refs.editorHost as HTMLElement | undefined;
      if (!parent || !this.content) return;

      const updateListener = EditorView.updateListener.of((update) => {
        if (!update.docChanged || this.internalUpdate) return;
        this.$emit("change-content", update.state.doc.toString());
      });

      this.editorView = new EditorView({
        parent,
        state: EditorState.create({
          doc: this.content.content,
          extensions: [
            this.cmTheme(),
            draftly({
              theme: this.draftlyTheme(),
              baseStyles: this.config.editor.baseStyles,
              plugins: getActivePlugins(this.config.plugins),
              markdown: [],
              extensions: [],
              keymap: [],
              disableViewPlugin: this.mode === "code",
              defaultKeybindings: this.config.editor.defaultKeybindings,
              history: this.config.editor.history,
              indentWithTab: this.config.editor.indentWithTab,
              highlightActiveLine: this.config.editor.highlightActiveLine,
              lineWrapping: this.config.editor.lineWrapping,
              slashCommands: {
                enabled: this.config.features.slashCommands,
              },
              toc: {
                enabled: this.mode === "live" && this.config.features.tableOfContents,
                storageKey: "draftly-vue2-playground:toc",
              },
              attachments: {
                enabled: this.config.features.attachments,
                uploader: this.config.features.attachments ? this.mockUploader : undefined,
                enablePaste: this.config.features.pasteDropUploads,
                enableDrop: this.config.features.pasteDropUploads,
                accept: {
                  image: ["image/*"],
                  video: ["video/*"],
                  audio: ["audio/*"],
                  file: ["*/*"],
                },
              },
              onNodesChange: (nodes: DraftlyNode[]) => {
                if (this.showNodes) {
                  this.$emit("nodes-change", nodes);
                }
              },
            }),
            updateListener,
          ],
        }),
      });
    },
    async renderPreview() {
      if (!this.content) return;
      const requestId = ++this.renderRequest;
      const startedAt = performance.now();
      const syntaxTheme = this.cmTheme();
      const plugins = getActivePlugins(this.config.plugins);

      const htmlOutput = await preview(this.content.content, {
        theme: this.draftlyTheme(),
        plugins,
        markdown: [],
        syntaxTheme,
        sanitize: this.config.preview.sanitize,
        wrapperTag: "div",
        wrapperClass: "draftly-preview vue2-preview",
      });

      const cssOutput = generateCSS({
        theme: this.draftlyTheme(),
        plugins,
        wrapperClass: "draftly-preview",
        includeBase: this.config.preview.includeBase,
        syntaxTheme,
      });

      if (requestId !== this.renderRequest) return;
      this.previewOutput = { html: htmlOutput, css: cssOutput };
      this.previewToc = extractPreviewTocFromMarkdown(this.content.content);
      this.$emit("output-change", {
        output: this.previewOutput,
        outputTime: performance.now() - startedAt,
      });

      this.$nextTick(() => {
        if (this.mode === "view") {
          this.updatePreviewStyles();
          this.syncPreviewTocActive();
        }
        if (this.mode === "output") {
          this.createOutputViews();
        }
      });
    },
    updatePreviewStyles() {
      const previewHost = this.$refs.previewHost as HTMLElement | undefined;
      if (!previewHost) return;

      if (!this.previewStyleElement) {
        this.previewStyleElement = document.createElement("style");
        previewHost.prepend(this.previewStyleElement);
      }

      this.previewStyleElement.textContent = this.previewOutput.css;
    },
    createOutputViews() {
      const htmlParent = this.$refs.htmlOutputHost as HTMLElement | undefined;
      const cssParent = this.$refs.cssOutputHost as HTMLElement | undefined;
      if (!htmlParent || !cssParent) return;

      if (this.htmlView) this.htmlView.destroy();
      if (this.cssView) this.cssView.destroy();

      this.htmlView = new EditorView({
        parent: htmlParent,
        state: EditorState.create({
          doc: this.previewOutput.html,
          extensions: [this.cmTheme(), html(), EditorView.lineWrapping, EditorState.readOnly.of(true)],
        }),
      });

      this.cssView = new EditorView({
        parent: cssParent,
        state: EditorState.create({
          doc: this.previewOutput.css,
          extensions: [this.cmTheme(), css(), EditorView.lineWrapping, EditorState.readOnly.of(true)],
        }),
      });
    },
    jumpPreviewToc(id: string) {
      const previewHost = this.$refs.previewHost as HTMLElement | undefined;
      const target = previewHost?.querySelector<HTMLElement>(`#${this.escapeCssIdentifier(id)}`);
      if (!previewHost || !target) return;

      previewHost.scrollTo({
        top: Math.max(0, target.offsetTop - 24),
        behavior: "smooth",
      });
      this.markPreviewTocActive(id);
    },
    syncPreviewTocActive() {
      const previewHost = this.$refs.previewHost as HTMLElement | undefined;
      if (!previewHost || this.previewToc.length === 0) return;

      let activeId = this.previewToc[0].id;
      for (const item of this.previewToc) {
        const target = previewHost.querySelector<HTMLElement>(`#${this.escapeCssIdentifier(item.id)}`);
        if (target && target.offsetTop - previewHost.scrollTop <= 40) {
          activeId = item.id;
        }
      }

      this.markPreviewTocActive(activeId);
    },
    markPreviewTocActive(activeId: string) {
      this.previewToc = this.previewToc.map((item) => ({
        ...item,
        active: item.id === activeId,
      }));
    },
    escapeCssIdentifier(value: string): string {
      if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(value);
      }
      return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    },
  },
});
</script>
