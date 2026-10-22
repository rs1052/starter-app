import { applicationHandler } from "../src/http/handler.js";
import { signOut } from "../src/routes/auth.js";

export const POST = applicationHandler(signOut);
