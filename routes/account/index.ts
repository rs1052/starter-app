import { applicationHandler } from "../../src/http/handler.js";
import { accountPage } from "../../src/routes/auth.js";

export const GET = applicationHandler(accountPage);
