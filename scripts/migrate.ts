import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const path = resolve(process.env.DATABASE_PATH ?? "data/app.db");
mkdirSync(dirname(path), { recursive: true });
const client = new Database(path);
migrate(drizzle(client), { migrationsFolder: "drizzle" });
client.close();
console.log(`Applied migrations to ${path}`);
