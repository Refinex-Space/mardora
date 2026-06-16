<template>
  <aside class="panel-content">
    <div class="document-list">
      <div
        v-for="(content, index) in contents"
        :key="content.id"
        class="document-item"
        :class="{ 'document-item-active': currentContent === index }"
        role="option"
        :aria-selected="currentContent === index"
        @click="$emit('select-content', index)"
      >
        <span class="doc-file-icon" aria-hidden="true" v-html="fileTextIcon" />
        <span class="document-title">{{ content.title }}</span>
      </div>
    </div>
  </aside>
</template>

<script lang="ts">
import Vue from "vue";
import type { Content } from "@/types";

const FILE_TEXT_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>';

export default Vue.extend({
  name: "PlaygroundSidebar",
  props: {
    contents: {
      type: Array as () => Content[],
      required: true,
    },
    currentContent: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      fileTextIcon: FILE_TEXT_ICON,
    };
  },
});
</script>
