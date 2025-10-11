import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRegisterInput } from '../validators/user.validator.js';
import AuthMiddleware from '../middleware/auth.middleware.js';

const router = Router();
const authController = new AuthController();

router.post('/register', AuthMiddleware.verifyToken, validateRegisterInput, (req, res, next) => {
  authController.register(req, res, next);
});

export default router;
