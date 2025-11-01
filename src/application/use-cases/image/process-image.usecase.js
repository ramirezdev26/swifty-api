import { Image } from '../../../domain/entities/image.entity.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import cloudinaryService from '../../../infrastructure/services/cloudinary.service.js';
import rabbitmqService from '../../../infrastructure/services/rabbitmq.service.js';

export class ProcessImageUseCase {
  constructor(imageRepository, userRepository) {
    this.imageRepository = imageRepository;
    this.userRepository = userRepository;
  }

  async execute(firebase_uid, imageBuffer, style, fileSize) {
    try {
      const user = await this.userRepository.findByFirebaseUid(firebase_uid);
      if (!user) {
        throw new NotFoundError('User');
      }

      // 1. Upload ORIGINAL image to Cloudinary
      const originalCloudinaryResult = await cloudinaryService.uploadImage(imageBuffer, {
        public_id: `original_${Date.now()}`,
        folder: 'swifty-original-images',
      });

      // 2. Create image record with status='processing'
      const imageEntity = new Image({
        user_id: user.uid,
        size: fileSize,
        style: style,
        status: 'processing',
        original_url: originalCloudinaryResult.secure_url,
        cloudinary_id: originalCloudinaryResult.public_id,
      });

      const savedImage = await this.imageRepository.create(imageEntity);

      // 3. Publish ImageUploaded event to RabbitMQ
      await rabbitmqService.publishImageUploaded({
        imageId: savedImage.id,
        userId: user.uid,
        originalImageUrl: originalCloudinaryResult.secure_url,
        style: style,
      });

      // 4. Return imageId immediately (don't wait for processing)
      return {
        imageId: savedImage.id,
        status: 'processing',
        message: 'Image is being processed',
      };
    } catch (error) {
      console.error('Error in ProcessImageUseCase:', error);
      throw error;
    }
  }
}
