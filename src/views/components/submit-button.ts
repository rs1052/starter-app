import { html } from "hono/html";

export function SubmitButton(label: string) {
  return html`<button type="submit">${label}</button>`;
}
