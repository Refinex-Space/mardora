<template>
  <aside class="panel-content">
    <div class="panel-heading">
      <h2 class="panel-title">{{ $t("sidebar.contents") }}</h2>
      <CreateContentDialog
        trigger-label="+"
        trigger-class="panel-action-button"
        :trigger-title="$t('sidebar.createContent')"
        @create="$emit('create-content', $event)"
      />
    </div>

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
        <span class="document-icon" aria-hidden="true">doc</span>
        <span class="document-title">{{ content.title }}</span>
        <div class="document-actions">
          <button class="row-icon-button" type="button" :title="$t('sidebar.rename')" @click.stop="renameContent(content.id, content.title)">
            edit
          </button>
          <button class="row-icon-button danger-action" type="button" :title="$t('sidebar.delete')" @click.stop="$emit('delete-content', content.id)">
            del
          </button>
        </div>
      </div>
      <div v-if="contents.length === 0" class="empty-list">
        <span>{{ $t("sidebar.noContents") }}</span>
        <CreateContentDialog
          :trigger-label="$t('sidebar.createContent')"
          trigger-class="button button-secondary"
          @create="$emit('create-content', $event)"
        />
      </div>
    </div>
  </aside>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import CreateContentDialog from "./CreateContentDialog.vue";
import type { Content } from "@/types";

export default defineComponent({
  name: "PlaygroundSidebar",
  components: {
    CreateContentDialog,
  },
  props: {
    contents: {
      type: Array as PropType<Content[]>,
      required: true,
    },
    currentContent: {
      type: Number,
      required: true,
    },
  },
  methods: {
    renameContent(id: string, currentTitle: string) {
      const nextTitle = window.prompt(this.$t("sidebar.renamePrompt"), currentTitle);
      if (!nextTitle || nextTitle.trim() === currentTitle) return;
      this.$emit("rename-content", { id, title: nextTitle.trim() });
    },
  },
});
</script>
