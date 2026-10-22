import { defineEnv, string } from "void/env";

export default defineEnv({
  BETTER_AUTH_SECRET: string(),
  BETTER_AUTH_URL: string(),
  TRUSTED_ORIGINS: string().optional(),
  EMAIL_FROM: string(),
});
