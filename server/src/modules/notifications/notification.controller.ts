import type { NextFunction, Request, Response } from 'express';
import {
  emailJobRepository,
  TERMINAL_EMAIL_JOB_STATUSES,
  type EmailJobStatus,
  type EmailJobTerminalStatus,
} from './email-job.repository';

export const notificationController = {
  async listEmailJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as {
        page: number;
        pageSize: number;
        statuses?: EmailJobStatus[];
        eventType?: string;
        recipient?: string;
        search?: string;
      };

      const data = await emailJobRepository.findAdminPage({
        page: query.page,
        pageSize: query.pageSize,
        statuses: query.statuses,
        eventType: query.eventType,
        recipient: query.recipient,
        search: query.search,
      });

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  },

  async retryEmailJob(req: Request, res: Response, next: NextFunction) {
    try {
      const emailJobId = Number(req.params.emailJobId);
      const result = await emailJobRepository.retryFailedJob(emailJobId);

      if (!result.ok && result.reason === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          errorCode: 'EMAIL_JOB_NOT_FOUND',
          message: 'Email job not found.',
        });
      }

      if (!result.ok && result.reason === 'NOT_RETRYABLE') {
        return res.status(409).json({
          success: false,
          errorCode: 'EMAIL_JOB_NOT_RETRYABLE',
          message: 'Only failed email jobs can be retried.',
          currentStatus: result.currentStatus,
        });
      }

      return res.json({
        success: true,
        data: {
          emailJobId,
          status: 'PENDING',
        },
      });
    } catch (error) {
      return next(error);
    }
  },

  async cleanupEmailJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as {
        olderThanDays: number;
        statuses?: EmailJobTerminalStatus[];
      };

      const statuses = body.statuses && body.statuses.length > 0
        ? body.statuses
        : [...TERMINAL_EMAIL_JOB_STATUSES];
      const olderThan = new Date(Date.now() - body.olderThanDays * 24 * 60 * 60 * 1000);
      const deletedCount = await emailJobRepository.cleanupTerminalJobs({
        olderThan,
        statuses,
      });

      return res.json({
        success: true,
        data: {
          deletedCount,
          olderThanDays: body.olderThanDays,
          statuses,
        },
      });
    } catch (error) {
      return next(error);
    }
  },
};
