import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync, rmSync } from "node:fs";

mkdirSync("data", { recursive: true });
const path = "data/test-browser.db";
for (const suffix of ["", "-shm", "-wal"])
  rmSync(`${path}${suffix}`, { force: true });
const client = new Database(path);
migrate(drizzle(client), { migrationsFolder: "drizzle" });
client.close();
