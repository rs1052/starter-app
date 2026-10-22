import { applicationHandler } from "../src/http/handler.js";
import { notFoundPage } from "../src/routes/errors.js";

export const GET = applicationHandler((c) => notFoundPage(c));
export const POST = GET;
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
export const OPTIONS = GET;
