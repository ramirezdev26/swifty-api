import amqp from 'amqplib';
import { config } from '../config/env.js';
import { setupRabbitMQInfrastructure } from './rabbitmq-setup.service.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.maxRetries = 3;
    this.retryDelay = 5000;
  }

  async connect() {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        this.connection = await amqp.connect(config.rabbitmq.url);
        this.channel = await this.connection.createChannel();

        // Setup infrastructure (exchanges, queues, bindings)
        await setupRabbitMQInfrastructure(this.channel);

        this.connection.on('error', (err) => {
          logger.error({ err }, '[RabbitMQ] Connection error');
        });

        this.connection.on('close', () => {
          logger.warn('[RabbitMQ] Connection closed');
        });

        logger.info('[RabbitMQ] Connected successfully');
        return;
      } catch (error) {
        retries++;
        logger.error(
          { error: error.message, attempt: retries, maxRetries: this.maxRetries },
          '[RabbitMQ] Connection attempt failed'
        );

        if (retries < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        } else {
          throw new Error(`Failed to connect to RabbitMQ after ${this.maxRetries} attempts`);
        }
      }
    }
  }

  /**
   * Publish ImageUploadEvent to partitioned queue
   * @param {Object} event - ImageUploadEvent
   */
  async publishImageUploadEvent(event) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      // Determine partition based on imageId for load balancing
      const partition = this._getPartition(event.payload.imageId);
      const routingKey = `image.uploaded.partition.${partition}`;

      await this.channel.publish(
        config.rabbitmq.exchange,
        routingKey,
        Buffer.from(JSON.stringify(event)),
        {
          persistent: true,
          headers: {
            'x-partition': partition,
            'x-retry-count': 0,
          },
        }
      );

      logger.info(
        {
          eventId: event.eventId,
          imageId: event.payload.imageId,
          partition,
          routingKey,
        },
        '[RabbitMQ] Published ImageUploadEvent'
      );
    } catch (error) {
      logger.error({ error: error.message, event }, '[RabbitMQ] Failed to publish event');
      throw error;
    }
  }

  /**
   * Publish event to direct queue
   * @param {string} queueName - Queue name
   * @param {Object} message - Message to publish
   */
  async publishToQueue(queueName, message) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      await this.channel.assertQueue(queueName, { durable: true });
      this.channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
        persistent: true,
      });

      logger.debug({ queueName, messageType: message.eventType }, '[RabbitMQ] Published to queue');
    } catch (error) {
      logger.error({ error: error.message, queueName }, '[RabbitMQ] Failed to publish to queue');
      throw error;
    }
  }

  /**
   * Consume messages from queue
   * @param {string} queueName - Queue name
   * @param {Function} handler - Message handler function
   */
  async consumeFromQueue(queueName, handler) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.prefetch(1);

      await this.channel.consume(queueName, handler, { noAck: false });
      logger.info({ queueName }, '[RabbitMQ] Started consuming from queue');
    } catch (error) {
      logger.error({ error: error.message, queueName }, '[RabbitMQ] Failed to consume from queue');
      throw error;
    }
  }

  _getPartition(imageId) {
    // Simple hash-based partitioning
    let hash = 0;
    for (let i = 0; i < imageId.length; i++) {
      hash = (hash << 5) - hash + imageId.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % config.rabbitmq.partitions;
  }

  getChannel() {
    return this.channel;
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('[RabbitMQ] Connection closed gracefully');
    } catch (error) {
      logger.error({ error: error.message }, '[RabbitMQ] Error closing connection');
    }
  }
}

export default new RabbitMQService();
