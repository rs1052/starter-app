import { pageLoader, pageHead as head } from "../src/http/page.js";
import { examplesPage } from "../src/routes/examples.js";
export const loader = pageLoader(examplesPage);
export { head };
