import { AppError } from '../../shared/errors/app.error.js';
import { ErrorCode } from '../../shared/constants/error-codes.js';
import { logger } from '../../infrastructure/logger/pino.config.js';

// eslint-disable-next-line no-unused-vars
export const errorMiddleware = (err, req, res, next) => {
  // Use request logger if available (has trace-id), otherwise use global logger
  const requestLogger = req.logger || logger;

  const error = err instanceof Error ? err : new Error(err);

  // Determine log level based on error type
  const logLevel = error instanceof AppError && error.statusCode < 500 ? 'warn' : 'error';

  // Log error with full context
  requestLogger[logLevel](
    {
      event: 'error.caught',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
      },
      request: {
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        body: req.body,
      },
      traceId: req.traceId,
      userId: req.user?.uid,
    },
    `Error: ${error.message}`
  );

  // Handle AppError (custom application errors)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      ...error.toJSON(),
      traceId: req.traceId, // Include trace-id for debugging
    });
  }

  // Handle Joi validation errors
  if (error.isJoi) {
    const validationError = {
      status: 'error',
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      errors: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
      traceId: req.traceId,
    };
    return res.status(400).json(validationError);
  }

  // Handle Firebase auth errors
  if (error.code?.startsWith('auth/')) {
    return res.status(401).json({
      status: 'error',
      errorCode: ErrorCode.AUTH_ERROR,
      message: error.message,
      code: error.code,
      traceId: req.traceId,
    });
  }

  // Handle unexpected errors (5xx)
  return res.status(500).json({
    status: 'error',
    errorCode: ErrorCode.INTERNAL_ERROR,
    message: 'Internal Server Error',
    traceId: req.traceId,
    ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
  });
};

export default errorMiddleware;
