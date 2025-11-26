/**
 * Centralized Pino Logger Configuration
 * Provides structured logging with correlation IDs and environment-aware formatting
 */

import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from VERSION file
let version = '1.0.0';
try {
  const versionPath = path.join(__dirname, '../../../VERSION');
  version = fs.readFileSync(versionPath, 'utf8').trim();
} catch (error) {
  // Use default version if file not found
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');
const isDevelopment = NODE_ENV === 'development';
const usePretty = process.env.LOG_PRETTY !== 'false' && isDevelopment;

/**
 * Pino configuration with:
 * - Structured JSON logs for production
 * - Pretty formatting for development
 * - Automatic error serialization
 * - Sensitive data redaction
 */
const pinoConfig = {
  level: LOG_LEVEL,

  // Base metadata added to all logs
  base: {
    service: 'swifty-api',
    version,
    environment: NODE_ENV,
  },

  // Timestamp in ISO 8601 format
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Serialize errors with full stack trace
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      path: req.path,
      headers: {
        host: req.headers?.host,
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
      },
      remoteAddress: req.remoteAddress,
      remotePort: req.remotePort,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.getHeader?.('content-type'),
        'content-length': res.getHeader?.('content-length'),
      },
    }),
  },

  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'req.headers.authorization',
      'req.headers.cookie',
      'token',
      'apiKey',
      'secret',
      '*.password',
      '*.token',
      '*.apiKey',
      '*.secret',
    ],
    remove: true,
  },

  // Pretty printing for development
  ...(usePretty && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
        messageFormat: '{service} [{environment}] - {msg}',
        errorLikeObjectKeys: ['err', 'error'],
        errorProps: 'message,stack',
      },
    },
  }),
};

/**
 * Create and export the logger instance
 */
export const logger = pino(pinoConfig);

/**
 * Create child logger with additional context
 * @param {Object} bindings - Additional fields to include in logs
 * @returns {pino.Logger} Child logger instance
 */
export const createChildLogger = (bindings) => {
  return logger.child(bindings);
};

/**
 * Log levels for reference:
 * - fatal (60): Application crashes
 * - error (50): Errors requiring attention
 * - warn (40): Warnings, potential issues
 * - info (30): Important business events
 * - debug (20): Detailed debugging information
 * - trace (10): Very verbose tracing
 */

export default logger;
