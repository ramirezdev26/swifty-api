import { DomainEvent } from './base.event.js';

export class ImageUploadedEvent extends DomainEvent {
  constructor(imageId, userId, originalUrl, style, size, userEmail, userName) {
    super(
      'ImageUploadedEvent',
      imageId,
      'Image',
      { imageId, userId, originalUrl, style, size, userEmail, userName },
      userId
    );
  }
}
