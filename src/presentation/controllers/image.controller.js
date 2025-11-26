import { ProcessImageUseCase } from '../../application/use-cases/image/process-image.usecase.js';
import { UpdateImageVisibilityUseCase } from '../../application/use-cases/image/update-image-visibility.usecase.js';
import { ImageRepository } from '../../infrastructure/persistence/repositories/image.repository.js';
import { UserRepository } from '../../infrastructure/persistence/repositories/user.repository.js';

const imageRepository = new ImageRepository();
const userRepository = new UserRepository();
const processImageUseCase = new ProcessImageUseCase(imageRepository, userRepository);
const updateImageVisibilityUseCase = new UpdateImageVisibilityUseCase(
  imageRepository,
  userRepository
);

export const processImage = async (req, res, next) => {
  try {
    const { style } = req.body;
    const firebase_uid = req.user.firebase_uid;
    const imageBuffer = req.file.buffer;
    const fileSize = req.file.size;

    // Pass req.logger for correlation tracking
    const result = await processImageUseCase.execute(
      firebase_uid,
      imageBuffer,
      style,
      fileSize,
      req.logger
    );

    res.status(202).json({
      message: 'Image queued for processing',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const updateImageVisibility = async (req, res, next) => {
  try {
    const firebase_uid = req.user.firebase_uid;
    const { id } = req.params;
    const { visibility } = req.body;

    // Pass req.logger for correlation tracking
    const result = await updateImageVisibilityUseCase.execute(
      firebase_uid,
      id,
      visibility,
      req.logger
    );

    res.status(200).json({
      message: 'Image visibility updated',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
