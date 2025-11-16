import { AppError } from './app.error.js';
import { ErrorCode } from '../constants/error-codes.js';

/**
 * Error for forbidden access (authenticated but not allowed)
 * @extends AppError
 */
export class ForbiddenError extends AppError {
  /**
   * @param {string} [message='Forbidden'] - Error message
   */
  constructor(message = 'Forbidden') {
    super(message, 403, ErrorCode.FORBIDDEN);
  }
}
