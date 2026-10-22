import { applicationHandler } from "../src/http/handler.js";
import { homePage } from "../src/routes/home.js";

export const GET = applicationHandler(homePage);
