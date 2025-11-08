import { DomainEvent } from './base.event.js';

export class ImageUploadedEvent extends DomainEvent {
  constructor(imageId, userId, originalUrl, style, size, userEmail) {
    super(
      'ImageUploadedEvent',
      imageId,
      'Image',
      { imageId, userId, originalUrl, style, size, userEmail },
      userId
    );
  }
}
