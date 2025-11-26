import { Router } from 'express';
import multer from 'multer';
import { processImage, updateImageVisibility } from '../controllers/image.controller.js';
import {
  validateProcessImageInput,
  validateUpdateImageVisibilityInput,
  validateImageIdParam,
} from '../validators/image.validator.js';
import AuthMiddleware from '../middleware/auth.middleware.js';

const router = Router();

const MAX_FILE_SIZE_MB = 10;
const BYTES_PER_MB = 1024 * 1024;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MB;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

router.post(
  '/process',
  AuthMiddleware.verifyToken,
  upload.single('image'),
  validateProcessImageInput,
  processImage
);

router.patch(
  '/:id/visibility',
  AuthMiddleware.verifyToken,
  validateImageIdParam,
  validateUpdateImageVisibilityInput,
  updateImageVisibility
);

export default router;
