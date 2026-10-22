import {
  pageAction,
  pageLoader,
  pageHead as head,
  renderPage,
} from "../../src/http/page.js";
import { accountPage, changePassword } from "../../src/routes/auth.js";
export const loader = pageLoader((c) =>
  c.req.method === "GET"
    ? renderPage(c, "Not found", { user: null, error: "", success: false }, 404)
    : accountPage(c),
);
export const action = pageAction(changePassword);
export { head };
