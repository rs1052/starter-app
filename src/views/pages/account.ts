import { html } from "hono/html";
import { SubmitButton } from "../components/submit-button.js";
import { FormField } from "../components/form-field.js";
import { FeedbackMessage } from "../components/feedback-message.js";

export function AccountPage(
  user: { email: string; name: string },
  options: { error?: string; success?: boolean } = {},
) {
  return html`<section class="narrow">
    <p class="eyebrow">Protected page</p>
    <h1>Your account</h1>
    <dl class="account-details">
      <div>
        <dt>Name</dt>
        <dd>${user.name}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>${user.email}</dd>
      </div>
    </dl>
    <form method="post" action="/account/password" class="stack">
      <h2>Change password</h2>
      ${options.error ? FeedbackMessage(options.error, "error") : ""}
      ${
        options.success
          ? FeedbackMessage(
              "Your password has been changed. Other sessions have been signed out.",
            )
          : ""
      }
      ${FormField({
        name: "currentPassword",
        label: "Current password",
        type: "password",
        autocomplete: "current-password",
        maxLength: 128,
      })}
      ${FormField({
        name: "newPassword",
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
      ${SubmitButton("Change password")}
    </form>
    <form method="post" action="/sign-out">${SubmitButton("Sign out")}</form>
  </section>`;
}
