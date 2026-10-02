import { expect, it, vi } from "vitest";
import { createResendEmailSender } from "../../src/email/send-email.js";

it("sends transactional email through the Resend HTTP API", async () => {
  const request = vi.fn(async () => new Response('{"id":"message-id"}'));
  const sendEmail = createResendEmailSender({
    apiKey: "test-key",
    from: "App <no-reply@example.com>",
    fetch: request,
  });

  await sendEmail({
    to: "user@example.com",
    subject: "Reset your password",
    text: "Reset link",
  });

  expect(request).toHaveBeenCalledWith("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: "Bearer test-key",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: "App <no-reply@example.com>",
      to: "user@example.com",
      subject: "Reset your password",
      text: "Reset link",
    }),
  });
});

it("rejects failed Resend delivery without exposing the response body", async () => {
  const sendEmail = createResendEmailSender({
    apiKey: "test-key",
    from: "App <no-reply@example.com>",
    fetch: async () => new Response("sensitive", { status: 422 }),
  });

  await expect(
    sendEmail({ to: "user@example.com", subject: "Subject", text: "Body" }),
  ).rejects.toThrow("Resend email delivery failed with status 422");
});
