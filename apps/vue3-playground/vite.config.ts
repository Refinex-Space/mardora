import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "draftly/editor": fileURLToPath(new URL("../../packages/draftly/dist/editor/index.js", import.meta.url)),
      "draftly/preview": fileURLToPath(new URL("../../packages/draftly/dist/preview/index.js", import.meta.url)),
      "draftly/plugins": fileURLToPath(new URL("../../packages/draftly/dist/plugins/index.js", import.meta.url)),
      draftly: fileURLToPath(new URL("../../packages/draftly/dist/index.js", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3003,
  },
  preview: {
    host: "0.0.0.0",
    port: 3003,
  },
});
