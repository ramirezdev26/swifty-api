import { DomainEventModel } from '../models/domain-event.model.js';
import { Op } from 'sequelize';

export class DomainEventRepository {
  async store(eventData) {
    return await DomainEventModel.create({
      event_id: eventData.eventId,
      event_type: eventData.eventType,
      aggregate_id: eventData.aggregateId,
      aggregate_type: eventData.aggregateType,
      payload: eventData.payload,
      metadata: eventData.metadata || {},
      version: eventData.version || '1.0',
      occurred_at: eventData.timestamp ? new Date(eventData.timestamp) : new Date(),
    });
  }

  async getByAggregateId(aggregateId) {
    return await DomainEventModel.findAll({
      where: { aggregate_id: aggregateId },
      order: [['occurred_at', 'ASC']],
    });
  }

  async getByEventType(eventType, limit = 100) {
    return await DomainEventModel.findAll({
      where: { event_type: eventType },
      order: [['occurred_at', 'DESC']],
      limit,
    });
  }

  async getByTimeRange(startDate, endDate, limit = 1000) {
    return await DomainEventModel.findAll({
      where: {
        occurred_at: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      order: [['occurred_at', 'ASC']],
      limit,
    });
  }

  async getRecent(limit = 100) {
    return await DomainEventModel.findAll({
      order: [['occurred_at', 'DESC']],
      limit,
    });
  }
}
