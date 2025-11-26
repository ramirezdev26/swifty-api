import { config } from '../config/env.js';
import { logger } from '../logger/pino.config.js';

export class EventPublisher {
  constructor(rabbitmqConnection) {
    this.connection = rabbitmqConnection;
    this.exchange = config.rabbitmq.eventExchange || 'swifty.events';
    this.channel = null;
  }

  async init() {
    this.channel = await this.connection.getChannel();
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
    logger.info(
      {
        event: 'event-publisher.initialized',
        exchange: this.exchange,
      },
      'Event publisher exchange initialized'
    );
  }

  async publish(event) {
    try {
      if (!this.channel) {
        throw new Error('EventPublisher not initialized. Call init() first.');
      }

      const routingKey = this.getRoutingKey(event);
      const message = {
        type: event.type,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        data: event.data,
        userId: event.userId,
        timestamp: event.timestamp,
        correlationId: event.correlationId,
      };

      this.channel.publish(this.exchange, routingKey, Buffer.from(JSON.stringify(message)), {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
      });

      logger.info(
        {
          event: 'domain-event.published',
          eventType: event.type,
          routingKey,
          aggregateId: event.aggregateId,
          userId: event.userId,
        },
        `Published ${event.type}`
      );
    } catch (error) {
      logger.error(
        {
          event: 'domain-event.publish.failed',
          error: {
            message: error.message,
            stack: error.stack,
          },
          eventType: event.type,
        },
        'Failed to publish event'
      );
      throw error;
    }
  }

  getRoutingKey(event) {
    // UserRegisteredEvent -> user.registered
    // ImageUploadedEvent -> image.uploaded
    const match = event.type.match(/^(\w+?)(?=[A-Z])(.+?)Event$/);
    if (match) {
      const entity = match[1].toLowerCase();
      const action = match[2].toLowerCase();
      return `${entity}.${action}`;
    }
    return 'unknown';
  }

  getChannel() {
    return this.channel;
  }
}
