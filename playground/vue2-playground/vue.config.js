const path = require("path");

module.exports = {
  lintOnSave: false,
  transpileDependencies: [
    /node_modules[\\/](@codemirror|@lezer|@mermaid-js|@chevrotain|@iconify|markora|chevrotain|chevrotain-allstar|langium|vscode-languageserver|vscode-languageserver-textdocument|vscode-uri|es-toolkit|marked|mermaid|node-emoji|style-mod|uuid)[\\/]/,
  ],
  configureWebpack: {
    resolve: {
      symlinks: true,
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@refinex/markora/editor": path.resolve(__dirname, "../../packages/markora/dist/editor/index.js"),
        "@refinex/markora/plugins": path.resolve(__dirname, "../../packages/markora/dist/plugins/index.js"),
        "@refinex/markora/preview": path.resolve(__dirname, "../../packages/markora/dist/preview/index.js"),
        markora: path.resolve(__dirname, "../../packages/markora/dist/index.js"),
        "@mermaid-js/parser$": path.resolve(
          __dirname,
          "../../node_modules/@mermaid-js/parser/dist/mermaid-parser.core.mjs"
        ),
        langium$: path.resolve(__dirname, "../../node_modules/langium/lib/index.js"),
        chevrotain$: path.resolve(__dirname, "../../node_modules/chevrotain/lib/src/api.js"),
        "chevrotain-allstar$": path.resolve(__dirname, "../../node_modules/chevrotain-allstar/lib/index.js"),
        "@chevrotain/regexp-to-ast$": path.resolve(
          __dirname,
          "../../node_modules/@chevrotain/regexp-to-ast/lib/src/api.js"
        ),
        "@chevrotain/cst-dts-gen$": path.resolve(
          __dirname,
          "../../node_modules/@chevrotain/cst-dts-gen/lib/src/api.js"
        ),
        "@chevrotain/gast$": path.resolve(__dirname, "../../node_modules/@chevrotain/gast/lib/src/api.js"),
        "@chevrotain/utils$": path.resolve(__dirname, "../../node_modules/@chevrotain/utils/lib/src/api.js"),
      },
    },
  },
};
