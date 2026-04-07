import type { EmailJob } from '../../generated/client';
import { sendMail } from './email.providers';
import { renderEmail } from './email.templates';
import type {
  EmailEventType,
  EmailPayloadByType,
  EmailDispatchResult,
} from './email.types';

export const emailDispatcher = {
  async dispatchEmail<TEventType extends EmailEventType>(input: {
    eventType: TEventType;
    recipient: string;
    payload: EmailPayloadByType[TEventType];
  }): Promise<EmailDispatchResult> {
    const rendered = renderEmail(input.eventType, input.payload);

    return sendMail({
      to: input.recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  },

  async dispatchEmailJob(job: Pick<EmailJob, 'eventType' | 'recipient' | 'payloadJson'>) {
    const payloadJson =
      typeof job.payloadJson === 'string' ? job.payloadJson : JSON.stringify(job.payloadJson);
    const payload = JSON.parse(payloadJson) as EmailPayloadByType[EmailEventType];

    return this.dispatchEmail({
      eventType: job.eventType as EmailEventType,
      recipient: job.recipient,
      payload: payload as never,
    });
  },
};
