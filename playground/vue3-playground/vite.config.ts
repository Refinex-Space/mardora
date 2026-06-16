import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "markora/editor": fileURLToPath(new URL("../../packages/markora/dist/editor/index.js", import.meta.url)),
      "markora/preview": fileURLToPath(new URL("../../packages/markora/dist/preview/index.js", import.meta.url)),
      "markora/plugins": fileURLToPath(new URL("../../packages/markora/dist/plugins/index.js", import.meta.url)),
      markora: fileURLToPath(new URL("../../packages/markora/dist/index.js", import.meta.url)),
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
