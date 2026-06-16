<template>
  <span>
    <button :class="triggerClass" type="button" :title="triggerTitle" @click="open = true">
      {{ triggerLabel }}
    </button>

    <div v-if="open" class="dialog-backdrop" @click.self="close">
      <form class="dialog-card" @submit.prevent="handleSubmit">
        <div class="dialog-header">
          <h2 class="dialog-title">{{ $t("dialog.create.title") }}</h2>
          <p class="dialog-description">{{ $t("dialog.create.description") }}</p>
        </div>
        <input
          ref="titleInput"
          v-model="title"
          class="field"
          type="text"
          :placeholder="$t('dialog.create.placeholder')"
          aria-label="Content title"
          @keydown.esc="close"
        />
        <div class="dialog-actions">
          <button class="button button-secondary" type="button" @click="close">{{ $t("dialog.create.cancel") }}</button>
          <button class="button button-primary" type="submit" :disabled="!title.trim()">{{ $t("dialog.create.confirm") }}</button>
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
