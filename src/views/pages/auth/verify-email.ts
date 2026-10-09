import { html } from "hono/html";
import { FeedbackMessage } from "../../components/feedback-message.js";
import { FormField } from "../../components/form-field.js";
import { SubmitButton } from "../../components/submit-button.js";

export function VerifyEmailPage(
  options: { email?: string; error?: string; sent?: boolean } = {},
) {
  return html`<section class="narrow">
    <h1>${options.sent ? "Check your email" : "Resend verification email"}</h1>
    ${
      options.sent
        ? FeedbackMessage(
            "If this address belongs to an account that needs verification, check your email for a verification link.",
          )
        : html`<p>
            Request a new link if your verification email is missing or expired.
          </p>`
    }
    ${options.error ? FeedbackMessage(options.error, "error") : ""}
    <form method="post" action="/verify-email" class="stack">
      ${FormField({
        name: "email",
        label: "Email",
        type: "email",
        autocomplete: "email",
        maxLength: 254,
        value: options.email,
      })}
      ${SubmitButton("Send verification link")}
    </form>
    <p><a href="/sign-in">Return to sign in</a></p>
  </section>`;
}
