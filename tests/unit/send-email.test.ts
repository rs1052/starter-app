import { expect, it, vi } from "vite-plus/test";
import { createCloudflareEmailSender } from "../../src/runtime/cloudflare.js";

it("sends transactional email through the Cloudflare binding and awaits completion", async () => {
  let resolve!: (result: EmailSendResult) => void;
  const promise = new Promise<EmailSendResult>((done) => {
    resolve = done;
  });
  const send = vi.fn(() => promise);
  const sendEmail = createCloudflareEmailSender(
    { send },
    "App <no-reply@example.com>",
  );
  let completed = false;
  const delivery = sendEmail({
    to: "user@example.com",
    subject: "Verify your email",
    text: "Verification link",
  }).then(() => {
    completed = true;
  });

  expect(send).toHaveBeenCalledWith({
    from: "App <no-reply@example.com>",
    to: "user@example.com",
    subject: "Verify your email",
    text: "Verification link",
  });
  await Promise.resolve();
  expect(completed).toBe(false);
  resolve({ messageId: "message-id" });
  await delivery;
  expect(completed).toBe(true);
  expect(send).toHaveBeenCalledTimes(1);
});

it("propagates Cloudflare delivery failures without logging or retrying", async () => {
  const error = new Error("provider failure with sensitive details");
  const send = vi.fn(async () => {
    throw error;
  });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const sendEmail = createCloudflareEmailSender(
      { send },
      "no-reply@example.com",
    );
    await expect(
      sendEmail({ to: "user@example.com", subject: "Subject", text: "Body" }),
    ).rejects.toBe(error);
    expect(send).toHaveBeenCalledTimes(1);
    expect(log).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});

it("rejects a missing Cloudflare email binding", () => {
  expect(() =>
    createCloudflareEmailSender(
      undefined as unknown as SendEmail,
      "no-reply@example.com",
    ),
  ).toThrow("EMAIL binding is required in production");
});
