import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { env } from './env';

// Persist logs to disk for client-testing/ops visibility. `logs/` is gitignored.
const logsDir = path.resolve(__dirname, '../../logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {
  /* ignore — fall back to console only */
}

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'mwaminifu-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), consoleFormat),
    }),
  ],
});

// File transports are best-effort and disabled under test (open file handles
// would keep Jest from exiting). If the directory is not writable we still have
// console logging.
if (env.NODE_ENV !== 'test') {
  try {
    logger.add(
      new winston.transports.File({ filename: path.join(logsDir, 'access.log'), level: 'info', maxsize: 5_000_000, maxFiles: 5 })
    );
    logger.add(
      new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error', maxsize: 5_000_000, maxFiles: 5 })
    );
  } catch {
    /* ignore */
  }
}

export default logger;
