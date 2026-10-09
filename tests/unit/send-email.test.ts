import { expect, it, vi } from "vitest";
import { createResendEmailSender } from "../../src/email/send-email.js";
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
    signal: expect.any(AbortSignal),
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

it("aborts a timed-out request without retrying", async () => {
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  const timeoutSpy = vi
    .spyOn(AbortSignal, "timeout")
    .mockImplementation(() => timeout(1));
  const request = vi.fn<typeof fetch>(async (_url, options) => {
    const signal = options?.signal;
    expect(signal).toBeInstanceOf(AbortSignal);
    return new Promise<Response>((_resolve, reject) => {
      signal!.addEventListener("abort", () => reject(signal!.reason), {
        once: true,
      });
    });
  });
  try {
    const sendEmail = createResendEmailSender({
      apiKey: "test-key",
      from: "App <no-reply@example.com>",
      fetch: request,
    });
    await expect(
      sendEmail({ to: "user@example.com", subject: "Subject", text: "Body" }),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    expect(request).toHaveBeenCalledTimes(1);
  } finally {
    timeoutSpy.mockRestore();
  }
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
