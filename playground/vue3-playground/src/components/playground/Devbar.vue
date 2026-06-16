<template>
  <aside class="devbar-content">
    <div class="devbar-title">{{ $t("devbar.title") }}</div>
    <div v-if="outputTime !== null" class="output-time">{{ $t("devbar.outputTime", { ms: outputLabel }) }}</div>

    <div class="accordion">
      <section class="accordion-item">
        <button class="accordion-trigger" type="button" @click="toggleSection('editor')">
          <span>{{ $t("devbar.editorOptions") }}</span>
          <span class="chevron" aria-hidden="true">{{ isOpen("editor") ? "^" : "v" }}</span>
        </button>
        <div v-if="isOpen('editor')" class="accordion-content">
          <label v-for="item in editorOptions" :key="item.key" class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">{{ $t(item.labelKey) }}</span>
              <span class="switch-description">{{ $t(item.descKey) }}</span>
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
          <span>{{ $t("devbar.previewOptions") }}</span>
          <span class="chevron" aria-hidden="true">{{ isOpen("preview") ? "^" : "v" }}</span>
        </button>
        <div v-if="isOpen('preview')" class="accordion-content">
          <label class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">{{ $t("opt.includeBase.label") }}</span>
              <span class="switch-description">{{ $t("opt.includeBase.desc") }}</span>
            </span>
            <input class="switch-input" type="checkbox" :checked="config.preview.includeBase" @change="updatePreviewOption('includeBase', $event)" />
            <span class="switch-control" aria-hidden="true" />
          </label>
          <label class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">{{ $t("opt.sanitize.label") }}</span>
              <span class="switch-description">{{ $t("opt.sanitize.desc") }}</span>
            </span>
            <input class="switch-input" type="checkbox" :checked="config.preview.sanitize" @change="updatePreviewOption('sanitize', $event)" />
            <span class="switch-control" aria-hidden="true" />
          </label>
          <div class="option-row">
            <span class="switch-copy">
              <span class="switch-label">{{ $t("devbar.contentWidth") }}</span>
              <span class="switch-description">{{ $t("devbar.contentWidthDesc") }}</span>
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
                {{ $t(item.labelKey) }}
              </button>
            </div>
          </div>
          <div class="option-row">
            <span class="switch-copy">
              <span class="switch-label">{{ $t("devbar.language") }}</span>
              <span class="switch-description">{{ $t("devbar.languageDesc") }}</span>
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
          <span>{{ $t("devbar.featureOptions") }}</span>
          <span class="chevron" aria-hidden="true">{{ isOpen("features") ? "^" : "v" }}</span>
        </button>
        <div v-if="isOpen('features')" class="accordion-content">
          <label v-for="item in featureOptions" :key="item.key" class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">{{ $t(item.labelKey) }}</span>
              <span class="switch-description">{{ $t(item.descKey) }}</span>
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
          <span>{{ $t("devbar.plugins") }}</span>
          <span class="chevron" aria-hidden="true">{{ isOpen("plugins") ? "^" : "v" }}</span>
        </button>
        <div v-if="isOpen('plugins')" class="accordion-content">
          <label v-for="name in pluginNames" :key="name" class="switch-row">
            <span class="switch-copy">
              <span class="switch-label">{{ name }}</span>
              <span class="switch-description">{{ $t("opt.plugin.desc", { name }) }}</span>
            </span>
            <input class="switch-input" type="checkbox" :checked="config.plugins[name]" @change="updatePlugin(name, $event)" />
            <span class="switch-control" aria-hidden="true" />
          </label>
        </div>
      </section>

      <section class="accordion-item nodes-section" :class="{ 'nodes-section-open': isOpen('nodes') }">
        <button class="accordion-trigger" type="button" @click="toggleNodes">
          <span>{{ $t("devbar.nodes") }} <small>{{ $t("devbar.nodesHint") }}</small></span>
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
import { defineComponent, type PropType } from "vue";
import type { MarkoraNode } from "markora/editor";
import type { PlaygroundConfig, PlaygroundLocale, PreviewContentWidth } from "@/types";

type EditorOptionKey = keyof PlaygroundConfig["editor"];
type PreviewOptionKey = "includeBase" | "sanitize";
type FeatureOptionKey = keyof PlaygroundConfig["features"];

function cloneConfig(config: PlaygroundConfig): PlaygroundConfig {
  return JSON.parse(JSON.stringify(config)) as PlaygroundConfig;
}

export default defineComponent({
  name: "PlaygroundDevbar",
  props: {
    config: {
      type: Object as PropType<PlaygroundConfig>,
      required: true,
    },
    showNodes: {
      type: Boolean,
      required: true,
    },
    nodes: {
      type: Array as PropType<MarkoraNode[]>,
      required: true,
    },
    outputTime: {
      type: Number as PropType<number | null>,
      default: null,
    },
  },
  data() {
    return {
      openSections: ["editor", "preview"] as string[],
      editorOptions: [
        { key: "baseStyles" as EditorOptionKey, labelKey: "opt.baseStyles.label" as const, descKey: "opt.baseStyles.desc" as const },
        { key: "defaultKeybindings" as EditorOptionKey, labelKey: "opt.defaultKeybindings.label" as const, descKey: "opt.defaultKeybindings.desc" as const },
        { key: "history" as EditorOptionKey, labelKey: "opt.history.label" as const, descKey: "opt.history.desc" as const },
        { key: "indentWithTab" as EditorOptionKey, labelKey: "opt.indentWithTab.label" as const, descKey: "opt.indentWithTab.desc" as const },
        { key: "highlightActiveLine" as EditorOptionKey, labelKey: "opt.highlightActiveLine.label" as const, descKey: "opt.highlightActiveLine.desc" as const },
        { key: "lineWrapping" as EditorOptionKey, labelKey: "opt.lineWrapping.label" as const, descKey: "opt.lineWrapping.desc" as const },
      ],
      featureOptions: [
        { key: "slashCommands" as FeatureOptionKey, labelKey: "opt.slashCommands.label" as const, descKey: "opt.slashCommands.desc" as const },
        { key: "attachments" as FeatureOptionKey, labelKey: "opt.attachments.label" as const, descKey: "opt.attachments.desc" as const },
        { key: "pasteDropUploads" as FeatureOptionKey, labelKey: "opt.pasteDropUploads.label" as const, descKey: "opt.pasteDropUploads.desc" as const },
        { key: "tableOfContents" as FeatureOptionKey, labelKey: "opt.tableOfContents.label" as const, descKey: "opt.tableOfContents.desc" as const },
      ],
      contentWidthOptions: [
        { value: "regular" as PreviewContentWidth, labelKey: "devbar.contentWidthRegular" as const },
        { value: "wide" as PreviewContentWidth, labelKey: "devbar.contentWidthWide" as const },
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
