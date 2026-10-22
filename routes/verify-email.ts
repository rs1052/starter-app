import { applicationHandler } from "../src/http/handler.js";
import { verifyEmailPage, requestVerification } from "../src/routes/auth.js";

export const GET = applicationHandler(verifyEmailPage);
export const POST = applicationHandler(requestVerification);
