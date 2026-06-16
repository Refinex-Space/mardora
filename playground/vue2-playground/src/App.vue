<template>
  <Playground />
</template>

<script lang="ts">
import Vue from "vue";
import Playground from "./components/playground/Playground.vue";

export default Vue.extend({
  name: "App",
  components: {
    Playground,
  },
});
</script>
