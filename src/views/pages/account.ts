import { html } from "hono/html";
import { Button } from "../components/button.js";

export function AccountPage(user: { email: string; name: string }) {
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
    <form method="post" action="/sign-out">${Button("Sign out")}</form>
  </section>`;
}
