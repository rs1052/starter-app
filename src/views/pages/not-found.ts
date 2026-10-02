import { html } from "hono/html";

export function NotFoundPage() {
  return html`<section class="narrow">
    <p class="eyebrow">404</p>
    <h1>Page not found</h1>
    <p>The requested page does not exist.</p>
    <a href="/">Return home</a>
  </section>`;
}
