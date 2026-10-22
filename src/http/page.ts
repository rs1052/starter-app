import type { Context } from "hono";
import { defineHead } from "void";
import type { AppEnv } from "../app-types.js";
import { applicationHandler } from "./handler.js";

export interface PageData {
  title: string;
  [key: string]: unknown;
}

type PageHandler = (c: Context<AppEnv>) => Response | Promise<Response>;

// Handlers prepare data once. Native Pages renders it; the in-process test
// harness exposes the same data as JSON, not a second rendering implementation.
export function renderPage(
  c: Context<AppEnv>,
  title: string,
  props: Record<string, unknown>,
  status: 200 | 400 | 404 = 200,
) {
  const data = { ...props, title };
  c.set("pageData", data);
  c.set("pageStatus", status === 200 ? undefined : status);
  return c.json(data, status);
}

export function pageLoader(handler: PageHandler) {
  return applicationHandler(async (c) => {
    if (c.get("pageData")) return c.get("pageData")!;
    const response = await handler(c);
    return c.get("pageData") ?? response;
  });
}

export function pageAction(handler: PageHandler) {
  return applicationHandler(async (c) => {
    const response = await handler(c);
    // Returning nothing asks Void to rerun the loader and render its page.
    if (!c.get("pageData")) return response;
  });
}

export const pageHead = defineHead<PageData>((_c, props) => ({
  title: props.title,
}));
