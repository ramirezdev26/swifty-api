import amqp from 'amqplib';
import crypto from 'crypto';
import { config } from '../config/env.js';
import { setupRabbitMQInfrastructure } from './rabbitmq-setup.service.js';

class RabbitMQService {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 5000;
  }

  generateEventId() {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  getPartitionKey(imageId) {
    const hash = crypto.createHash('md5').update(imageId).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    return hashInt % config.rabbitmq.partitions;
  }

  async connect() {
    const { url } = config.rabbitmq;
    if (!url) {
      throw new Error('RABBITMQ_URL is not defined in environment variables');
    }

    for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
      try {
        this.connection = await amqp.connect(url);
        this.channel = await this.connection.createChannel();

        // Keep backward compatibility - existing queues
        await this.channel.assertQueue('image_processing', { durable: true });
        await this.channel.assertQueue('status_updates', { durable: true });

        // Setup new partitioned infrastructure
        await setupRabbitMQInfrastructure(this.channel);

        this.isConnected = true;
        this.reconnectAttempts = 0;
        console.log('Connected to RabbitMQ');

        this.connection.on('error', (err) => {
          console.error('RabbitMQ connection error:', err);
          this.isConnected = false;
        });

        this.connection.on('close', () => {
          this.isConnected = false;
          console.log('RabbitMQ connection closed');
        });

        return;
      } catch (error) {
        console.error(`RabbitMQ connection attempt ${attempt} failed:`, error.message);
        this.reconnectAttempts = attempt;

        if (attempt < this.maxReconnectAttempts) {
          await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));
        } else {
          throw new Error('Failed to connect to RabbitMQ after maximum attempts');
        }
      }
    }
  }

  async publishImageUploaded(payload) {
    if (!this.isConnected || !this.channel) {
      throw new Error('RabbitMQ is not connected');
    }

    const partition = this.getPartitionKey(payload.imageId);
    const routingKey = `image.uploaded.partition.${partition}`;
    const { exchange } = config.rabbitmq;

    // Log partition assignment for verification
    console.log(`Publishing to partition ${partition} for imageId: ${payload.imageId}`);

    const event = {
      eventType: 'ImageUploaded',
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      payload: {
        imageId: payload.imageId,
        userId: payload.userId,
        originalImageUrl: payload.originalImageUrl,
        style: payload.style,
      },
    };

    try {
      // Publish to partitioned exchange
      this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(event)), {
        persistent: true,
        headers: {
          'x-partition': partition,
          'x-retry-count': 0,
        },
      });

      // Keep backward compatibility - also publish to old queue
      this.channel.sendToQueue('image_processing', Buffer.from(JSON.stringify(event)), {
        persistent: true,
      });
    } catch (error) {
      console.error('Error publishing ImageUploaded event:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      console.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}

export default new RabbitMQService();
