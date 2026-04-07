import type { EmailJob, Prisma } from '../../generated/client';
import { prisma } from '../../utils/prisma';

const MAX_EMAIL_ATTEMPTS = 3;
const DEFAULT_ADMIN_PAGE_SIZE = 20;
const MAX_ADMIN_PAGE_SIZE = 100;

export const EMAIL_JOB_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;

export const TERMINAL_EMAIL_JOB_STATUSES = [EMAIL_JOB_STATUS.SENT, EMAIL_JOB_STATUS.FAILED] as const;

export type EmailJobClient = Pick<typeof prisma, 'emailJob'> | Pick<Prisma.TransactionClient, 'emailJob'>;
export type EmailJobStatus = (typeof EMAIL_JOB_STATUS)[keyof typeof EMAIL_JOB_STATUS];
export type EmailJobTerminalStatus = (typeof TERMINAL_EMAIL_JOB_STATUSES)[number];

export type EmailJobAdminListItem = Pick<
  EmailJob,
  | 'emailJobId'
  | 'eventKey'
  | 'eventType'
  | 'recipient'
  | 'status'
  | 'attempts'
  | 'lastError'
  | 'provider'
  | 'providerMessageId'
  | 'scheduledAt'
  | 'sentAt'
  | 'createdAt'
  | 'updatedAt'
>;

export type EmailJobAdminFilters = {
  statuses?: EmailJobStatus[];
  eventType?: string;
  recipient?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type EmailJobQueueSummary = {
  total: number;
  byStatus: Partial<Record<EmailJobStatus, number>>;
  byEventType: Record<string, number>;
};

type EnqueueEmailJobInput = {
  eventKey: string;
  eventType: string;
  recipient: string;
  payloadJson: string;
  scheduledAt?: Date;
};

const resolveRetryDelayMs = (attempts: number) => {
  const boundedAttempts = Math.max(1, attempts);
  return Math.min(60_000, 5_000 * 2 ** (boundedAttempts - 1));
};

const buildAdminWhereInput = (filters: EmailJobAdminFilters): Prisma.EmailJobWhereInput => {
  const andFilters: Prisma.EmailJobWhereInput[] = [];

  if (filters.statuses && filters.statuses.length > 0) {
    andFilters.push({
      status: {
        in: filters.statuses,
      },
    });
  }

  if (filters.eventType) {
    andFilters.push({ eventType: filters.eventType });
  }

  if (filters.recipient) {
    andFilters.push({
      recipient: {
        contains: filters.recipient,
      },
    });
  }

  if (filters.search) {
    andFilters.push({
      OR: [
        { eventKey: { contains: filters.search } },
        { eventType: { contains: filters.search } },
        { recipient: { contains: filters.search } },
        { lastError: { contains: filters.search } },
      ],
    });
  }

  if (andFilters.length === 0) {
    return {};
  }

  return { AND: andFilters };
};

const buildQueueSummary = (
  rows: Array<{ status: string; eventType: string; _count?: { _all?: number } | true }>,
): EmailJobQueueSummary => {
  const byStatus: Partial<Record<EmailJobStatus, number>> = {};
  const byEventType: Record<string, number> = {};

  for (const row of rows) {
    let count = 0;
    if (row._count && row._count !== true) {
      const countAggregate = row._count as { _all?: number };
      count = Number(countAggregate._all ?? 0);
    }
    const typedStatus = row.status as EmailJobStatus;
    byStatus[typedStatus] = (byStatus[typedStatus] ?? 0) + count;
    byEventType[row.eventType] = (byEventType[row.eventType] ?? 0) + count;
  }

  return {
    total: rows.reduce((sum, row) => {
      if (row._count && row._count !== true) {
        return sum + Number((row._count as { _all?: number })._all ?? 0);
      }

      return sum;
    }, 0),
    byStatus,
    byEventType,
  };
};

export const emailJobRepository = {
  async enqueue(input: EnqueueEmailJobInput, client: EmailJobClient = prisma): Promise<EmailJob> {
    return client.emailJob.upsert({
      where: { eventKey: input.eventKey },
      update: {},
      create: {
        eventKey: input.eventKey,
        eventType: input.eventType,
        recipient: input.recipient,
        payloadJson: input.payloadJson,
        scheduledAt: input.scheduledAt ?? new Date(),
      },
    });
  },

  async findAdminPage(filters: EmailJobAdminFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(MAX_ADMIN_PAGE_SIZE, Math.max(1, filters.pageSize ?? DEFAULT_ADMIN_PAGE_SIZE));
    const where = buildAdminWhereInput(filters);

    const [items, total, groupedCounts] = await prisma.$transaction([
      prisma.emailJob.findMany({
        where,
        select: {
          emailJobId: true,
          eventKey: true,
          eventType: true,
          recipient: true,
          status: true,
          attempts: true,
          lastError: true,
          provider: true,
          providerMessageId: true,
          scheduledAt: true,
          sentAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [
          { scheduledAt: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.emailJob.count({ where }),
      prisma.emailJob.groupBy({
        by: ['status', 'eventType'],
        where,
        orderBy: [
          { status: 'asc' },
          { eventType: 'asc' },
        ],
        _count: {
          _all: true,
        },
      }),
    ]);

    return {
      items: items as EmailJobAdminListItem[],
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      summary: buildQueueSummary(groupedCounts),
    };
  },

  async findPending(limit = 10, now = new Date()): Promise<EmailJob[]> {
    return prisma.emailJob.findMany({
      where: {
        status: EMAIL_JOB_STATUS.PENDING,
        scheduledAt: { lte: now },
      },
      orderBy: [
        { scheduledAt: 'asc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    });
  },

  async claim(emailJobId: number): Promise<boolean> {
    const result = await prisma.emailJob.updateMany({
      where: {
        emailJobId,
        status: EMAIL_JOB_STATUS.PENDING,
      },
      data: {
        status: EMAIL_JOB_STATUS.PROCESSING,
        lastError: null,
      },
    });

    return result.count === 1;
  },

  async markSent(emailJobId: number, result: { provider: string; messageId?: string }) {
    await prisma.emailJob.update({
      where: { emailJobId },
      data: {
        status: EMAIL_JOB_STATUS.SENT,
        provider: result.provider,
        providerMessageId: result.messageId ?? null,
        sentAt: new Date(),
        lastError: null,
      },
    });
  },

  async markRetryOrFail(emailJob: Pick<EmailJob, 'emailJobId' | 'attempts'>, errorMessage: string) {
    const nextAttempts = emailJob.attempts + 1;
    const shouldFail = nextAttempts >= MAX_EMAIL_ATTEMPTS;

    await prisma.emailJob.update({
      where: { emailJobId: emailJob.emailJobId },
      data: {
        attempts: nextAttempts,
        status: shouldFail ? EMAIL_JOB_STATUS.FAILED : EMAIL_JOB_STATUS.PENDING,
        lastError: errorMessage,
        scheduledAt: shouldFail
          ? undefined
          : new Date(Date.now() + resolveRetryDelayMs(nextAttempts)),
      },
    });
  },

  async retryFailedJob(emailJobId: number) {
    const existingJob = await prisma.emailJob.findUnique({
      where: { emailJobId },
      select: {
        emailJobId: true,
        status: true,
      },
    });

    if (!existingJob) {
      return { ok: false as const, reason: 'NOT_FOUND' as const };
    }

    if (existingJob.status !== EMAIL_JOB_STATUS.FAILED) {
      return {
        ok: false as const,
        reason: 'NOT_RETRYABLE' as const,
        currentStatus: existingJob.status,
      };
    }

    await prisma.emailJob.update({
      where: { emailJobId },
      data: {
        status: EMAIL_JOB_STATUS.PENDING,
        attempts: 0,
        lastError: null,
        scheduledAt: new Date(),
        sentAt: null,
        provider: null,
        providerMessageId: null,
      },
    });

    return { ok: true as const };
  },

  async cleanupTerminalJobs(input?: {
    olderThan?: Date;
    statuses?: EmailJobTerminalStatus[];
  }) {
    const statuses = input?.statuses && input.statuses.length > 0
      ? input.statuses
      : [...TERMINAL_EMAIL_JOB_STATUSES];

    const result = await prisma.emailJob.deleteMany({
      where: {
        status: {
          in: statuses,
        },
        updatedAt: {
          lt: input?.olderThan ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return result.count;
  },

  async requeueStuckProcessingJobs(staleBefore: Date) {
    const result = await prisma.emailJob.updateMany({
      where: {
        status: EMAIL_JOB_STATUS.PROCESSING,
        updatedAt: {
          lte: staleBefore,
        },
      },
      data: {
        status: EMAIL_JOB_STATUS.PENDING,
        lastError: 'Recovered after worker shutdown while processing.',
        scheduledAt: new Date(),
      },
    });

    return result.count;
  },

  async getQueueSummary(statuses?: EmailJobStatus[]) {
    const groupedCounts = await prisma.emailJob.groupBy({
      by: ['status', 'eventType'],
      where: statuses && statuses.length > 0
        ? {
            status: {
              in: statuses,
            },
          }
        : undefined,
      orderBy: [
        { status: 'asc' },
        { eventType: 'asc' },
      ],
      _count: {
        _all: true,
      },
    });

    return buildQueueSummary(groupedCounts);
  },
};
