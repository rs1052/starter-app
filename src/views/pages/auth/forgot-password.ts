import { html } from "hono/html";
import { SubmitButton } from "../../components/submit-button.js";
import { FormField } from "../../components/form-field.js";
import { FeedbackMessage } from "../../components/feedback-message.js";

export function ForgotPasswordPage(
  options: {
    email?: string;
    error?: string;
    sent?: boolean;
  } = {},
) {
  if (options.sent) {
    return html`<section class="narrow">
      <p class="eyebrow">Check your email</p>
      <h1>Reset link requested</h1>
      ${FeedbackMessage(
        "If an account exists for that email, a password reset link is on its way.",
      )}
      <p><a href="/sign-in">Return to sign in</a></p>
    </section>`;
  }

  return html`<section class="narrow">
    <p class="eyebrow">Account recovery</p>
    <h1>Forgot your password?</h1>
    <p>Enter your email and we will send you a reset link.</p>
    ${options.error ? FeedbackMessage(options.error, "error") : ""}
    <form method="post" action="/forgot-password" class="stack">
      ${FormField({
        name: "email",
        label: "Email",
        type: "email",
        autocomplete: "email",
        maxLength: 254,
        value: options.email,
      })}
      ${SubmitButton("Send reset link")}
    </form>
    <p><a href="/sign-in">Return to sign in</a></p>
  </section>`;
}
