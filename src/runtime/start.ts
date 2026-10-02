import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

process.env.NODE_ENV = "production";
const { app } = await import("./node.js");

const server = new Hono();
server.use("/assets/*", serveStatic({ root: "./dist/client" }));
server.route("/", app);

const port = Number(process.env.PORT ?? 5173);
serve({ fetch: server.fetch, port }, ({ port: activePort }) => {
  console.log(`Server listening on http://localhost:${activePort}`);
});
