import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './utils/logger';

const startServer = async () => {
  try {
    // 1. Connect to Database
    logger.info(`Connecting to MongoDB at: ${env.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);
    try {
      await connectDatabase();
    } catch (dbError) {
      logger.warn('Initial MongoDB connection failed. Server will continue in degraded mode, retrying...', dbError);
    }

    // 2. Start HTTP Server
    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      logger.info(`=======================================================`);
      logger.info(`  Paven Traders API Server (Phase 1 Foundation)`);
      logger.info(`  Environment : ${env.NODE_ENV}`);
      logger.info(`  Port        : ${env.PORT}`);
      logger.info(`  Base API    : http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`  Health Check: http://localhost:${env.PORT}${env.API_PREFIX}/health`);
      logger.info(`=======================================================`);
    });

    // 3. Graceful Shutdown Handlers
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after timeout if pending connections hang
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    logger.error('Fatal server startup failure:', error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default startServer;
