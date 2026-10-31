import { Response } from 'express';

export interface ApiResponseOptions<T = any> {
  res: Response;
  statusCode?: number;
  message: string;
  data?: T;
  error?: {
    code?: string;
    details?: any;
  };
}

export const sendResponse = <T = any>({
  res,
  statusCode = 200,
  message,
  data,
  error,
}: ApiResponseOptions<T>) => {
  const isSuccess = statusCode >= 200 && statusCode < 300;
  return res.status(statusCode).json({
    success: isSuccess,
    message,
    ...(data !== undefined && { data }),
    ...(error !== undefined && { error }),
    timestamp: new Date().toISOString(),
  });
};

export const sendSuccess = <T = any>(
  res: Response,
  data?: T,
  message: string = 'Success',
  statusCode: number = 200
) => {
  return sendResponse({
    res,
    statusCode,
    message,
    data,
  });
};
