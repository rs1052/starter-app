import { pageAction, pageLoader, pageHead as head } from "../src/http/page.js";
import { signUp, signUpPage } from "../src/routes/auth.js";
export const loader = pageLoader(signUpPage);
export const action = pageAction(signUp);
export { head };
