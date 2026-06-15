const path = require("path");

module.exports = {
  lintOnSave: false,
  transpileDependencies: [
    /node_modules[\\/](@codemirror|@lezer|@mermaid-js|@iconify|draftly|es-toolkit|marked|mermaid|node-emoji|style-mod|uuid)[\\/]/,
  ],
  configureWebpack: {
    resolve: {
      symlinks: true,
      alias: {
        "@": path.resolve(__dirname, "src"),
        "draftly/editor": path.resolve(__dirname, "../../packages/draftly/dist/editor/index.js"),
        "draftly/plugins": path.resolve(__dirname, "../../packages/draftly/dist/plugins/index.js"),
        "draftly/preview": path.resolve(__dirname, "../../packages/draftly/dist/preview/index.js"),
        draftly: path.resolve(__dirname, "../../packages/draftly/dist/index.js"),
        "@mermaid-js/parser": path.resolve(
          __dirname,
          "../../node_modules/.pnpm/@mermaid-js+parser@1.1.1/node_modules/@mermaid-js/parser/dist/mermaid-parser.core.mjs"
        ),
      },
    },
  },
};
