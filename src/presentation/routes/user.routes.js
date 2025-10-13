import { Router } from 'express';
//import { UserController } from '../controllers/user.controller.js';
import AuthMiddleware from '../middleware/auth.middleware.js';

const router = Router();

router.use(AuthMiddleware.verifyToken);

//router.get('/profile', UserController.getProfile);

export default router;
