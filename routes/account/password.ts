import { applicationHandler } from "../../src/http/handler.js";
import { changePassword } from "../../src/routes/auth.js";

export const POST = applicationHandler(changePassword);
