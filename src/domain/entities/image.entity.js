import { ValidationError } from '../../shared/errors/index.js';

export class Image {
  constructor({
    id = null,
    user_id,
    cloudinary_id = null,
    original_url = null,
    size,
    style,
    status = 'processing',
    visibility = 'public',
    processed_url = null,
    processing_time = null,
    processed_at = null,
    created_at = null,
    updated_at = null,
  }) {
    this._id = id;
    this._user_id = user_id;
    this._cloudinary_id = cloudinary_id;
    this._original_url = original_url;
    this._size = size;
    this._style = this.validateStyle(style);
    this._status = this.validateStatus(status);
    this._visibility = this.validateVisibility(visibility);
    this._processed_url = processed_url;
    this._processing_time = processing_time;
    this._processed_at = processed_at;
    this._created_at = created_at;
    this._updated_at = updated_at;
  }

  validateStyle(style) {
    const validStyles = ['oil-painting', 'pixel-art', 'cartoon', 'realism', 'anime'];
    if (!validStyles.includes(style)) {
      throw new ValidationError(`Invalid style. Must be one of: ${validStyles.join(', ')}`);
    }
    return style;
  }

  validateStatus(status) {
    const validStatuses = ['processing', 'processed', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    return status;
  }

  validateVisibility(visibility) {
    const valid = ['public', 'private'];
    if (!valid.includes(visibility)) {
      throw new ValidationError(`Invalid visibility. Must be one of: ${valid.join(', ')}`);
    }
    return visibility;
  }

  get id() {
    return this._id;
  }

  get user_id() {
    return this._user_id;
  }

  get cloudinary_id() {
    return this._cloudinary_id;
  }

  get original_url() {
    return this._original_url;
  }

  get size() {
    return this._size;
  }

  get style() {
    return this._style;
  }

  get status() {
    return this._status;
  }

  get visibility() {
    return this._visibility;
  }

  get processed_url() {
    return this._processed_url;
  }

  get processing_time() {
    return this._processing_time;
  }

  get processed_at() {
    return this._processed_at;
  }

  get created_at() {
    return this._created_at;
  }

  get updated_at() {
    return this._updated_at;
  }

  markAsProcessed(processed_url, cloudinary_id, processing_time) {
    this._processed_url = processed_url;
    this._cloudinary_id = cloudinary_id;
    this._processing_time = processing_time;
    this._status = 'processed';
    this._processed_at = new Date();
  }

  markAsFailed() {
    this._status = 'failed';
  }
}
