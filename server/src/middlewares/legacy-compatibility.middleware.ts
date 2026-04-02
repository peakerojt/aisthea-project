import { NextFunction, Request, Response } from 'express';

type LegacyCompatibilityOptions = {
  successor: string;
  surface: string;
};

export const markLegacyCompatibilityRoute = ({
  successor,
  surface,
}: LegacyCompatibilityOptions) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('X-AISTHEA-Compatibility', 'legacy-route');
    res.setHeader('X-AISTHEA-Compatibility-Surface', surface);
    res.setHeader('Link', `<${successor}>; rel="successor-version"`);
    next();
  };
};
