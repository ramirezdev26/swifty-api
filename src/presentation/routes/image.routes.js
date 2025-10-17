import { Router } from 'express';
import multer from 'multer';
import { processImage } from '../controllers/image.controller.js';
import { validateProcessImageInput } from '../validators/image.validator.js';
import AuthMiddleware from '../middleware/auth.middleware.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(AuthMiddleware.verifyToken);

router.post('/process', upload.single('image'), validateProcessImageInput, processImage);

export default router;
