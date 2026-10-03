import { expect, it } from "vitest";
import { closeAppFixture, createAppFixture } from "./app-fixture.js";

it("enforces migrated foreign keys and cascades user deletion", () => {
  const fixture = createAppFixture();
  const db = fixture.client;
  try {
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    const insertSession = db.prepare(
      "insert into session (id, expires_at, token, created_at, updated_at, user_id) values (?, 1, ?, 1, 1, ?)",
    );
    const insertAccount = db.prepare(
      "insert into account (id, account_id, provider_id, created_at, updated_at, user_id) values (?, ?, 'credential', 1, 1, ?)",
    );
    expect(() =>
      insertSession.run("orphan", "orphan-token", "missing"),
    ).toThrow(/FOREIGN KEY/);
    expect(() => insertAccount.run("orphan", "orphan", "missing")).toThrow(
      /FOREIGN KEY/,
    );
    db.prepare(
      "insert into user (id, name, email, created_at, updated_at) values ('parent', 'User', 'user@example.com', 1, 1)",
    ).run();
    insertSession.run("session", "token", "parent");
    insertAccount.run("account", "parent", "parent");
    db.prepare("delete from user where id = 'parent'").run();
    expect(db.prepare("select id from session").all()).toEqual([]);
    expect(db.prepare("select id from account").all()).toEqual([]);
  } finally {
    closeAppFixture(fixture);
  }
});
