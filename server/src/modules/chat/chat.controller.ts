import { NextFunction, Request, Response } from 'express';
import { chatService } from './chat.service';
import type { ChatRequestDto } from './chat.types';

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
};
