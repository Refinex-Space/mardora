<template>
  <aside class="panel-content">
    <section class="section">
      <h2 class="panel-title">Editor</h2>
      <label v-for="item in editorOptions" :key="item.key" class="toggle-row">
        <span>{{ item.label }}</span>
        <input
          type="checkbox"
          :checked="config.editor[item.key]"
          @change="updateEditorOption(item.key, $event)"
        />
      </label>
    </section>

    <section class="section">
      <h2 class="panel-title">Preview</h2>
      <label class="toggle-row">
        <span>Include base CSS</span>
        <input type="checkbox" :checked="config.preview.includeBase" @change="updatePreviewOption('includeBase', $event)" />
      </label>
      <label class="toggle-row">
        <span>Sanitize HTML</span>
        <input type="checkbox" :checked="config.preview.sanitize" @change="updatePreviewOption('sanitize', $event)" />
      </label>
    </section>

    <section class="section">
      <h2 class="panel-title">Plugins</h2>
      <label v-for="name in pluginNames" :key="name" class="toggle-row">
        <span>{{ name }}</span>
        <input type="checkbox" :checked="config.plugins[name]" @change="updatePlugin(name, $event)" />
      </label>
    </section>

    <section class="section">
      <h2 class="panel-title">AST</h2>
      <label class="toggle-row">
        <span>Show nodes</span>
        <input type="checkbox" :checked="showNodes" @change="updateShowNodes" />
      </label>
      <pre v-if="showNodes" class="node-list">{{ formattedNodes }}</pre>
    </section>

    <section class="section">
      <h2 class="panel-title">Output</h2>
      <span class="toggle-row">Render time <strong>{{ outputLabel }}</strong></span>
    </section>
  </aside>
</template>

<script lang="ts">
import Vue from "vue";
import type { DraftlyNode } from "draftly/editor";
import type { PlaygroundConfig } from "@/types";

type EditorOptionKey = keyof PlaygroundConfig["editor"];
type PreviewOptionKey = keyof PlaygroundConfig["preview"];

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
      type: Array as () => DraftlyNode[],
      required: true,
    },
    outputTime: {
      type: Number,
      default: null,
    },
  },
  data() {
    return {
      editorOptions: [
        { key: "baseStyles" as EditorOptionKey, label: "Base styles" },
        { key: "defaultKeybindings" as EditorOptionKey, label: "Default keybindings" },
        { key: "history" as EditorOptionKey, label: "History" },
        { key: "indentWithTab" as EditorOptionKey, label: "Indent with Tab" },
        { key: "highlightActiveLine" as EditorOptionKey, label: "Highlight active line" },
        { key: "lineWrapping" as EditorOptionKey, label: "Line wrapping" },
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
