import {
  notificationsApi,
  type AdminEmailJobListPayload,
  type EmailJobStatus,
} from '@/admin/api/notifications.api';

const buildEmailJobListQuery = (params?: {
  status?: EmailJobStatus | 'ALL';
  page?: number;
  pageSize?: number;
  search?: string;
  eventType?: string;
}) => {
  const query = new URLSearchParams();

  if (params?.status && params.status !== 'ALL') {
    query.append('statuses', params.status);
  }
  if (params?.page) {
    query.append('page', params.page.toString());
  }
  if (params?.pageSize) {
    query.append('pageSize', params.pageSize.toString());
  }
  if (params?.search) {
    query.append('search', params.search);
  }
  if (params?.eventType) {
    query.append('eventType', params.eventType);
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
};

export const notificationQueueService = {
  async list(params?: {
    status?: EmailJobStatus | 'ALL';
    page?: number;
    pageSize?: number;
    search?: string;
    eventType?: string;
  }): Promise<AdminEmailJobListPayload> {
    const response = await notificationsApi.listEmailJobs(buildEmailJobListQuery(params));
    return response.data;
  },

  async retry(emailJobId: number) {
    const response = await notificationsApi.retryEmailJob(emailJobId);
    return response.data;
  },

  async cleanup(input?: {
    olderThanDays?: number;
    statuses?: Array<'SENT' | 'FAILED'>;
  }) {
    const response = await notificationsApi.cleanupEmailJobs({
      olderThanDays: input?.olderThanDays ?? 30,
      statuses: input?.statuses,
    });

    return response.data;
  },
};

