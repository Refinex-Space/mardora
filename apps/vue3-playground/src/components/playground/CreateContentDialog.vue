<template>
  <span>
    <button :class="triggerClass" type="button" :title="triggerTitle" @click="open = true">
      {{ triggerLabel }}
    </button>

    <div v-if="open" class="dialog-backdrop" @click.self="close">
      <form class="dialog-card" @submit.prevent="handleSubmit">
        <div class="dialog-header">
          <h2 class="dialog-title">Create Content</h2>
          <p class="dialog-description">Enter a title for the new document.</p>
        </div>
        <input
          ref="titleInput"
          v-model="title"
          class="field"
          type="text"
          placeholder="Content title"
          aria-label="Content title"
          @keydown.esc="close"
        />
        <div class="dialog-actions">
          <button class="button button-secondary" type="button" @click="close">Cancel</button>
          <button class="button button-primary" type="submit" :disabled="!title.trim()">Create</button>
        </div>
      </form>
    </div>
  </span>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "CreateContentDialog",
  props: {
    triggerLabel: {
      type: String,
      default: "Create New",
    },
    triggerClass: {
      type: String,
      default: "button",
    },
    triggerTitle: {
      type: String,
      default: "Create content",
    },
  },
  data() {
    return {
      open: false,
      title: "",
    };
  },
  watch: {
    open(nextOpen: boolean) {
      if (!nextOpen) return;
      this.$nextTick(() => {
        const input = this.$refs.titleInput as HTMLInputElement | undefined;
        input?.focus();
      });
    },
  },
  methods: {
    close() {
      this.open = false;
      this.title = "";
    },
    handleSubmit() {
      const nextTitle = this.title.trim();
      if (!nextTitle) return;
      this.$emit("create", nextTitle);
      this.close();
    },
  },
});
</script>
