/**
 * Correlation ID Middleware
 * Generates or extracts trace-id for request tracking across distributed services
 * Creates child logger with trace context for the entire request lifecycle
 */

import crypto from 'crypto';
import { logger } from '../../infrastructure/logger/pino.config.js';

/**
 * Middleware to handle correlation IDs (trace-id) for distributed tracing
 *
 * Flow:
 * 1. Extract trace-id from X-Trace-Id header (if exists) or generate new UUID
 * 2. Attach trace-id to request object
 * 3. Create child logger with trace-id and user context
 * 4. Add X-Trace-Id to response headers for client propagation
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const correlationIdMiddleware = (req, res, next) => {
  // Extract trace-id from header or generate new one
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID();

  // Attach trace-id to request for use in controllers/use cases
  req.traceId = traceId;

  // Create child logger with trace context
  // Will be enriched with userId after authentication
  const childBindings = {
    traceId,
  };

  // Add userId if available (after auth middleware)
  if (req.user?.uid) {
    childBindings.userId = req.user.uid;
  }

  // Attach child logger to request
  req.logger = logger.child(childBindings);

  // Add trace-id to response headers for client tracking
  res.setHeader('X-Trace-Id', traceId);

  // Log request initiated (minimal info here, detailed logging in http-logger)
  req.logger.debug(
    {
      event: 'request.initiated',
      method: req.method,
      url: req.url,
    },
    'Request initiated'
  );

  next();
};

/**
 * Middleware to enrich logger with user context after authentication
 * Should be placed after auth middleware
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const enrichLoggerWithUser = (req, res, next) => {
  if (req.user?.uid && req.logger) {
    // Re-create child logger with user context
    req.logger = req.logger.child({
      userId: req.user.uid,
      userEmail: req.user.email,
    });
  }
  next();
};

export default correlationIdMiddleware;
