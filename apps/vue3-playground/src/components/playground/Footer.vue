<template>
  <footer class="footer-bar">
    <span />
    <div class="footer-metrics">
      <span>Words: {{ metrics.words }}</span>
      <span class="metric-separator">.</span>
      <span>Lines: {{ metrics.lines }}</span>
      <span class="metric-separator">.</span>
      <span>Char: {{ metrics.chars }}</span>
    </div>
  </footer>
</template>

<script lang="ts">
import { defineComponent, type PropType } from "vue";
import type { ContentMetrics } from "@/types";

export default defineComponent({
  name: "PlaygroundFooter",
  props: {
    metrics: {
      type: Object as PropType<ContentMetrics>,
      required: true,
    },
  },
});
</script>
