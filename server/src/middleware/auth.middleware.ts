import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, IUserDocument } from '../models/User';
import { AppError } from '../utils/appError';

export interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  tokenVersion?: number;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(AppError.unauthorized('Authentication token is missing. Please log in.'));
    }

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as DecodedToken;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Access token expired. Please refresh your session.', 401, 'TOKEN_EXPIRED'));
      }
      return next(AppError.unauthorized('Invalid authentication token'));
    }

    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user) {
      return next(AppError.unauthorized('User associated with this token no longer exists'));
    }

    if (!user.isActive) {
      return next(AppError.forbidden('Your account has been deactivated. Please contact support.'));
    }

    // Verify token version for complete revocation capability
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      return next(AppError.unauthorized('Session invalidated. Please log in again.'));
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
