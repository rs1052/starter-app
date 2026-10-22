import { pageLoader, pageHead as head } from "../../src/http/page.js";
import { accountPage } from "../../src/routes/auth.js";
export const loader = pageLoader(accountPage);
export { head };
