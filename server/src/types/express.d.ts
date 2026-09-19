import { UserDocument } from './interfaces';

declare global {
  namespace Express {
    interface User extends UserDocument {}
    interface Request {
      isAuthenticated(): boolean;
      isUnauthenticated(): boolean;
      logout(cb: (err?: any) => void): void;
    }
  }
}
