import { EventStoreModel } from '../models/event-store.model.js';

export class EventStoreRepository {
  async append(event) {
    return await EventStoreModel.create({
      event_type: event.type,
      aggregate_id: event.aggregateId,
      aggregate_type: event.aggregateType,
      event_data: event.data,
      user_id: event.userId,
      correlation_id: event.correlationId,
      created_at: new Date(),
    });
  }

  async getEventsByAggregateId(aggregateId) {
    return await EventStoreModel.findAll({
      where: { aggregate_id: aggregateId },
      order: [['created_at', 'ASC']],
    });
  }

  async getEventsByType(eventType) {
    return await EventStoreModel.findAll({
      where: { event_type: eventType },
      order: [['created_at', 'DESC']],
    });
  }

  async getAllEvents(limit = 100) {
    return await EventStoreModel.findAll({
      order: [['created_at', 'DESC']],
      limit,
    });
  }
}
