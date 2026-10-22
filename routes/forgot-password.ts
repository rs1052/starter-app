import { applicationHandler } from "../src/http/handler.js";
import { forgotPasswordPage, forgotPassword } from "../src/routes/auth.js";

export const GET = applicationHandler(forgotPasswordPage);
export const POST = applicationHandler(forgotPassword);
