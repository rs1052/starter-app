import { pageAction, pageLoader, pageHead as head } from "../src/http/page.js";
import { resetPassword, resetPasswordPage } from "../src/routes/auth.js";
export const loader = pageLoader(resetPasswordPage);
export const action = pageAction(resetPassword);
export { head };
