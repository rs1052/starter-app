import { defineConfig } from "void/config";

export default defineConfig({
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
