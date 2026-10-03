import { html } from "hono/html";
import type { HtmlEscapedString } from "hono/utils/html";

export interface PageAssetPaths {
  css: string;
  script: string;
}

export function AppLayout(options: {
  assets: PageAssetPaths;
  children: HtmlEscapedString | Promise<HtmlEscapedString>;
  signedIn: boolean;
  title: string;
}) {
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <title>${options.title} | Hono starter</title>
        <link rel="stylesheet" href="${options.assets.css}" />
        <script type="module" src="${options.assets.script}"></script>
      </head>
      <body>
        ${Header(options.signedIn)}
        <main id="main" class="shell">${options.children}</main>
      </body>
    </html>`;
}

function Header(signedIn: boolean) {
  return html`<header class="site-header">
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="shell header-inner">
      <a class="brand" href="/">Hono starter</a>
      ${Navigation(signedIn)}
    </div>
  </header>`;
}

function Navigation(signedIn: boolean) {
  return html`<nav aria-label="Primary">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/examples">Examples</a></li>
      ${
        signedIn
          ? html`<li><a href="/account">Account</a></li>`
          : html`<li><a href="/sign-in">Sign in</a></li>
              <li><a href="/sign-up">Sign up</a></li>`
      }
    </ul>
  </nav>`;
}
