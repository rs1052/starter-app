import { applicationHandler } from "../src/http/handler.js";
import { health } from "../src/routes/home.js";

export const GET = applicationHandler(health);
