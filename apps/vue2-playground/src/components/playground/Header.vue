<template>
  <header class="playground-header">
    <div class="header-group">
      <button class="icon-button" type="button" title="Toggle documents" @click="$emit('toggle-sidebar')">
        {{ sidebarOpen ? "Hide" : "Docs" }}
      </button>
      <span class="brand">Draftly Vue2</span>
    </div>

    <div class="mode-switch" role="group" aria-label="Playground mode">
      <button
        v-for="item in modes"
        :key="item.value"
        type="button"
        class="button"
        :class="{ 'button-active': mode === item.value }"
        @click="$emit('change-mode', item.value)"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="header-group">
      <span class="save-status">{{ saveStatus }}</span>
      <button class="icon-button" type="button" title="Toggle developer panel" @click="$emit('toggle-devbar')">
        {{ devbarOpen ? "Hide" : "Dev" }}
      </button>
    </div>
  </header>
</template>

<script lang="ts">
import Vue from "vue";
import type { PlaygroundMode, SaveStatus } from "@/types";

export default Vue.extend({
  name: "PlaygroundHeader",
  props: {
    mode: {
      type: String as () => PlaygroundMode,
      required: true,
    },
    saveStatus: {
      type: String as () => SaveStatus,
      required: true,
    },
    sidebarOpen: {
      type: Boolean,
      required: true,
    },
    devbarOpen: {
      type: Boolean,
      required: true,
    },
  },
  data() {
    return {
      modes: [
        { value: "live" as PlaygroundMode, label: "Live" },
        { value: "view" as PlaygroundMode, label: "View" },
        { value: "code" as PlaygroundMode, label: "Code" },
        { value: "output" as PlaygroundMode, label: "Output" },
      ],
    };
  },
});
</script>
