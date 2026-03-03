import { JwtPayload } from 'jsonwebtoken';

export interface AuthUserPayload extends JwtPayload {
  userId: number;
  email?: string;
  roles?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export {};
