import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

const HEADER_NAME = 'x-request-id';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incoming = req.header(HEADER_NAME);
  const traceId = typeof incoming === 'string' && incoming.trim().length > 0
    ? incoming.trim()
    : crypto.randomUUID();

  req.traceId = traceId;
  res.setHeader(HEADER_NAME, traceId);
  next();
};
