import { NotFoundError, ForbiddenError, AppError } from '../../../shared/errors/index.js';

export class UpdateImageVisibilityUseCase {
  constructor(imageRepository, userRepository) {
    this.imageRepository = imageRepository;
    this.userRepository = userRepository;
  }

  async execute(firebase_uid, imageId, visibility) {
    try {
      const user = await this.userRepository.findByFirebaseUid(firebase_uid);
      if (!user) {
        throw new NotFoundError('User');
      }

      const image = await this.imageRepository.findById(imageId);
      if (!image) {
        throw new NotFoundError('Image');
      }

      if (image.user_id !== user.uid) {
        throw new ForbiddenError('Forbidden: You do not own this image');
      }

      const updated = await this.imageRepository.update(imageId, { visibility });

      return {
        id: updated.id,
        visibility: updated.visibility,
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof AppError) {
        throw error;
      }
      throw new Error(`Failed to update image visibility: ${error.message}`);
    }
  }
}
