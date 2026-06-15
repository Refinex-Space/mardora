<template>
  <form class="section" @submit.prevent="handleSubmit">
    <input v-model="title" class="field" type="text" placeholder="Document title" aria-label="Document title" />
    <button class="button" type="submit">Create</button>
  </form>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "CreateContentDialog",
  data() {
    return {
      title: "",
    };
  },
  methods: {
    handleSubmit() {
      const nextTitle = this.title.trim();
      if (!nextTitle) return;
      this.$emit("create", nextTitle);
      this.title = "";
    },
  },
});
</script>
