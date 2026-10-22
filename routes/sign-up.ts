import { applicationHandler } from "../src/http/handler.js";
import { signUpPage, signUp } from "../src/routes/auth.js";

export const GET = applicationHandler(signUpPage);
export const POST = applicationHandler(signUp);
