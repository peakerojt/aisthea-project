import { api } from '@/common/utils/api';

export type EmailJobStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface EmailJobSummaryPayload {
  total: number;
  byStatus: Partial<Record<EmailJobStatus, number>>;
  byEventType: Record<string, number>;
}

export interface AdminEmailJobRecord {
  emailJobId: number;
  eventKey: string;
  eventType: string;
  recipient: string;
  status: EmailJobStatus;
  attempts: number;
  lastError: string | null;
  provider: string | null;
  providerMessageId: string | null;
  scheduledAt: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEmailJobListPayload {
  items: AdminEmailJobRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: EmailJobSummaryPayload;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

export const notificationsApi = {
  listEmailJobs: (query: string) =>
    api.get<ApiEnvelope<AdminEmailJobListPayload>>(`/api/notifications/email-jobs${query}`),

  retryEmailJob: (emailJobId: number) =>
    api.post<ApiEnvelope<{ emailJobId: number; status: EmailJobStatus }>>(
      `/api/notifications/email-jobs/${emailJobId}/retry`,
    ),

  cleanupEmailJobs: (data: {
    olderThanDays: number;
    statuses?: Array<'SENT' | 'FAILED'>;
  }) =>
    api.post<ApiEnvelope<{ deletedCount: number; olderThanDays: number; statuses: Array<'SENT' | 'FAILED'> }>>(
      '/api/notifications/email-jobs/cleanup',
      data,
    ),
};

