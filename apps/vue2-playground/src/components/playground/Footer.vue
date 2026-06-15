<template>
  <footer class="footer-bar">
    <span>Draftly Vue2 Playground</span>
    <div class="footer-metrics">
      <span>{{ metrics.words }} words</span>
      <span>{{ metrics.lines }} lines</span>
      <span>{{ metrics.chars }} chars</span>
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
