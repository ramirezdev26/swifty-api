import { DomainEvent } from './base.event.js';

export class ImageProcessedEvent extends DomainEvent {
  constructor(imageId, userId, processed_url, processing_time) {
    super(
      'ImageProcessedEvent',
      imageId,
      'Image',
      { imageId, processed_url, processing_time, userId },
      userId
    );
  }
}
