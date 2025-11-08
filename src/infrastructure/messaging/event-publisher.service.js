import { config } from '../config/env.js';

export class EventPublisher {
  constructor(rabbitmqConnection) {
    this.connection = rabbitmqConnection;
    this.exchange = config.rabbitmq.eventExchange || 'swifty.events';
    this.channel = null;
  }

  async init() {
    this.channel = await this.connection.getChannel();
    await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
    console.log(`[EventPublisher] Exchange '${this.exchange}' initialized`);
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

      console.log(`[EventPublisher] Published ${event.type} to ${routingKey}`);
    } catch (error) {
      console.error('[EventPublisher] Error publishing event:', error);
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
