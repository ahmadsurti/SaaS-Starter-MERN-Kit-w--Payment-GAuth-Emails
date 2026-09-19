export interface SendMailProps {
  sender: string;
  recipient: string;
  subject: string;
  text: string;
  html?: string;
}

export interface IEmailSender {
  send(props: SendMailProps): Promise<unknown>;
}
