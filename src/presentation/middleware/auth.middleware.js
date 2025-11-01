import { auth } from '../../infrastructure/config/firebase.config.js';
import { AppError } from '../../shared/errors/index.js';

export class AuthMiddleware {
  static async verifyToken(req, res, next) {
    try {
      // Check if Firebase auth is available
      if (!auth) {
        return next(new AppError('Authentication service not available', 503));
      }

      const token = AuthMiddleware.extractToken(req);

      const decodedToken = await auth.verifyIdToken(token);

      req.user = AuthMiddleware.buildUser(decodedToken);
      next();
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Invalid or expired token';
      next(new AppError(message, 401));
    }
  }

  static extractToken(req) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid Authorization header', 401);
    }

    const token = header.split(' ')[1];
    if (!token) {
      throw new AppError('Invalid token format', 401);
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
