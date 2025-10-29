import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      files?: { [fieldname: string]: Multer.File[] };
      user?: JwtPayload & {
        _id: string;
      };
    }
  }
}
