import { applicationHandler } from "../../../src/http/handler.js";
import { authApi } from "../../../src/routes/auth.js";

export const GET = applicationHandler(authApi);
export const POST = applicationHandler(authApi);
