export interface EmailMessage {
  subject: string;
  text: string;
  to: string;
}

export type SendEmail = (message: EmailMessage) => Promise<void>;

export function createResendEmailSender(options: {
  apiKey: string;
  from: string;
  fetch?: typeof globalThis.fetch;
}): SendEmail {
  const request = options.fetch ?? globalThis.fetch;

  return async (message) => {
    const response = await request("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: options.from, ...message }),
    });

    if (!response.ok) {
      throw new Error(
        `Resend email delivery failed with status ${response.status}`,
      );
    }
  };
}
