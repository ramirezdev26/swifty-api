import { AppError } from './app.error.js';
import { ErrorCode } from '../constants/error-codes.js';

/**
 * Error for service unavailable scenarios (e.g., auth service down)
 * @extends AppError
 */
export class ServiceUnavailableError extends AppError {
  /**
   * @param {string} [message='Service Unavailable'] - Error message
   */
  constructor(message = 'Service Unavailable') {
    super(message, 503, ErrorCode.SERVICE_UNAVAILABLE);
  }
}
