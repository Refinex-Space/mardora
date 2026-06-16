const path = require("path");

module.exports = {
  lintOnSave: false,
  transpileDependencies: [
    /node_modules[\\/](@codemirror|@lezer|@mermaid-js|@iconify|markora|es-toolkit|marked|mermaid|node-emoji|style-mod|uuid)[\\/]/,
  ],
  configureWebpack: {
    resolve: {
      symlinks: true,
      alias: {
        "@": path.resolve(__dirname, "src"),
        "markora/editor": path.resolve(__dirname, "../../packages/markora/dist/editor/index.js"),
        "markora/plugins": path.resolve(__dirname, "../../packages/markora/dist/plugins/index.js"),
        "markora/preview": path.resolve(__dirname, "../../packages/markora/dist/preview/index.js"),
        markora: path.resolve(__dirname, "../../packages/markora/dist/index.js"),
        "@mermaid-js/parser": path.resolve(
          __dirname,
          "../../node_modules/.pnpm/@mermaid-js+parser@1.1.1/node_modules/@mermaid-js/parser/dist/mermaid-parser.core.mjs"
        ),
      },
    },
  },
};
