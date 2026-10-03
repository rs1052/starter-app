import { html } from "hono/html";
import { SubmitButton } from "../components/submit-button.js";

export function ExampleStatus(updated = false) {
  return html`<div id="server-status" class="example-result" aria-live="polite">
    ${
      updated
        ? "The server rendered a fresh fragment."
        : "The initial fragment came with the page."
    }
  </div>`;
}

export function ExamplesPage(updated = false) {
  return html`<section>
    <p class="eyebrow">Progressive enhancement</p>
    <h1>Small browser interactions</h1>
    <div class="example-grid">
      <article>
        <h2>HTMX server fragment</h2>
        <p>
          The form works as an ordinary request when JavaScript is unavailable.
        </p>
        ${ExampleStatus(updated)}
        <form
          method="post"
          action="/examples/refresh"
          hx-post="/examples/refresh"
          hx-target="#server-status"
          hx-swap="outerHTML"
        >
          ${SubmitButton("Refresh from server")}
        </form>
      </article>
      <article x-data="{ open: false }">
        <h2>Alpine disclosure</h2>
        <button
          type="button"
          x-on:click="open = !open"
          x-bind:aria-expanded="open.toString()"
          aria-controls="disclosure-panel"
        >
          Toggle details
        </button>
        <div id="disclosure-panel" x-show="open" hidden x-bind:hidden="!open">
          <p>This state stays entirely in the browser.</p>
        </div>
      </article>
    </div>
  </section>`;
}
