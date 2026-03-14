import { NextFunction, Request, Response } from 'express';
import { chatService } from './chat.service';
import type { ChatRequestDto, ChatTelemetryEventDto } from './chat.types';

export const chatController = {
  send: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body as ChatRequestDto;
      const result = await chatService.chat(payload);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  trackEvent: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body as ChatTelemetryEventDto;
      await chatService.trackEvent(payload, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      res.status(202).json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  getTelemetrySummary: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const result = await chatService.getTelemetrySummary({ startDate, endDate });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
