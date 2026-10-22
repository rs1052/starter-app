import { pageAction, pageLoader, pageHead as head } from "../src/http/page.js";
import { signIn, signInPage } from "../src/routes/auth.js";
export const loader = pageLoader(signInPage);
export const action = pageAction(signIn);
export { head };
