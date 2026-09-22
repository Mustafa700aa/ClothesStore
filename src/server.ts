import { app } from './app.js';
import { env } from './config/environment.js';
import { logger } from './utils/logger.js';
import { prisma } from './config/database.js';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 ClothesStore Backend running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
});

const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database connection closed.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
