import { AppError } from './app.error.js';
import { ErrorCode } from '../constants/error-codes.js';

/**
 * Error for unauthorized access (invalid or missing credentials)
 * @extends AppError
 */
export class UnauthorizedError extends AppError {
  /**
   * @param {string} [message='Unauthorized'] - Error message
   */
  constructor(message = 'Unauthorized') {
    super(message, 401, ErrorCode.AUTH_ERROR);
  }
}
