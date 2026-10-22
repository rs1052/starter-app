import { pageLoader, pageHead as head } from "../src/http/page.js";
import { notFoundPage } from "../src/routes/errors.js";
export const loader = pageLoader(notFoundPage);
export { head };
