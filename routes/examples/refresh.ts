import { applicationHandler } from "../../src/http/handler.js";
import { refreshExample } from "../../src/routes/examples.js";

export const POST = applicationHandler(refreshExample);
