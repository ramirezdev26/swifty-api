export class ImageUploadEvent {
  constructor({ eventId, timestamp, payload }) {
    this.eventType = 'ImageUploadEvent';
    this.eventId = eventId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = timestamp || new Date().toISOString();
    this.version = '1.0';
    this.payload = payload;
  }

  static create(data) {
    return new ImageUploadEvent({
      payload: {
        imageId: data.imageId,
        userId: data.userId,
        originalImageUrl: data.originalImageUrl,
        style: data.style,
      },
    });
  }

  toJSON() {
    return {
      eventType: this.eventType,
      eventId: this.eventId,
      timestamp: this.timestamp,
      version: this.version,
      payload: this.payload,
    };
  }
}
