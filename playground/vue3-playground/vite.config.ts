import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "mardora/editor": fileURLToPath(new URL("../../packages/mardora/dist/editor/index.js", import.meta.url)),
      "mardora/preview": fileURLToPath(new URL("../../packages/mardora/dist/preview/index.js", import.meta.url)),
      "mardora/plugins": fileURLToPath(new URL("../../packages/mardora/dist/plugins/index.js", import.meta.url)),
      mardora: fileURLToPath(new URL("../../packages/mardora/dist/index.js", import.meta.url)),
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
