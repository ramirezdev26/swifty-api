import { auth } from '../../infrastructure/config/firebase.config.js';
import { AppError, UnauthorizedError, ServiceUnavailableError } from '../../shared/errors/index.js';

export class AuthMiddleware {
  static async verifyToken(req, res, next) {
    try {
      // Check if Firebase auth is available
      if (!auth) {
        return next(new ServiceUnavailableError('Authentication service not available'));
      }

      const token = AuthMiddleware.extractToken(req);

      const decodedToken = await auth.verifyIdToken(token);

      req.user = AuthMiddleware.buildUser(decodedToken);
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      next(new UnauthorizedError('Invalid or expired token'));
    }
  }

  static extractToken(req) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = header.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Invalid token format');
    }

    return token;
  }

  static buildUser(decodedToken) {
    return {
      email: decodedToken.email,
      firebase_uid: decodedToken.user_id,
    };
  }
}

export default AuthMiddleware;
