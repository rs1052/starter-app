import { html } from "hono/html";

export function HomePage() {
  return html`<section class="hero">
      <p class="eyebrow">A small, production-minded foundation</p>
      <h1>Build server-rendered Hono applications.</h1>
      <p class="lede">
        Use Node and SQLite locally, then deploy the same application to
        Cloudflare Workers and D1.
      </p>
      <p class="actions">
        <a class="button" href="/sign-up">Create an account</a>
        <a href="/examples">View examples</a>
      </p>
    </section>
    <section aria-labelledby="included-heading">
      <h2 id="included-heading">Included by design</h2>
      <ul class="feature-grid">
        <li>
          <strong>Shared application</strong
          ><span>Runtime details stay at the edge.</span>
        </li>
        <li>
          <strong>Server authentication</strong
          ><span>Sessions are checked on every protected request.</span>
        </li>
        <li>
          <strong>Progressive enhancement</strong
          ><span>HTML remains the reliable baseline.</span>
        </li>
      </ul>
    </section>`;
}
