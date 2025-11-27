import { Image } from '../../../domain/entities/image.entity.js';
import { ImageUploadEvent } from '../../../domain/events/image-upload.event.js';
import { NotFoundError } from '../../../shared/errors/index.js';
import cloudinaryService from '../../../infrastructure/services/cloudinary.service.js';
import rabbitmqService from '../../../infrastructure/services/rabbitmq.service.js';
import { emitImageProcessing } from '../../../infrastructure/services/socket.service.js';
import { DomainEventRepository } from '../../../infrastructure/persistence/repositories/domain-event.repository.js';
import { logger } from '../../../infrastructure/logger/pino.config.js';
import { ImageUploadedEvent } from '../../../domain/events/image-uploaded.event.js';
import { EventPublisher } from '../../../infrastructure/messaging/event-publisher.service.js';
import {
  imageUploadsTotal,
  imageUploadSize,
  imageProcessingDuration,
} from '../../../infrastructure/metrics/business.metrics.js';

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

  /**
   * Process image upload - async flow with event-driven architecture
   * @param {string} firebase_uid - User Firebase UID
   * @param {Buffer} imageBuffer - Image file buffer
   * @param {string} style - Processing style
   * @param {number} fileSize - File size in bytes
   * @param {Object} requestLogger - Pino logger with trace-id context (optional)
   * @returns {Promise<Object>} Image processing result
   */
  async execute(firebase_uid, imageBuffer, style, fileSize, requestLogger = null) {
    // Use provided logger with trace-id or fallback to global logger
    const log = requestLogger || logger;
    const processingStartTime = Date.now();

    try {
      await this.eventPublisher.init();

      // Find user
      const user = await this.userRepository.findByFirebaseUid(firebase_uid);
      if (!user) {
        log.warn(
          {
            event: 'image.upload.failed',
            reason: 'user_not_found',
            firebase_uid,
          },
          'User not found'
        );
        throw new NotFoundError('User');
      }

      log.info(
        {
          event: 'image.upload.started',
          userId: user.uid,
          userEmail: user.email,
          style,
          fileSize,
        },
        'Image upload initiated'
      );

      // Upload original image to Cloudinary
      const cloudinaryResult = await cloudinaryService.uploadImage(imageBuffer, {
        folder: 'swifty-original-images',
      });

      log.info(
        {
          event: 'image.cloudinary.uploaded',
          userId: user.uid,
          cloudinaryId: cloudinaryResult.public_id,
          originalUrl: cloudinaryResult.secure_url,
          fileSize,
        },
        'Original image uploaded to Cloudinary'
      );

      // Create image entity with processing status
      const imageEntity = new Image({
        user_id: user.uid,
        cloudinary_id: cloudinaryResult.public_id,
        original_url: cloudinaryResult.secure_url,
        size: fileSize,
        style: style,
        status: 'processing',
      });

      const savedImage = await this.imageRepository.create(imageEntity);

      log.info(
        {
          event: 'image.record.created',
          imageId: savedImage.id,
          userId: user.uid,
          status: 'processing',
          cloudinaryId: cloudinaryResult.public_id,
        },
        'Image record created in database'
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
          fileSize,
          user.email,
          user.full_name
        );

        await this.eventPublisher.publish(event);

        log.info(
          {
            event: 'event.stored',
            eventId: uploadEvent.eventId,
            eventType: uploadEvent.eventType,
            imageId: savedImage.id,
          },
          'Event stored in event store'
        );
      } catch (error) {
        log.warn(
          {
            event: 'event.store.failed',
            error: {
              message: error.message,
              stack: error.stack,
            },
            imageId: savedImage.id,
          },
          'Failed to store event (non-blocking)'
        );
        // Don't throw - event publishing to RabbitMQ should continue
      }

      // Publish to RabbitMQ for processing
      await rabbitmqService.publishImageUploadEvent(uploadEvent.toJSON());

      log.info(
        {
          event: 'event.published',
          eventId: uploadEvent.eventId,
          eventType: uploadEvent.eventType,
          imageId: savedImage.id,
          userId: user.uid,
        },
        'Event published to RabbitMQ'
      );

      // Emit WebSocket notification for initial processing state
      emitImageProcessing(user.uid, {
        imageId: savedImage.id,
        message: 'Image uploaded, queued for processing...',
      });

      log.info(
        {
          event: 'websocket.notification.sent',
          imageId: savedImage.id,
          userId: user.uid,
          notificationType: 'image:processing',
        },
        'WebSocket notification sent'
      );

      // Registrar métricas de negocio exitosas
      imageUploadSize.observe({ style }, fileSize);
      imageUploadsTotal.inc({ style, status: 'success' });
      const processingDuration = (Date.now() - processingStartTime) / 1000;
      imageProcessingDuration.observe({ style }, processingDuration);

      log.info(
        {
          event: 'image.upload.completed',
          imageId: savedImage.id,
          userId: user.uid,
          status: 'processing',
          style,
          duration: processingDuration * 1000,
        },
        'Image upload completed successfully'
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
      // Registrar métricas de negocio fallidas
      imageUploadsTotal.inc({ style, status: 'failed' });
      log.error(
        {
          event: 'image.upload.failed',
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          firebase_uid,
          style,
          fileSize,
        },
        'Image upload failed'
      );
      throw error;
    }
  }
}
