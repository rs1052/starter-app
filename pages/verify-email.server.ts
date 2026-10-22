import { pageAction, pageLoader, pageHead as head } from "../src/http/page.js";
import { requestVerification, verifyEmailPage } from "../src/routes/auth.js";
export const loader = pageLoader(verifyEmailPage);
export const action = pageAction(requestVerification);
export { head };
