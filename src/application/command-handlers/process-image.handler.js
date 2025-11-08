import { ImageUploadedEvent } from '../../domain/events/image-uploaded.event.js';
import { Image } from '../../domain/entities/image.entity.js';
import { NotFoundError } from '../../shared/errors/index.js';

export class ProcessImageHandler {
  constructor(
    userRepository,
    imageRepository,
    eventStoreRepository,
    eventPublisher,
    cloudinaryService
  ) {
    this.userRepository = userRepository;
    this.imageRepository = imageRepository;
    this.eventStoreRepository = eventStoreRepository;
    this.eventPublisher = eventPublisher;
    this.cloudinaryService = cloudinaryService;
  }

  async execute(command) {
    try {
      // 1. Validar usuario
      const user = await this.userRepository.findByFirebaseUid(command.firebaseUid);
      if (!user) {
        throw new NotFoundError('User');
      }

      // 2. Upload a Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImage(command.imageBuffer, {
        public_id: `original_${Date.now()}`,
        folder: 'swifty-original-images',
      });

      // 3. Crear entidad en PostgreSQL
      const imageEntity = new Image({
        user_id: user.uid,
        cloudinary_id: uploadResult.public_id,
        original_url: uploadResult.secure_url,
        size: command.fileSize,
        style: command.style,
        status: 'processing',
      });

      const savedImage = await this.imageRepository.create(imageEntity);

      // 4. Crear evento de dominio
      const event = new ImageUploadedEvent(
        savedImage.id,
        user.uid,
        uploadResult.secure_url,
        command.style,
        command.fileSize,
        user.email
      );

      // 5. Persistir evento en Event Store
      await this.eventStoreRepository.append(event);

      // 6. Publicar evento a RabbitMQ
      await this.eventPublisher.publish(event);

      return {
        imageId: savedImage.id,
        status: 'processing',
        message: 'Image is being processed',
      };
    } catch (error) {
      console.error('[ProcessImageHandler] Error:', error);
      throw error;
    }
  }
}
