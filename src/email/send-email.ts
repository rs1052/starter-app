export interface EmailMessage {
  subject: string;
  text: string;
  to: string;
}

export type SendEmail = (message: EmailMessage) => Promise<void>;
