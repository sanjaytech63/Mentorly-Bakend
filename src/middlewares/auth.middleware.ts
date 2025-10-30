import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User from '../models/user.models';

export interface AuthenticatedRequest extends Request {
  user?: any; 
}

export const verifyJWT = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token =
        req.cookies?.accessToken ||
        req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        throw new ApiError(401, 'Unauthorized request');
      }

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as JwtPayload;

      const user = await User.findById(decodedToken._id).select('-password -refreshToken');

      if (!user) {
        throw new ApiError(401, 'Invalid Access Token');
      }

      req.user = user;
      next();
    } catch (error: any) {
      throw new ApiError(401, error?.message || 'Invalid access token');
    }
  }
);
