import { Request, Response, NextFunction } from 'express';

export function ensureAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ errors: ['User not authenticated, please login'] });
}
