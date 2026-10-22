import { applicationHandler } from "../../src/http/handler.js";
import { examplesPage } from "../../src/routes/examples.js";

export const GET = applicationHandler(examplesPage);
