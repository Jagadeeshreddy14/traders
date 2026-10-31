import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let details: any = undefined;

  // 1. AppError (Operational / Expected Errors)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.code || 'APP_ERROR';
    details = err.details;
  }
  // 2. Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    errorCode = 'DUPLICATE_ENTRY';
    message = `Duplicate value for field: ${fields.join(', ')}. Please use unique values.`;
    details = err.keyValue;
  }
  // 3. Mongoose CastError (Invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID_FORMAT';
    message = `Invalid format for parameter: ${err.path}`;
  }
  // 4. Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'MONGOOSE_VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
  }
  // 5. JWT Authentication Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Authentication token is invalid or malformed';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  // 6. Generic unhandled error
  else {
    logger.error('Unhandled Server Error:', err);
    if (env.NODE_ENV === 'development') {
      message = err.message || message;
      details = err.stack;
    }
  }

  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      ...(details !== undefined && { details }),
    },
    timestamp: new Date().toISOString(),
  });
};
