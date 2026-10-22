import { pageAction, pageLoader, pageHead as head } from "../src/http/page.js";
import { forgotPassword, forgotPasswordPage } from "../src/routes/auth.js";
export const loader = pageLoader(forgotPasswordPage);
export const action = pageAction(forgotPassword);
export { head };
