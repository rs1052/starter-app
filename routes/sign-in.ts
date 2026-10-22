import { applicationHandler } from "../src/http/handler.js";
import { signInPage, signIn } from "../src/routes/auth.js";

export const GET = applicationHandler(signInPage);
export const POST = applicationHandler(signIn);
