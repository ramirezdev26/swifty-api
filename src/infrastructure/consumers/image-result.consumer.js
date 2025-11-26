import rabbitmqService from '../services/rabbitmq.service.js';
import { ImageRepository } from '../persistence/repositories/image.repository.js';
import { emitImageCompleted, emitImageFailed } from '../services/socket.service.js';
import { logger } from '../logger/pino.config.js';
import { ImageProcessedEvent } from '../../domain/events/image-processed.event.js';
import { EventStoreRepository } from '../persistence/repositories/event-store.repository.js';
import { EventPublisher } from '../messaging/event-publisher.service.js';
import { ProcessingFailedEvent } from '../../domain/events/processing-failed.event.js';
class RabbitMQWrapper {
  constructor(rabbitmqService) {
    this.rabbitmqService = rabbitmqService;
  }

  async getChannel() {
    return this.rabbitmqService.channel;
  }
}

class ImageResultConsumer {
  constructor() {
    this.rabbitmqService = rabbitmqService;
    this.imageRepository = new ImageRepository();
    this.isConsuming = false;
    this.eventStoreRepository = new EventStoreRepository();
    this.eventPublisher = new EventPublisher(new RabbitMQWrapper(rabbitmqService));
  }

  async start() {
    try {
      logger.info('[ImageResultConsumer] Starting consumer...');

      await this.eventPublisher.init();
      const RESULT_EXCHANGE = 'image.results';
      const QUEUE_NAME = 'status_updates.api';

      const channel = this.rabbitmqService.getChannel();

      // Assert fanout exchange
      await channel.assertExchange(RESULT_EXCHANGE, 'fanout', { durable: true });

      // Assert queue for this consumer
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      // Bind queue to exchange (receives ALL messages from exchange)
      await channel.bindQueue(QUEUE_NAME, RESULT_EXCHANGE, '');

      await channel.prefetch(1);

      await channel.consume(QUEUE_NAME, async (message) => {
        await this.handleMessage(message);
      });

      this.isConsuming = true;
      logger.info('[ImageResultConsumer] Started successfully');
    } catch (error) {
      logger.error({ error: error.message }, '[ImageResultConsumer] Failed to start');
      throw error;
    }
  }

  async handleMessage(message) {
    if (!message) return;

    const channel = this.rabbitmqService.getChannel();

    try {
      const event = JSON.parse(message.content.toString());
      const { eventType, payload } = event;

      logger.info(
        {
          eventType,
          imageId: payload.imageId,
          userId: payload.userId,
        },
        '[ImageResultConsumer] Event consumed from status_updates'
      );

      if (eventType === 'ImageProcessed') {
        await this.handleImageProcessed(payload);
        channel.ack(message);
      } else if (eventType === 'ProcessingFailed') {
        await this.handleProcessingFailed(payload);
        channel.ack(message);
      } else {
        logger.warn({ eventType }, '[ImageResultConsumer] Unknown event type');
        channel.ack(message); // Acknowledge to avoid reprocessing
      }
    } catch (error) {
      logger.error(
        { error: error.message, stack: error.stack },
        '[ImageResultConsumer] Error processing message'
      );
      // Reject and requeue for retry
      channel.nack(message, false, true);
    }
  }

  async handleImageProcessed(payload) {
    const { imageId, processedUrl, processingTime, userId } = payload;

    try {
      // Update PostgreSQL
      const updatedImage = await this.imageRepository.update(imageId, {
        processed_url: processedUrl,
        processing_time: processingTime,
        status: 'processed',
        processed_at: new Date(),
      });

      logger.info(
        {
          imageId,
          status: 'processed',
          processingTime,
        },
        '[ImageResultConsumer] PostgreSQL updated successfully'
      );

      // Emit WebSocket notification
      emitImageCompleted(userId, {
        imageId: updatedImage.id,
        processedUrl: updatedImage.processed_url,
        style: updatedImage.style,
        processedAt: updatedImage.processed_at,
      });

      const event = new ImageProcessedEvent(
        payload.imageId,
        payload.userId,
        payload.processedUrl,
        payload.processingTime
      );
      // 5. Persistir evento en Event Store
      await this.eventStoreRepository.append(event);

      await this.eventPublisher.publish(event);

      logger.info(
        {
          imageId,
          userId,
        },
        '[ImageResultConsumer] WebSocket notification sent: image:completed'
      );
    } catch (error) {
      logger.error(
        { error: error.message, imageId },
        '[ImageResultConsumer] Failed to handle ImageProcessed'
      );
      throw error;
    }
  }

  async handleProcessingFailed(payload) {
    const { imageId, error, errorCode, userId } = payload;

    try {
      // Update PostgreSQL
      await this.imageRepository.update(imageId, {
        status: 'failed',
      });

      logger.info(
        {
          imageId,
          status: 'failed',
          errorCode,
        },
        '[ImageResultConsumer] PostgreSQL updated successfully'
      );

      // Emit WebSocket notification
      emitImageFailed(userId, {
        imageId,
        error: errorCode || 'PROCESSING_ERROR',
        message: error || 'Image processing failed',
      });

      const event = new ProcessingFailedEvent(payload.imageId, payload.userId, payload.error);
      // 5. Persistir evento en Event Store
      await this.eventStoreRepository.append(event);

      // 6. Publicar evento a RabbitMQ
      await this.eventPublisher.publish(event);

      logger.warn(
        {
          imageId,
          userId,
          errorCode,
        },
        '[ImageResultConsumer] WebSocket notification sent: image:failed'
      );
    } catch (error) {
      logger.error(
        { error: error.message, imageId },
        '[ImageResultConsumer] Failed to handle ProcessingFailed'
      );
      throw error;
    }
  }

  async stop() {
    this.isConsuming = false;
    logger.info('[ImageResultConsumer] Stopped');
  }
}

export default new ImageResultConsumer();
