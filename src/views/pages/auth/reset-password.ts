import { html } from "hono/html";
import { SubmitButton } from "../../components/submit-button.js";
import { FormField } from "../../components/form-field.js";
import { FeedbackMessage } from "../../components/feedback-message.js";

export function ResetPasswordPage(options: {
  error?: string;
  success?: boolean;
  token: string;
}) {
  if (options.success) {
    return html`<section class="narrow">
      <p class="eyebrow">Password updated</p>
      <h1>Your password has been reset</h1>
      ${FeedbackMessage("You can now sign in with your new password.")}
      <p><a href="/sign-in">Sign in</a></p>
    </section>`;
  }

  return html`<section class="narrow">
    <p class="eyebrow">Account recovery</p>
    <h1>Choose a new password</h1>
    ${options.error ? FeedbackMessage(options.error, "error") : ""}
    ${
      options.token
        ? html`<form method="post" action="/reset-password" class="stack">
            <input type="hidden" name="token" value="${options.token}" />
            ${FormField({
              name: "password",
              label: "New password",
              type: "password",
              autocomplete: "new-password",
              maxLength: 128,
            })}
            ${FormField({
              name: "passwordConfirmation",
              label: "Confirm new password",
              type: "password",
              autocomplete: "new-password",
              maxLength: 128,
            })}
            ${SubmitButton("Reset password")}
          </form>`
        : html`<p><a href="/forgot-password">Request a new reset link</a></p>`
    }
  </section>`;
}
