module.exports = {
  root: true,
  ignorePatterns: ["*.config.js", "vue.config.js", ".eslintrc.js"],
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  extends: ["plugin:vue/essential", "eslint:recommended", "@vue/typescript/recommended"],
  parserOptions: {
    ecmaVersion: 2021,
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-inferrable-types": "off",
  },
};
