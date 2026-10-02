import Alpine from "@alpinejs/csp";
import htmx from "htmx.org";
import "../css/app.css";

declare global {
  interface Window {
    Alpine: typeof Alpine;
    htmx: typeof htmx;
  }
}

window.Alpine = Alpine;
window.htmx = htmx;
Alpine.start();
