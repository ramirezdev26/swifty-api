import rabbitmqService from '../services/rabbitmq.service.js';
import { ImageRepository } from '../persistence/repositories/image.repository.js';

class ImageResultConsumer {
  constructor() {
    this.imageRepository = new ImageRepository();
    this.isConsuming = false;
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
      console.log(`Updated image ${payload.imageId} status to processed`);
    } else if (eventType === 'ProcessingError') {
      await this.imageRepository.update(payload.imageId, {
        status: 'failed',
      });
      console.log(`Updated image ${payload.imageId} status to failed`);
    }
  }

  async stop() {
    this.isConsuming = false;
  }
}

export default new ImageResultConsumer();
