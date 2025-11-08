import crypto from 'crypto';

export class DomainEvent {
  constructor(type, aggregateId, aggregateType, data, userId = null) {
    this.type = type;
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.data = data;
    this.userId = userId;
    this.timestamp = new Date().toISOString();
    this.correlationId = this.generateCorrelationId();
  }

  generateCorrelationId() {
    return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
}
