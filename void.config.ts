import { defineConfig } from "void/config";

export default defineConfig({
  head: {
    titleTemplate: "%s | Hono starter",
    htmlAttrs: { lang: "en" },
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { name: "theme-color", content: "#0f172a" },
    ],
    link: [
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
  },
  worker: { compatibility_date: "2026-09-27" },
  cloudflare: {
    name: "hono-dual-runtime-starter",
    send_email: [{ name: "EMAIL" }],
    d1_databases: [
      {
        binding: "DB",
        database_name: "hono-dual-runtime-starter",
        database_id: "replace-with-your-d1-database-id",
        migrations_dir: "drizzle",
      },
    ],
    ratelimits: [
      {
        name: "AUTH_RATE_LIMITER",
        namespace_id: "1001",
        simple: { limit: 5, period: 60 },
      },
    ],
    observability: { enabled: true },
  },
});
