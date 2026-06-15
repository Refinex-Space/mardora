<template>
  <aside class="panel-content">
    <div class="section">
      <h2 class="panel-title">Documents</h2>
      <CreateContentDialog @create="$emit('create-content', $event)" />
    </div>

    <div class="document-list">
      <div
        v-for="(content, index) in contents"
        :key="content.id"
        class="document-item"
        :class="{ 'document-item-active': currentContent === index }"
      >
        <button class="button document-title" type="button" @click="$emit('select-content', index)">
          {{ content.title }}
        </button>
        <button class="icon-button" type="button" title="Rename" @click="renameContent(content.id, content.title)">
          Edit
        </button>
        <button class="icon-button button-danger" type="button" title="Delete" @click="$emit('delete-content', content.id)">
          Del
        </button>
      </div>
    </div>
  </aside>
</template>

<script lang="ts">
import Vue from "vue";
import CreateContentDialog from "./CreateContentDialog.vue";
import type { Content } from "@/types";

export default Vue.extend({
  name: "PlaygroundSidebar",
  components: {
    CreateContentDialog,
  },
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
  methods: {
    renameContent(id: string, currentTitle: string) {
      const nextTitle = window.prompt("Rename document", currentTitle);
      if (!nextTitle || nextTitle.trim() === currentTitle) return;
      this.$emit("rename-content", { id, title: nextTitle.trim() });
    },
  },
});
</script>
