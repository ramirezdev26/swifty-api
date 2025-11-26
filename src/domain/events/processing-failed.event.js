import { DomainEvent } from './base.event.js';

export class ProcessingFailedEvent extends DomainEvent {
  constructor(imageId, userId, error) {
    super('ProcessingFailedEvent', imageId, 'Image', { imageId, error, userId }, userId);
  }
}
