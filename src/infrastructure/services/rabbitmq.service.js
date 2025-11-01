import amqp from 'amqplib';
import crypto from 'crypto';

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

  async connect() {
    const rabbitmqUrl = process.env.RABBITMQ_URL;
    if (!rabbitmqUrl) {
      throw new Error('RABBITMQ_URL is not defined in environment variables');
    }

    for (let attempt = 1; attempt <= this.maxReconnectAttempts; attempt++) {
      try {
        this.connection = await amqp.connect(rabbitmqUrl);
        this.channel = await this.connection.createChannel();

        await this.channel.assertQueue('image_processing', { durable: true });
        await this.channel.assertQueue('status_updates', { durable: true });

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
