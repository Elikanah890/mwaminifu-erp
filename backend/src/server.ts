import app from './app';
import { env, validateProductionConfig } from './config/env';
import logger from './config/logger';
import prisma from './config/database';
import { settingsService } from './services/settings.service';

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

async function main() {
  try {
    assertProductionConfig();

    await prisma.$connect();
    logger.info('Database connected successfully');

    await settingsService.load();
    logger.info('System settings loaded');

    // Bind to 0.0.0.0 so the API is reachable from Android emulators (10.0.2.2),
    // physical devices on the LAN, and Docker/reverse-proxy deployments.
    app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Mwaminifu API server running on http://0.0.0.0:${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
