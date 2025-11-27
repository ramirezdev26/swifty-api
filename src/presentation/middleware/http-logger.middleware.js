/**
 * HTTP Request/Response Logger Middleware
 * Logs HTTP transactions with timing, status codes, and correlation context
 */

import pinoHttp from 'pino-http';
import { logger } from '../../infrastructure/logger/pino.config.js';

/**
 * Custom pino-http middleware with:
 * - Request/response logging
 * - Duration tracking
 * - Dynamic log levels based on status codes
 * - Integration with correlation ID
 */
export const httpLoggerMiddleware = pinoHttp({
  logger,

  // Custom log level based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    if (res.statusCode >= 300) {
      return 'info';
    }
    return 'info';
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },

  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },

  // Custom attribute keys to match our logging structure
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },

  // Custom request properties to log
  customProps: (req, res) => {
    return {
      traceId: req.traceId,
      userId: req.user?.uid,
      userEmail: req.user?.email,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
    };
  },

  // Serialize request with minimal info
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        host: req.headers?.host,
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
        accept: req.headers?.accept,
      },
    }),
    res: (res) => {
      // Validate res is a proper response object
      if (!res || typeof res.getHeader !== 'function') {
        return { statusCode: res?.statusCode };
      }
      return {
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader('content-type'),
          'content-length': res.getHeader('content-length'),
        },
      };
    },
  },

  // Don't log health check endpoints
  autoLogging: {
    ignore: (req) => {
      return req.url === '/health' || req.url === '/api/health';
    },
  },
});

/**
 * Alternative custom HTTP logger middleware (if not using pino-http)
 * This is a fallback implementation without external dependency
 */
export const customHttpLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capture original end method
  const originalEnd = res.end;

  // Override end method to log after response
  res.end = function (...args) {
    // Calculate request duration
    const duration = Date.now() - startTime;

    // Get logger from request (set by correlation middleware)
    const requestLogger = req.logger || logger;

    // Determine log level based on status code
    let logLevel = 'info';
    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400) {
      logLevel = 'warn';
    }

    // Log HTTP transaction
    requestLogger[logLevel](
      {
        event: 'http.request.completed',
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        statusCode: res.statusCode,
        duration,
        traceId: req.traceId,
        userId: req.user?.uid,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection?.remoteAddress,
        contentLength: res.getHeader('content-length'),
      },
      `${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`
    );

    // Call original end method
    return originalEnd.apply(this, args);
  };

  next();
};

export default httpLoggerMiddleware;
