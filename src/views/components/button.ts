import { html } from "hono/html";

export function Button(label: string) {
  return html`<button type="submit">${label}</button>`;
}
