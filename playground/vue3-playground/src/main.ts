import { createApp } from "vue";
import App from "./App.vue";
import { initI18n, installI18n } from "./i18n";
import "./styles.css";

initI18n();

const app = createApp(App);
installI18n(app);
app.mount("#app");
