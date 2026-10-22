import { applicationHandler } from "../src/http/handler.js";
import { resetPasswordPage, resetPassword } from "../src/routes/auth.js";

export const GET = applicationHandler(resetPasswordPage);
export const POST = applicationHandler(resetPassword);
