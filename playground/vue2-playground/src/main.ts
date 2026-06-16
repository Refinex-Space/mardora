import Vue from "vue";
import App from "./App.vue";
import { initI18n, installI18n } from "./i18n";
import "./styles.css";

Vue.config.productionTip = false;

initI18n();
installI18n();

new Vue({
  render: (h) => h(App),
}).$mount("#app");
