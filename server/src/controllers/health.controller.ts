import { Request, Response } from 'express';
import { getDatabaseStatus, isDatabaseConnected } from '../config/db';
import { sendResponse } from '../utils/apiResponse';

const startTime = Date.now();

export const getHealth = (_req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();
  const dbConnected = isDatabaseConnected();

  const healthData = {
    server: dbConnected ? 'healthy' : 'degraded',
    database: dbStatus,
    apiVersion: 'v1',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };

  const statusCode = dbConnected ? 200 : 503;

  return sendResponse({
    res,
    statusCode,
    message: dbConnected
      ? 'Paven Traders API is operational and database is connected'
      : 'Paven Traders API is degraded: Database is disconnected',
    data: healthData,
  });
};
