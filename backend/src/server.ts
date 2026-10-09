import app from './app';
import { env, validateProductionConfig } from './config/env';
import logger from './config/logger';
import prisma from './config/database';
import { settingsService } from './services/settings.service';
import type { Server } from 'http';

const WEAK_JWT_SECRETS = new Set([
  'dev_secret',
  'dev_secret_key_change_in_production_mwaminifu_2026',
  'change_this_to_a_secure_random_string',
  'secret',
]);

function assertProductionConfig() {
  if (env.NODE_ENV !== 'production') return;

  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || WEAK_JWT_SECRETS.has(env.JWT_SECRET)) {
    throw new Error(
      'Insecure JWT_SECRET detected in production. Set a random 256-bit (>=32 char) secret via environment variable.'
    );
  }

  // Fails fast (throws) when MOCK_SMS/MOCK_FCM are enabled or a real gateway is
  // not configured in production.
  validateProductionConfig();
}

let server: Server | undefined;
let shuttingDown = false;

async function main() {
  try {
    assertProductionConfig();

    await prisma.$connect();
    logger.info('Database connected successfully');

    await settingsService.load();
    logger.info('System settings loaded');

    // Bind to 0.0.0.0 so the API is reachable from Android emulators (10.0.2.2),
    // physical devices on the LAN, and Docker/reverse-proxy deployments.
    server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Mwaminifu API server running on http://0.0.0.0:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
    });
    server.on('error', (err) => logger.error('HTTP server error', err));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/** Drain in-flight requests, then close the DB. Force-exits after 15s. */
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received. Draining connections...`);

  const force = setTimeout(() => {
    logger.error('Forced shutdown after 15s timeout');
    process.exit(1);
  }, 15_000);
  force.unref();

  try {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await prisma.$disconnect();
  } catch (err) {
    logger.error('Error during shutdown', err);
  }

  clearTimeout(force);
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Never let an unhandled async error silently kill the process without logging
// and draining.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err);
  void shutdown('uncaughtException');
});

main();
