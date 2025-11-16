import rabbitmqService from '../services/rabbitmq.service.js';
import { ImageProcessedEvent } from '../../domain/events/image-processed.event.js';
import { ProcessingFailedEvent } from '../../domain/events/processing-failed.event.js';

export class ImageResultConsumer {
  constructor(imageRepository, eventStoreRepository, eventPublisher) {
    this.imageRepository = imageRepository;
    this.isConsuming = false;
    this.eventStoreRepository = eventStoreRepository;
    this.eventPublisher = eventPublisher;
  }

  async start() {
    if (!rabbitmqService.isConnected) {
      throw new Error('RabbitMQ is not connected');
    }

    const channel = rabbitmqService.channel;
    await channel.prefetch(1);

    channel.consume(
      'status_updates',
      async (msg) => {
        if (msg !== null) {
          try {
            const event = JSON.parse(msg.content.toString());
            await this.handleEvent(event);
            channel.ack(msg);
          } catch (error) {
            console.error('Error processing status update:', error);
            channel.nack(msg, false, false);
          }
        }
      },
      { noAck: false }
    );

    this.isConsuming = true;
  }

  async handleEvent(event) {
    const { eventType, payload } = event;

    if (eventType === 'ImageProcessed') {
      await this.imageRepository.update(payload.imageId, {
        status: 'processed',
        processed_url: payload.processedUrl,
        processing_time: payload.processingTime,
        processed_at: new Date(),
      });
      const event = new ImageProcessedEvent(
        payload.imageId,
        payload.userId,
        payload.processedUrl,
        payload.processingTime
      );
      // 5. Persistir evento en Event Store
      await this.eventStoreRepository.append(event);

      // 6. Publicar evento a RabbitMQ
      await this.eventPublisher.publish(event);
      console.log(`Updated image ${payload.imageId} status to processed`);
    } else if (eventType === 'ProcessingError') {
      await this.imageRepository.update(payload.imageId, {
        status: 'failed',
      });
      const event = new ProcessingFailedEvent(payload.imageId, payload.userId, payload.error);
      // 5. Persistir evento en Event Store
      await this.eventStoreRepository.append(event);

      // 6. Publicar evento a RabbitMQ
      await this.eventPublisher.publish(event);
      console.log(`Updated image ${payload.imageId} status to failed`);
    }
  }

  async stop() {
    this.isConsuming = false;
  }
}
