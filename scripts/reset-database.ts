import { rmSync } from "node:fs";
import { resolve } from "node:path";

try {
  process.loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const path = resolve(process.env.DATABASE_PATH ?? "data/app.db");
for (const suffix of ["", "-shm", "-wal"])
  rmSync(`${path}${suffix}`, { force: true });
console.log(`Removed ${path}`);
