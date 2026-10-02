import type { Context } from "hono";
import type { HtmlEscapedString } from "hono/utils/html";
import type { AppEnv } from "../app-types.js";
import { AppLayout, type Assets } from "../views/layouts/app.js";

export function page(
  c: Context<AppEnv>,
  assets: Assets,
  title: string,
  content: HtmlEscapedString | Promise<HtmlEscapedString>,
  status: 200 | 400 | 404 = 200,
) {
  return c.html(
    AppLayout({
      assets,
      children: content,
      signedIn: Boolean(c.get("session")),
      title,
    }),
    status,
  );
}
