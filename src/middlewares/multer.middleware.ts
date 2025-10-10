import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

const maxSize = 100 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, callback: DestinationCallback) => {
    callback(null, path.resolve(process.cwd(), './public/temp'));
  },
  filename: (req: Request, file: Express.Multer.File, callback: FileNameCallback) => {
    // Use original name with timestamp to avoid conflicts
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    callback(null, uniqueSuffix + '--' + file.originalname);
  },
});

const fileFilter = (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'video/mp4'
  ) {
    callback(null, true);
  } else {
    callback(new Error('Only .png, .jpg, .jpeg, .mp4 allowed'));
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: maxSize },
});
