import { html } from "hono/html";

export function FeedbackMessage(
  message: string,
  kind: "error" | "status" = "status",
) {
  return html`<p
    class="message message-${kind}"
    role="${kind === "error" ? "alert" : "status"}"
  >
    ${message}
  </p>`;
}
