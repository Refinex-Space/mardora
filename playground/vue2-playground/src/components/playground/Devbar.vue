<template>
  <aside class="devbar-content">
    <div class="devbar-title">Developer Panel</div>
    <div v-if="outputTime !== null" class="output-time">Output generated in {{ outputLabel }}</div>

    <div class="accordion">
      <section class="accordion-item">
        <button class="accordion-trigger" type="button" @click="toggleSection('editor')">
          <span>Editor Options</span>
          <span class="chevron" aria-hidden="true">{{ isOpen("editor") ? "^" : "v" }}</span>
        </button>
        <div v-if="isOpen('editor')" class="accordion-content">
          <label v-for="item in editorOptions" :key="item.key" class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">{{ item.label }}</span>
              <span class="switch-description">{{ item.description }}</span>
            </span>
            <input
              class="switch-input"
              type="checkbox"
              :checked="config.editor[item.key]"
              @change="updateEditorOption(item.key, $event)"
            />
            <span class="switch-control" aria-hidden="true" />
          </label>
        </div>
      </section>

      <section class="accordion-item">
        <button class="accordion-trigger" type="button" @click="toggleSection('preview')">
          <span>Preview Options</span>
          <span class="chevron" aria-hidden="true">{{ isOpen("preview") ? "^" : "v" }}</span>
        </button>
        <div v-if="isOpen('preview')" class="accordion-content">
          <label class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">Include Base CSS</span>
              <span class="switch-description">Include base preview styles</span>
            </span>
            <input class="switch-input" type="checkbox" :checked="config.preview.includeBase" @change="updatePreviewOption('includeBase', $event)" />
            <span class="switch-control" aria-hidden="true" />
          </label>
          <label class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">Sanitize HTML</span>
              <span class="switch-description">Sanitize HTML output for security</span>
            </span>
            <input class="switch-input" type="checkbox" :checked="config.preview.sanitize" @change="updatePreviewOption('sanitize', $event)" />
            <span class="switch-control" aria-hidden="true" />
          </label>
          <div class="option-row">
            <span class="switch-copy">
              <span class="switch-label">Content Width</span>
              <span class="switch-description">Adjust Live and View content width</span>
            </span>
            <div class="segmented-control" role="group" aria-label="Content width">
              <button
                v-for="item in contentWidthOptions"
                :key="item.value"
                type="button"
                class="segmented-control-button"
                :class="{ 'segmented-control-button-active': config.preview.contentWidth === item.value }"
                @click="updateContentWidth(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
          <div class="option-row">
            <span class="switch-copy">
              <span class="switch-label">Language</span>
              <span class="switch-description">Adjust Markora-owned editor UI text</span>
            </span>
            <div class="segmented-control" role="group" aria-label="Language">
              <button
                v-for="item in localeOptions"
                :key="item.value"
                type="button"
                class="segmented-control-button"
                :class="{ 'segmented-control-button-active': config.locale === item.value }"
                @click="updateLocale(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="accordion-item">
        <button class="accordion-trigger" type="button" @click="toggleSection('features')">
          <span>Feature Options</span>
          <span class="chevron" aria-hidden="true">{{ isOpen("features") ? "^" : "v" }}</span>
        </button>
        <div v-if="isOpen('features')" class="accordion-content">
          <label v-for="item in featureOptions" :key="item.key" class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">{{ item.label }}</span>
              <span class="switch-description">{{ item.description }}</span>
            </span>
            <input
              class="switch-input"
              type="checkbox"
              :checked="config.features[item.key]"
              @change="updateFeatureOption(item.key, $event)"
            />
            <span class="switch-control" aria-hidden="true" />
          </label>
        </div>
      </section>

      <section class="accordion-item">
        <button class="accordion-trigger" type="button" @click="toggleSection('plugins')">
          <span>Plugins</span>
          <span class="chevron" aria-hidden="true">{{ isOpen("plugins") ? "^" : "v" }}</span>
        </button>
        <div v-if="isOpen('plugins')" class="accordion-content">
          <label v-for="name in pluginNames" :key="name" class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">{{ name }}</span>
              <span class="switch-description">Enable {{ name }} plugin</span>
            </span>
            <input class="switch-input" type="checkbox" :checked="config.plugins[name]" @change="updatePlugin(name, $event)" />
            <span class="switch-control" aria-hidden="true" />
          </label>
        </div>
      </section>

      <section class="accordion-item nodes-section" :class="{ 'nodes-section-open': isOpen('nodes') }">
        <button class="accordion-trigger" type="button" @click="toggleNodes">
          <span>Nodes <small>(Hide for performance)</small></span>
          <span class="chevron" aria-hidden="true">{{ isOpen("nodes") ? "^" : "v" }}</span>
        </button>
        <div v-if="isOpen('nodes')" class="accordion-content node-content">
          <pre class="node-list">{{ formattedNodes }}</pre>
        </div>
      </section>
    </div>
  </aside>
</template>

<script lang="ts">
import Vue from "vue";
import type { MarkoraNode } from "markora/editor";
import type { PlaygroundConfig, PlaygroundLocale, PreviewContentWidth } from "@/types";

type EditorOptionKey = keyof PlaygroundConfig["editor"];
type PreviewOptionKey = "includeBase" | "sanitize";
type FeatureOptionKey = keyof PlaygroundConfig["features"];

function cloneConfig(config: PlaygroundConfig): PlaygroundConfig {
  return JSON.parse(JSON.stringify(config)) as PlaygroundConfig;
}

export default Vue.extend({
  name: "PlaygroundDevbar",
  props: {
    config: {
      type: Object as () => PlaygroundConfig,
      required: true,
    },
    showNodes: {
      type: Boolean,
      required: true,
    },
    nodes: {
      type: Array as () => MarkoraNode[],
      required: true,
    },
    outputTime: {
      type: Number,
      default: null,
    },
  },
  data() {
    return {
      openSections: ["editor", "preview"] as string[],
      editorOptions: [
        { key: "baseStyles" as EditorOptionKey, label: "Base Styles", description: "Include default editor styles" },
        { key: "defaultKeybindings" as EditorOptionKey, label: "Default Keybindings", description: "Enable standard keyboard shortcuts" },
        { key: "history" as EditorOptionKey, label: "History", description: "Enable undo/redo support" },
        { key: "indentWithTab" as EditorOptionKey, label: "Indent with Tab", description: "Use Tab key for indentation" },
        { key: "highlightActiveLine" as EditorOptionKey, label: "Highlight Active Line", description: "Highlight the current line" },
        { key: "lineWrapping" as EditorOptionKey, label: "Line Wrapping", description: "Wrap long lines" },
      ],
      featureOptions: [
        { key: "slashCommands" as FeatureOptionKey, label: "Slash Commands", description: "Open the command menu with line-start slash input" },
        { key: "attachments" as FeatureOptionKey, label: "Attachments", description: "Enable local file selection through media commands" },
        { key: "pasteDropUploads" as FeatureOptionKey, label: "Paste/Drop Uploads", description: "Upload pasted or dropped files with the mock uploader" },
        { key: "tableOfContents" as FeatureOptionKey, label: "Table of Contents", description: "Show the built-in right-side document outline" },
      ],
      contentWidthOptions: [
        { value: "regular" as PreviewContentWidth, label: "Regular" },
        { value: "wide" as PreviewContentWidth, label: "Wide" },
      ],
      localeOptions: [
        { value: "zh-CN" as PlaygroundLocale, label: "中文" },
        { value: "en-US" as PlaygroundLocale, label: "English" },
      ],
    };
  },
  computed: {
    pluginNames(): string[] {
      return Object.keys(this.config.plugins);
    },
    formattedNodes(): string {
      return JSON.stringify(this.nodes, null, 2);
    },
    outputLabel(): string {
      return typeof this.outputTime === "number" ? `${this.outputTime.toFixed(1)}ms` : "n/a";
    },
  },
  methods: {
    isOpen(section: string): boolean {
      return this.openSections.includes(section);
    },
    toggleSection(section: string) {
      this.openSections = this.isOpen(section)
        ? this.openSections.filter((item) => item !== section)
        : [...this.openSections, section];
    },
    toggleNodes() {
      if (this.isOpen("nodes")) {
        this.openSections = this.openSections.filter((item) => item !== "nodes");
        this.$emit("update-show-nodes", false);
      } else {
        this.openSections = ["nodes"];
        this.$emit("update-show-nodes", true);
      }
    },
    eventChecked(event: Event): boolean {
      return (event.target as HTMLInputElement).checked;
    },
    updateEditorOption(key: EditorOptionKey, event: Event) {
      const nextConfig = cloneConfig(this.config);
      nextConfig.editor[key] = this.eventChecked(event);
      this.$emit("update-config", nextConfig);
    },
    updatePreviewOption(key: PreviewOptionKey, event: Event) {
      const nextConfig = cloneConfig(this.config);
      nextConfig.preview[key] = this.eventChecked(event);
      this.$emit("update-config", nextConfig);
    },
    updateContentWidth(value: PreviewContentWidth) {
      const nextConfig = cloneConfig(this.config);
      nextConfig.preview.contentWidth = value;
      this.$emit("update-config", nextConfig);
    },
    updateLocale(value: PlaygroundLocale) {
      const nextConfig = cloneConfig(this.config);
      nextConfig.locale = value;
      this.$emit("update-config", nextConfig);
    },
    updateFeatureOption(key: FeatureOptionKey, event: Event) {
      const nextConfig = cloneConfig(this.config);
      nextConfig.features[key] = this.eventChecked(event);
      this.$emit("update-config", nextConfig);
    },
    updatePlugin(name: string, event: Event) {
      const nextConfig = cloneConfig(this.config);
      nextConfig.plugins[name] = this.eventChecked(event);
      this.$emit("update-config", nextConfig);
    },
    updateShowNodes(event: Event) {
      this.$emit("update-show-nodes", this.eventChecked(event));
    },
  },
});
</script>
