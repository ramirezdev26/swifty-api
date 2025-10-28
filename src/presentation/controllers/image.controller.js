import { ProcessImageUseCase } from '../../application/use-cases/image/process-image.usecase.js';
import { GetProcessedImagesUseCase } from '../../application/use-cases/image/get-processed-images.usecase.js';
import { ImageRepository } from '../../infrastructure/persistence/repositories/image.repository.js';
import { UserRepository } from '../../infrastructure/persistence/repositories/user.repository.js';

const imageRepository = new ImageRepository();
const userRepository = new UserRepository();
const processImageUseCase = new ProcessImageUseCase(imageRepository, userRepository);
const getProcessedImagesUseCase = new GetProcessedImagesUseCase(imageRepository, userRepository);

export const processImage = async (req, res, next) => {
  try {
    const { style } = req.body;
    const firebase_uid = req.user.firebase_uid;
    const imageBuffer = req.file.buffer;
    const fileSize = req.file.size;

    const result = await processImageUseCase.execute(firebase_uid, imageBuffer, style, fileSize);

    res.status(200).json({
      message: 'Data successfully retrieved',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getProcessedImages = async (req, res, next) => {
  try {
    const { page = 1, limit = 12 } = req.query;

    const result = await getProcessedImagesUseCase.execute(page, limit);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
