import { pageLoader, pageHead as head } from "../src/http/page.js";
import { homePage } from "../src/routes/home.js";
export const loader = pageLoader(homePage);
export { head };
