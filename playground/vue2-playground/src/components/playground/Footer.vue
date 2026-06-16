<template>
  <footer class="footer-bar">
    <span />
    <div class="footer-metrics">
      <span>{{ $t("footer.words") }}: {{ metrics.words }}</span>
      <span class="metric-separator">.</span>
      <span>{{ $t("footer.lines") }}: {{ metrics.lines }}</span>
      <span class="metric-separator">.</span>
      <span>{{ $t("footer.chars") }}: {{ metrics.chars }}</span>
    </div>
  </footer>
</template>

<script lang="ts">
import Vue from "vue";
import type { ContentMetrics } from "@/types";

export default Vue.extend({
  name: "PlaygroundFooter",
  props: {
    metrics: {
      type: Object as () => ContentMetrics,
      required: true,
    },
  },
});
</script>
