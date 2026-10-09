import { html } from "hono/html";
import { SubmitButton } from "../../components/submit-button.js";
import { FormField } from "../../components/form-field.js";
import { FeedbackMessage } from "../../components/feedback-message.js";

export function CredentialsPage(options: {
  email?: string;
  error?: string;
  success?: string;
  mode: "sign-in" | "sign-up";
}) {
  const signUp = options.mode === "sign-up";
  return html`<section class="narrow">
    <p class="eyebrow">${signUp ? "Get started" : "Welcome back"}</p>
    <h1>${signUp ? "Create your account" : "Sign in"}</h1>
    ${options.error ? FeedbackMessage(options.error, "error") : ""}
    ${options.success ? FeedbackMessage(options.success) : ""}
    <form method="post" action="/${options.mode}" class="stack">
      ${
        signUp
          ? FormField({
              name: "name",
              label: "Name",
              autocomplete: "name",
              maxLength: 100,
            })
          : ""
      }
      ${FormField({
        name: "email",
        label: "Email",
        type: "email",
        autocomplete: "email",
        maxLength: 254,
        value: options.email,
      })}
      ${FormField({
        name: "password",
        label: "Password",
        type: "password",
        autocomplete: signUp ? "new-password" : "current-password",
        maxLength: 128,
      })}
      ${SubmitButton(signUp ? "Create account" : "Sign in")}
    </form>
    <p>
      ${signUp ? "Already have an account?" : "Need an account?"}
      <a href="/${signUp ? "sign-in" : "sign-up"}"
        >${signUp ? "Sign in" : "Sign up"}</a
      >
    </p>
    ${
      signUp
        ? ""
        : html`<p><a href="/forgot-password">Forgot your password?</a></p>
            <p><a href="/verify-email">Resend verification email</a></p>`
    }
  </section>`;
}
