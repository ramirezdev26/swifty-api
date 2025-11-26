import { Image } from '../../../domain/entities/image.entity.js';
import { ImageUploadEvent } from '../../../domain/events/image-upload.event.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import cloudinaryService from '../../../infrastructure/services/cloudinary.service.js';
import rabbitmqService from '../../../infrastructure/services/rabbitmq.service.js';
import { emitImageProcessing } from '../../../infrastructure/services/socket.service.js';
import { DomainEventRepository } from '../../../infrastructure/persistence/repositories/domain-event.repository.js';
import pino from 'pino';
import { ImageUploadedEvent } from '../../../domain/events/image-uploaded.event.js';
import { EventPublisher } from '../../../infrastructure/messaging/event-publisher.service.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
class RabbitMQWrapper {
  constructor(rabbitmqService) {
    this.rabbitmqService = rabbitmqService;
  }

  async getChannel() {
    return this.rabbitmqService.channel;
  }
}
export class ProcessImageUseCase {
  constructor(imageRepository, userRepository) {
    this.imageRepository = imageRepository;
    this.userRepository = userRepository;
    this.eventPublisher = new EventPublisher(new RabbitMQWrapper(rabbitmqService));
  }

  async execute(firebase_uid, imageBuffer, style, fileSize) {
    try {
      await this.eventPublisher.init();
      // Find user
      const user = await this.userRepository.findByFirebaseUid(firebase_uid);
      if (!user) {
        throw new NotFoundError('User');
      }

      logger.info(
        {
          userId: user.uid,
          style,
          fileSize,
        },
        '[ProcessImageUseCase] Upload request received'
      );

      // Upload original image to Cloudinary
      const cloudinaryResult = await cloudinaryService.uploadImage(imageBuffer, {
        folder: 'swifty-original-images',
      });

      logger.info(
        {
          userId: user.uid,
          cloudinaryId: cloudinaryResult.public_id,
          url: cloudinaryResult.secure_url,
        },
        '[ProcessImageUseCase] Original image uploaded to Cloudinary'
      );

      // Create image entity with processing status
      const imageEntity = new Image({
        user_id: user.uid,
        cloudinary_id: cloudinaryResult.public_id,
        original_url: cloudinaryResult.secure_url,
        size: fileSize,
        style: style,
        status: 'processing', // Image is now in processing queue
      });

      const savedImage = await this.imageRepository.create(imageEntity);

      logger.info(
        {
          imageId: savedImage.id,
          userId: user.uid,
          status: 'processing',
        },
        '[ProcessImageUseCase] Image record created in PostgreSQL'
      );

      // Create and publish ImageUploadEvent
      const uploadEvent = ImageUploadEvent.create({
        imageId: savedImage.id,
        userId: user.uid,
        originalImageUrl: cloudinaryResult.secure_url,
        style: style,
      });

      // Store event in PostgreSQL event store
      try {
        const eventRepo = new DomainEventRepository();
        await eventRepo.store({
          eventId: uploadEvent.eventId,
          eventType: uploadEvent.eventType,
          aggregateId: savedImage.id,
          aggregateType: 'Image',
          payload: uploadEvent.payload,
          metadata: {
            userId: user.uid,
            style: style,
          },
          version: uploadEvent.version,
          timestamp: uploadEvent.timestamp,
        });

        const event = new ImageUploadedEvent(
          savedImage.id,
          user.uid,
          imageEntity.original_url,
          imageEntity.style,
          340578,
          user.email,
          user.full_name
        );

        await this.eventPublisher.publish(event);

        logger.info(
          {
            eventId: uploadEvent.eventId,
            imageId: savedImage.id,
          },
          '[ProcessImageUseCase] Event stored in PostgreSQL event store'
        );
      } catch (error) {
        logger.error(
          { error: error.message },
          '[ProcessImageUseCase] Failed to store event in PostgreSQL (non-blocking)'
        );
        // Don't throw - event publishing to RabbitMQ should continue
      }

      // Publish to RabbitMQ for processing
      await rabbitmqService.publishImageUploadEvent(uploadEvent.toJSON());

      logger.info(
        {
          eventId: uploadEvent.eventId,
          imageId: savedImage.id,
        },
        '[ProcessImageUseCase] ImageUploadEvent published to RabbitMQ'
      );

      // Emit WebSocket notification for initial processing state
      emitImageProcessing(user.uid, {
        imageId: savedImage.id,
        message: 'Image uploaded, queued for processing...',
      });

      logger.info(
        {
          imageId: savedImage.id,
          userId: user.uid,
        },
        '[ProcessImageUseCase] WebSocket notification sent: image:processing'
      );

      // Return immediately without waiting for processing
      return {
        imageId: savedImage.id,
        status: 'processing',
        message: 'Image queued for processing',
        originalUrl: savedImage.original_url,
        style: savedImage.style,
      };
    } catch (error) {
      logger.error(
        {
          error: error.message,
          stack: error.stack,
          firebase_uid,
        },
        '[ProcessImageUseCase] Error in process image use case'
      );
      throw error;
    }
  }
}
